import { getBankLedger, ledgerOpeningForCampaign } from "@/lib/bank-ledger";
import { type BankScope, transactionBankWhere } from "@/lib/bank-scope";
import { decimalToNumber } from "@/lib/money";
import { DatabaseNotConfiguredError, getPrisma, isTransientDatabaseError } from "@/lib/prisma";

export type DashboardState =
  | {
      ok: true;
      data: DashboardData;
    }
  | {
      ok: false;
      reason: "DATABASE_NOT_CONFIGURED" | "DATABASE_ERROR";
      message: string;
    };

export type DashboardData = {
  selectedBank: BankScope;
  ledger: { trackingFrom: string; openingBalance: number; confirmedBalance: number; confirmedAt: string } | null;
  overview: {
    totalIncome: number;
    totalDebit: number;
    totalExpenses: number;
    trackedFundBalance: number;
    bankBalance: number;
    transactionCount: number;
    unmatchedCount: number;
    unmatchedIncome: number;
    unmatchedDebit: number;
  };
  bankAccount: {
    accountNumber: string;
    accountName: string | null;
    bankName: string;
    currency: string;
    currentBalance: number;
    balanceAsOf: string | null;
  } | null;
  bankAccounts: { bankName: string; accountNumber: string; currentBalance: number }[];
  campaigns: CampaignSummary[];
  transactions: TransactionSummary[];
  debitTransactions: TransactionSummary[];
  shareBatches: ShareBatchSummary[];
  latestImport: {
    fileName: string;
    importedAt: string;
    totalRows: number;
    insertedRows: number;
    duplicateRows: number;
    unmatchedRows: number;
  } | null;
};

export type ShareBatchSummary = {
  id: string;
  sentAt: string;
  voidedAt: string | null;
  transactionCount: number;
  totalCredit: number;
  totalDebit: number;
};

export type CampaignSummary = {
  bankName?: BankScope;
  openingBalance?: number;
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  income: number;
  debit: number;
  expenses: number;
  refunds: number;
  balance: number;
  transactionCount: number;
  keywords: {
    id: string;
    keyword: string;
    normalizedKeyword: string;
    matchType: "CONTAINS" | "EXACT" | "REGEX";
    active: boolean;
  }[];
};

export type TransactionSummary = {
  shareBatch: { id: string; sentAt: string } | null;
  id: string;
  transactionDate: string;
  createdAt: string;
  statementRow: number | null;
  description: string;
  detail: string;
  debitAmount: number;
  creditAmount: number;
  outflowType: "DONATION" | "REFUND";
  balanceAfter: number | null;
  matchedKeyword: string | null;
  classificationStatus: "MATCHED" | "UNMATCHED" | "MANUAL";
  campaign: {
    id: string;
    code: string;
    name: string;
  } | null;
  allocations: {
    id: string;
    amount: number;
    campaign: {
      id: string;
      code: string;
      name: string;
    };
  }[];
  refundLinks: {
    id: string;
    amount: number;
    originalTransaction: {
      id: string;
      transactionDate: string;
      description: string;
      creditAmount: number;
    };
  }[];
};

export function getDashboardState(bank: BankScope = "TECHCOMBANK"): Promise<DashboardState> {
  return getDashboardStateAttempt(0, bank);
}

