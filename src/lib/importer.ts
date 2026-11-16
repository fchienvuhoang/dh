import { trackedStatementRows, balanceFromOpening } from "@/lib/ledger-math";
import { activeBankTransactionWhere, getBankLedger } from "@/lib/bank-ledger";
import { bankScope, type BankScope } from "@/lib/bank-scope";
import type { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError, type InputJsonObject } from "@prisma/client/runtime/client";
import { classifyDescription, type KeywordRule } from "@/lib/classifier";
import { newStatementRows } from "@/lib/statement-deduplication";
import { toPrismaDecimal } from "@/lib/money";
import { getPrisma, withDatabaseReadRetry } from "@/lib/prisma";
import { parseMbPdf } from "@/lib/mbbank-pdf";
import { parseMbStatement } from "@/lib/mbbank";
import { parseTechcombankStatement } from "@/lib/techcombank";
import { parseTechcombankPdf } from "@/lib/techcombank-pdf";
import { normalizeTransferText } from "@/lib/text";

export type ImportResult = {
  batchId: string;
  fileName: string;
  totalRows: number;
  insertedRows: number;
  duplicateRows: number;
  ignoredRows: number;
  unmatchedRows: number;
  accountNumber: string | null;
  closingBalance: number | null;
  affectedCampaignCodes: string[];
};

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function importTechcombankStatement(
  fileName: string,
  buffer: Buffer,
  uploadedAt = new Date(),
  password?: string,
  selectedBank?: BankScope,
) {
  const parsed = /\.pdf$/i.test(fileName)
    ? await parseMbPdf(buffer, password) ?? await parseTechcombankPdf(buffer, password)
    : parseMbStatement(buffer) ?? parseTechcombankStatement(buffer);
  if (selectedBank && parsed.meta.sourceBank !== selectedBank) throw new Error("File sao kê không thuộc ngân hàng đang chọn. Hãy chuyển đúng tab ngân hàng rồi nhập lại.");
  const prisma = getPrisma();
  const ledger = await getBankLedger(bankScope(parsed.meta.sourceBank));
  const sourceRowCount = parsed.rows.length;
  if (ledger) {
    parsed.rows = trackedStatementRows(parsed.rows, ledger.trackingFrom);
    parsed.meta.fromDate = new Date(Math.max(parsed.meta.fromDate?.getTime() ?? 0, ledger.trackingFrom.getTime()));
    parsed.meta.openingBalance = Number(ledger.openingBalance);
    parsed.meta.closingBalance = null;
  }
  const ignoredRows = sourceRowCount - parsed.rows.length;
  if (!parsed.rows.length) throw new Error("File này chỉ có giao dịch trước ngày bắt đầu theo dõi; không có giao dịch nào được nhập.");
  const rules = await withDatabaseReadRetry(() => loadKeywordRules(prisma, bankScope(parsed.meta.sourceBank)));

  const uniqueRows = new Map<string, (typeof parsed.rows)[number]>();
  for (const row of parsed.rows) {
    if (!uniqueRows.has(row.detail)) {
      uniqueRows.set(row.detail, row);
    }
  }

  return prisma.$transaction(async (tx: TransactionClient) => {
    const accountNumber = parsed.meta.accountNumber ?? "TECHCOMBANK_UNKNOWN";
    const account = await tx.bankAccount.upsert({
      where: { accountNumber },
      update: {
        bankName: parsed.meta.sourceBank,
        accountName: parsed.meta.accountName,
        currency: parsed.meta.currency,
        ...(parsed.meta.closingBalance == null ? {} : {
          currentBalance: toPrismaDecimal(parsed.meta.closingBalance), balanceAsOf: parsed.meta.toDate,
        }),
      },
      create: {
        bankName: parsed.meta.sourceBank,
        accountNumber,
        accountName: parsed.meta.accountName,
        currency: parsed.meta.currency,
        currentBalance: toPrismaDecimal(parsed.meta.closingBalance ?? 0),
        balanceAsOf: parsed.meta.closingBalance == null ? null : parsed.meta.toDate,
      },
    });

    const batch = await tx.importBatch.create({
      data: {
        fileName,
        importedAt: uploadedAt,
        sourceBank: parsed.meta.sourceBank,
        accountId: account.id,
        fromDate: parsed.meta.fromDate,
        toDate: parsed.meta.toDate,
        openingBalance:
          parsed.meta.openingBalance == null ? null : toPrismaDecimal(parsed.meta.openingBalance),
        closingBalance:
          parsed.meta.closingBalance == null ? null : toPrismaDecimal(parsed.meta.closingBalance),
        totalRows: sourceRowCount,
        ignoredRows,
      },
    });

    const details = [...uniqueRows.keys()];
    const dates = parsed.rows.map((row) => row.transactionDate.getTime());
    const from = dates.length ? new Date(Math.min(...dates)) : uploadedAt;
    from.setUTCHours(0, 0, 0, 0);
    const until = dates.length ? new Date(Math.max(...dates)) : new Date(uploadedAt);
    until.setUTCHours(24, 0, 0, 0);
    const existing = await tx.bankTransaction.findMany({
      where: { OR: [
        { detail: { in: details } },
        { accountId: account.id, transactionDate: { gte: from, lt: until } },
      ] },
      select: { accountId: true, detail: true, transactionDate: true, description: true, debitAmount: true, creditAmount: true, balanceAfter: true },
    });
    const insertableRows = newStatementRows([...uniqueRows.values()], existing.map((row) => ({
      ...row,
      debitAmount: Number(row.debitAmount), creditAmount: Number(row.creditAmount),
      balanceAfter: row.balanceAfter == null ? null : Number(row.balanceAfter),
    })), account.id);

    const data = insertableRows.map((row) => {
      const classification = classifyDescription(row.description, rules);

      return {
        accountId: account.id,
        importBatchId: batch.id,
        campaignId: classification.campaignId,
        transactionDate: row.transactionDate,
        statementRow: row.statementRow,
        description: row.description,
        normalizedDescription: normalizeTransferText(row.description),
        detail: row.detail,
        debitAmount: toPrismaDecimal(row.debitAmount),
        creditAmount: toPrismaDecimal(row.creditAmount),
        balanceAfter: row.balanceAfter == null ? null : toPrismaDecimal(row.balanceAfter),
        matchedKeyword: classification.matchedKeyword,
        classificationStatus: classification.status,
        raw: row.raw as InputJsonObject,
      };
    });

    const created = data.length
      ? await tx.bankTransaction.createMany({
          data,
          skipDuplicates: true,
        })
      : { count: 0 };

    let ledgerBalance: number | null = null;
    if (ledger) {
      const sums = await tx.bankTransaction.aggregate({
        where: { accountId: account.id, transactionDate: { gte: ledger.trackingFrom } },
        _sum: { creditAmount: true, debitAmount: true },
      });
      ledgerBalance = balanceFromOpening(Number(ledger.openingBalance), Number(sums._sum.creditAmount ?? 0), Number(sums._sum.debitAmount ?? 0));
      const latestTime = Math.max(account.balanceAsOf?.getTime() ?? 0, ledger.confirmedAt.getTime(), ...parsed.rows.map(row => row.transactionDate.getTime()));
      await tx.bankAccount.update({ where: { id: account.id }, data: { currentBalance: toPrismaDecimal(ledgerBalance), balanceAsOf: new Date(latestTime) } });
    }

    const duplicateRows = parsed.rows.length - created.count;
    const unmatchedRows = data.filter((row) => row.classificationStatus === "UNMATCHED").length;
    const campaignCodesById = new Map(rules.map((rule) => [rule.campaignId, rule.campaignCode]));
    const affectedCampaignCodes = [
      ...new Set(
        data
          .map((row) => row.campaignId && campaignCodesById.get(row.campaignId))
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        insertedRows: created.count,
        duplicateRows,
        unmatchedRows,
        ...(ledgerBalance == null ? {} : { closingBalance: toPrismaDecimal(ledgerBalance) }),
      },
    });

    return {
      batchId: batch.id,
      fileName,
      totalRows: sourceRowCount,
      insertedRows: created.count,
      duplicateRows,
      ignoredRows,
      unmatchedRows,
      accountNumber: parsed.meta.accountNumber,
      closingBalance: ledgerBalance ?? parsed.meta.closingBalance,
      affectedCampaignCodes,
    } satisfies ImportResult;
  }, { maxWait: 20_000, timeout: 20_000 });
}

