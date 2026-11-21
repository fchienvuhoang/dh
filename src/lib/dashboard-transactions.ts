import type { Prisma } from "@prisma/client";
import type { BankScope } from "@/lib/bank-scope";
import { activeBankTransactionWhere } from "@/lib/bank-ledger";
import type { TransactionSummary } from "@/lib/dashboard";
import { getPrisma, withDatabaseReadRetry } from "@/lib/prisma";
import { normalizeTransferText } from "@/lib/text";

export type TransactionPage = {
  transactions: TransactionSummary[];
  total: number;
  page: number;
  pageSize: number;
  shareCounts: { unshared: number; shared: number; all: number };
};
export type TransactionQuery = { bank: BankScope; campaign: string; q: string; share: "all" | "shared" | "unshared"; page: number; pageSize: number; kind: "all" | "debit" };
const select = {
  id: true, transactionDate: true, createdAt: true, statementRow: true,
  description: true, detail: true, debitAmount: true, creditAmount: true,
  outflowType: true, balanceAfter: true, matchedKeyword: true, classificationStatus: true,
  shareBatch: { select: { id: true, sentAt: true } },
  campaign: { select: { id: true, code: true, name: true } },
  allocations: { include: { campaign: { select: { id: true, code: true, name: true } } }, orderBy: { createdAt: "asc" } },
  refundLinks: { include: { originalTransaction: { select: { id: true, transactionDate: true, description: true, creditAmount: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.BankTransactionSelect;

export function transactionFilter(base: Prisma.BankTransactionWhereInput, query: TransactionQuery, matchingCampaignIds: string[] = []): Prisma.BankTransactionWhereInput {
  const filters: Prisma.BankTransactionWhereInput[] = [base];
  if (query.kind === "debit") filters.push({ debitAmount: { gt: 0 } });
  if (query.campaign === "unmatched") filters.push({ campaignId: null, allocations: { none: {} } });
  else if (query.campaign !== "all") filters.push({ OR: [{ campaignId: query.campaign }, { allocations: { some: { campaignId: query.campaign } } }] });
  if (query.q.trim()) filters.push({ OR: [
    ...(matchingCampaignIds.length ? [{ campaignId: { in: matchingCampaignIds } }, { allocations: { some: { campaignId: { in: matchingCampaignIds } } } }] : []),
    { normalizedDescription: { contains: normalizeTransferText(query.q) } },
    { detail: { contains: query.q.trim(), mode: "insensitive" } },
    { campaign: { name: { contains: query.q.trim(), mode: "insensitive" } } },
    { allocations: { some: { campaign: { name: { contains: query.q.trim(), mode: "insensitive" } } } } },
  ] });
  return { AND: filters };
}

export async function getTransactionPage(query: TransactionQuery): Promise<TransactionPage> {
  const prisma = getPrisma();
  const [bankWhere, campaigns] = await Promise.all([
    activeBankTransactionWhere(query.bank),
    query.q.trim() ? prisma.campaign.findMany({ where: { bankName: query.bank }, select: { id: true, name: true, code: true } }) : Promise.resolve([]),
  ]);
  const normalizedQuery = normalizeTransferText(query.q);
  const matchingCampaignIds = campaigns.filter(campaign => normalizeTransferText(`${campaign.code} ${campaign.name}`).includes(normalizedQuery)).map(campaign => campaign.id);
  const base = transactionFilter(bankWhere, query, matchingCampaignIds);
  const where = query.share === "all" ? base : { AND: [base, { shareBatchId: query.share === "shared" ? { not: null } : null }] };
  const [total, all, shared] = await withDatabaseReadRetry(() => Promise.all([
    prisma.bankTransaction.count({ where }),
    prisma.bankTransaction.count({ where: base }),
    prisma.bankTransaction.count({ where: { AND: [base, { shareBatchId: { not: null } }] } }),
  ]));
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await withDatabaseReadRetry(() => prisma.bankTransaction.findMany({ where, select,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }, { statementRow: "desc" }, { id: "desc" }],
    skip: (page - 1) * query.pageSize, take: query.pageSize,
  }));
  return { total, page, pageSize: query.pageSize, shareCounts: { all, shared, unshared: all - shared }, transactions: rows.map(row => ({
    ...row, transactionDate: row.transactionDate.toISOString(), createdAt: row.createdAt.toISOString(),
    shareBatch: row.shareBatch ? { id: row.shareBatch.id, sentAt: row.shareBatch.sentAt.toISOString() } : null,
    creditAmount: Number(row.creditAmount), debitAmount: Number(row.debitAmount), balanceAfter: row.balanceAfter == null ? null : Number(row.balanceAfter),
    allocations: row.allocations.map(item => ({ id: item.id, amount: Number(item.amount), campaign: item.campaign })),
    refundLinks: row.refundLinks.map(item => ({ id: item.id, amount: Number(item.amount), originalTransaction: { ...item.originalTransaction, transactionDate: item.originalTransaction.transactionDate.toISOString(), creditAmount: Number(item.originalTransaction.creditAmount) } })),
  })).map(({id,transactionDate,createdAt,statementRow,description,detail,debitAmount,creditAmount,outflowType,balanceAfter,matchedKeyword,classificationStatus,campaign,allocations,refundLinks,shareBatch})=>({id,transactionDate,createdAt,statementRow,description,detail,debitAmount,creditAmount,outflowType,balanceAfter,matchedKeyword,classificationStatus,campaign,allocations,refundLinks,shareBatch})) };
}