async function getDashboardStateAttempt(attempt: number, bank: BankScope): Promise<DashboardState> {
  try {
    const prisma = getPrisma();
    const ledger = await getBankLedger(bank);
    const bankWhere = { ...transactionBankWhere(bank), ...(ledger ? { transactionDate: { gte: ledger.trackingFrom } } : {}) };

    const [
      campaigns,
      transactionSums,
      refundSums,
      allocationSums,
      overallTransactionSums,
      unmatchedIncome,
      unmatchedDebit,
      unmatchedTransactionCount,
      transactions,
      debitTransactions,
      bankAccounts,
      latestImport,
      shareBatches,
    ] = await Promise.all([
      prisma.campaign.findMany({
        where: { bankName: bank },
        include: {
          keywords: {
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      }),
      prisma.bankTransaction.groupBy({
        by: ["campaignId"],
        where: { ...bankWhere, outflowType: "DONATION" },
        _sum: {
          creditAmount: true,
          debitAmount: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.bankTransaction.groupBy({
        by: ["campaignId"],
        where: { ...bankWhere, outflowType: "REFUND", campaignId: { not: null } },
        _sum: { debitAmount: true },
        _count: { _all: true },
      }),
      prisma.transactionAllocation.groupBy({
        where: { campaign: { bankName: bank }, transaction: bankWhere },
        by: ["campaignId"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.bankTransaction.aggregate({
        where: bankWhere,
        _sum: {
          creditAmount: true,
          debitAmount: true,
        },
        _count: true,
      }),
      prisma.bankTransaction.aggregate({
        where: {
          ...bankWhere,
          campaignId: null,
          allocations: { none: {} },
          creditAmount: {
            gt: 0,
          },
        },
        _sum: {
          creditAmount: true,
        },
        _count: true,
      }),
      prisma.bankTransaction.aggregate({
        where: {
          ...bankWhere,
          campaignId: null,
          allocations: { none: {} },
          debitAmount: {
            gt: 0,
          },
        },
        _sum: {
          debitAmount: true,
        },
        _count: true,
      }),
      prisma.bankTransaction.count({
        where: {
          ...bankWhere,
          campaignId: null,
          allocations: { none: {} },
        },
      }),
      Promise.resolve([] as TransactionSummary[]),
      Promise.resolve([] as TransactionSummary[]),
      prisma.bankAccount.findMany({
        where: { bankName: bank },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.importBatch.findFirst({
        where: { sourceBank: bank },
        orderBy: { importedAt: "desc" },
      }),
      prisma.statementShareBatch.findMany({
        where: { bankName: bank },
        select: { id: true, sentAt: true, voidedAt: true, transactionCount: true, totalCredit: true, totalDebit: true },
        orderBy: { sentAt: "desc" }, take: 10,
      }),
    ]);

    const bankAccount = bankAccounts[0] ?? null;
    const txByCampaign = new Map(
      transactionSums.map((item) => [
        item.campaignId,
        {
          income: decimalToNumber(item._sum.creditAmount),
          debit: decimalToNumber(item._sum.debitAmount),
          count: item._count._all,
        },
      ]),
    );
    const allocationsByCampaign = new Map(
      allocationSums.map((item) => [
        item.campaignId,
        {
          income: decimalToNumber(item._sum.amount),
          count: item._count._all,
        },
      ]),
    );
    const refundsByCampaign = new Map(
      refundSums.map((item) => [
        item.campaignId,
        {
          amount: decimalToNumber(item._sum.debitAmount),
          count: item._count._all,
        },
      ]),
    );

    const campaignSummaries = campaigns.map((campaign) => {
      const tx = txByCampaign.get(campaign.id);
      const allocation = allocationsByCampaign.get(campaign.id);
      const refund = refundsByCampaign.get(campaign.id);
      const grossIncome = (tx?.income ?? 0) + (allocation?.income ?? 0);
      const debit = tx?.debit ?? 0;
      const expensesAmount = debit;
      const refunds = refund?.amount ?? 0;
      const income = grossIncome - refunds;

      return {
        bankName: bank,
        openingBalance: ledgerOpeningForCampaign(ledger, campaign.id),
        id: campaign.id,
        code: campaign.code,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        income,
        debit,
        expenses: expensesAmount,
        refunds,
        balance: ledgerOpeningForCampaign(ledger, campaign.id) + income - expensesAmount,
        transactionCount: (tx?.count ?? 0) + (refund?.count ?? 0) + (allocation?.count ?? 0),
        keywords: campaign.keywords.map((keyword) => ({
          id: keyword.id,
          keyword: keyword.keyword,
          normalizedKeyword: keyword.normalizedKeyword,
          matchType: keyword.matchType,
          active: keyword.active,
        })),
      } satisfies CampaignSummary;
    });

    const totalIncome = decimalToNumber(overallTransactionSums._sum.creditAmount);
    const totalDebit = decimalToNumber(overallTransactionSums._sum.debitAmount);
    const totalExpenses = totalDebit;

    return {
      ok: true,
      data: {
        selectedBank: bank,
        ledger: ledger ? { trackingFrom: ledger.trackingFrom.toISOString(), openingBalance: Number(ledger.openingBalance), confirmedBalance: Number(ledger.confirmedBalance), confirmedAt: ledger.confirmedAt.toISOString() } : null,
        overview: {
          totalIncome,
          totalDebit,
          totalExpenses,
          trackedFundBalance: campaignSummaries.reduce((sum, campaign) => sum + campaign.balance, 0),
          bankBalance: ledger ? Number(ledger.openingBalance) + totalIncome - totalDebit : bankAccounts.reduce((sum, account) => sum + decimalToNumber(account.currentBalance), 0),
          transactionCount: overallTransactionSums._count,
          unmatchedCount: unmatchedTransactionCount,
          unmatchedIncome: decimalToNumber(unmatchedIncome._sum.creditAmount),
          unmatchedDebit: decimalToNumber(unmatchedDebit._sum.debitAmount),
        },
        bankAccount: bankAccount
          ? {
              accountNumber: bankAccount.accountNumber,
              accountName: bankAccount.accountName,
              bankName: bankAccount.bankName,
              currency: bankAccount.currency,
              currentBalance: decimalToNumber(bankAccount.currentBalance),
              balanceAsOf: bankAccount.balanceAsOf?.toISOString() ?? null,
            }
          : null,
        bankAccounts: bankAccounts.map((account) => ({
          bankName: account.bankName, accountNumber: account.accountNumber,
          currentBalance: decimalToNumber(account.currentBalance),
        })),
        campaigns: campaignSummaries,
        transactions,
        debitTransactions,
        shareBatches: shareBatches.map(batch => ({ ...batch, sentAt: batch.sentAt.toISOString(), voidedAt: batch.voidedAt?.toISOString() ?? null, totalCredit: Number(batch.totalCredit), totalDebit: Number(batch.totalDebit) })),
        latestImport: latestImport
          ? {
              fileName: latestImport.fileName,
              importedAt: latestImport.importedAt.toISOString(),
              totalRows: latestImport.totalRows,
              insertedRows: latestImport.insertedRows,
              duplicateRows: latestImport.duplicateRows,
              unmatchedRows: latestImport.unmatchedRows,
            }
          : null,
      },
    };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return {
        ok: false,
        reason: "DATABASE_NOT_CONFIGURED",
        message: "DATABASE_URL chưa được cấu hình.",
      };
    }

    if (attempt < 2 && isTransientDatabaseError(error)) {
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 250 : 750));
      return getDashboardStateAttempt(attempt + 1, bank);
    }

    return {
      ok: false,
      reason: "DATABASE_ERROR",
      message: error instanceof Error ? error.message : "Không đọc được dữ liệu dashboard.",
    };
  }
}