export async function reclassifyImportedTransactions(bank: BankScope = "TECHCOMBANK") {
  const prisma = getPrisma();
  const rules = await withDatabaseReadRetry(() => loadKeywordRules(prisma, bank));
  const bankWhere = await activeBankTransactionWhere(bank);
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      AND: [bankWhere],
      classificationStatus: { not: "MANUAL" },
      allocations: { none: {} },
      OR: [
        { campaignId: null },
        { campaign: { status: { not: "COMPLETED" } } },
      ],
    },
    select: {
      id: true,
      description: true,
      campaignId: true,
      campaign: {
        select: { code: true },
      },
    },
  });

  let matchedRows = 0;
  let unmatchedRows = 0;
  const affectedCampaignIds = new Set<string>();
  const affectedCampaignCodes = new Set<string>();

  const updates = transactions.map((transaction) => {
    if (transaction.campaignId) {
      affectedCampaignIds.add(transaction.campaignId);
    }
    if (transaction.campaign?.code) {
      affectedCampaignCodes.add(transaction.campaign.code);
    }
    const classification = classifyDescription(transaction.description, rules);
    if (classification.campaignId) {
      affectedCampaignIds.add(classification.campaignId);
    }
    if (classification.status === "MATCHED") {
      matchedRows += 1;
    } else {
      unmatchedRows += 1;
    }

    return prisma.bankTransaction.update({
      where: { id: transaction.id },
      data: {
        campaignId: classification.campaignId,
        matchedKeyword: classification.matchedKeyword,
        classificationStatus: classification.status,
        normalizedDescription: normalizeTransferText(transaction.description),
      },
    });
  });

  for (let index = 0; index < updates.length; index += 20) {
    await Promise.all(updates.slice(index, index + 20));
  }

  return {
    totalRows: transactions.length,
    matchedRows,
    unmatchedRows,
    affectedCampaignCodes: [
      ...affectedCampaignCodes,
      ...rules
        .filter((rule) => affectedCampaignIds.has(rule.campaignId))
        .map((rule) => rule.campaignCode),
    ].filter((code, index, codes) => codes.indexOf(code) === index),
  };
}

async function loadKeywordRules(prisma: PrismaClient, bank: BankScope): Promise<KeywordRule[]> {
  const keywords = await prisma.campaignKeyword.findMany({
    where: {
      active: true,
      campaign: {
        bankName: bank,
        status: { not: "COMPLETED" },
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  return keywords.map((keyword) => ({
    campaignId: keyword.campaign.id,
    campaignCode: keyword.campaign.code,
    campaignName: keyword.campaign.name,
    keyword: keyword.keyword,
    normalizedKeyword: keyword.normalizedKeyword,
    matchType: keyword.matchType,
  }));
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}
