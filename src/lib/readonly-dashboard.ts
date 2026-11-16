import { getBankLedger, ledgerOpeningForCampaign } from "@/lib/bank-ledger";
import { type BankScope, transactionBankWhere } from "@/lib/bank-scope";
import { decimalToNumber } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";

export type ReadonlyDashboardData = {
  latestImport: {
    fileName: string;
    importedAt: string;
  } | null;
  bankAccount: {
    accountNumber: string;
    accountName: string | null;
    bankName: string;
    currentBalance: number;
    balanceAsOf: string | null;
  } | null;
  openingBalance: number;
  trackingFrom: string | null;
  totalCampaignIncome: number;
  totalCampaignExpenses: number;
  totalCampaignRefunds: number;
  totalCampaignBalance: number;
  campaigns: {
    id: string;
    code: string;
    name: string;
    status: "ACTIVE" | "PAUSED" | "COMPLETED";
    income: number;
    expenses: number;
    refunds: number;
    balance: number;
    transactionCount: number;
  }[];
};

export async function getReadonlyDashboardData(bank: BankScope = "TECHCOMBANK"): Promise<ReadonlyDashboardData> {
  const prisma = getPrisma();
  const ledger = await getBankLedger(bank);
  const bankWhere = { ...transactionBankWhere(bank), ...(ledger ? { transactionDate: { gte: ledger.trackingFrom } } : {}) };
  const [campaigns, transactionSums, refundSums, allocationSums, bankAccount, latestImport] = await Promise.all([
    prisma.campaign.findMany({
      where: { bankName: bank },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    prisma.bankTransaction.groupBy({
      by: ["campaignId"],
      where: { ...bankWhere, campaignId: { not: null }, outflowType: "DONATION" },
      _sum: { creditAmount: true, debitAmount: true },
      _count: { _all: true },
    }),
    prisma.bankTransaction.groupBy({
      by: ["campaignId"],
      where: { ...bankWhere, campaignId: { not: null }, outflowType: "REFUND" },
      _sum: { debitAmount: true },
    }),
    prisma.transactionAllocation.groupBy({
      where: { campaign: { bankName: bank }, transaction: bankWhere },
      by: ["campaignId"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.bankAccount.findFirst({
      where: { bankName: bank },
      select: {
        accountNumber: true,
        accountName: true,
        bankName: true,
        currentBalance: true,
        balanceAsOf: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.importBatch.findFirst({
      where: { sourceBank: bank },
      select: {
        fileName: true,
        importedAt: true,
      },
      orderBy: { importedAt: "desc" },
    }),
  ]);

  const sumsByCampaign = new Map(
    transactionSums.map((item) => [
      item.campaignId,
      {
        income: decimalToNumber(item._sum.creditAmount),
        expenses: decimalToNumber(item._sum.debitAmount),
        transactionCount: item._count._all,
      },
    ]),
  );
  const campaignRows = campaigns.map((campaign) => {
    const sums = sumsByCampaign.get(campaign.id);
    const allocation = allocationSums.find((item) => item.campaignId === campaign.id);
    const refund = refundSums.find((item) => item.campaignId === campaign.id);
    const allocatedIncome = decimalToNumber(allocation?._sum.amount);
    const refunds = decimalToNumber(refund?._sum.debitAmount);
    const allocationCount = allocation?._count._all ?? 0;
    const income = (sums?.income ?? 0) + allocatedIncome - refunds;
    return {
      ...campaign,
      income,
      expenses: sums?.expenses ?? 0,
      refunds,
      balance: ledgerOpeningForCampaign(ledger, campaign.id) + income - (sums?.expenses ?? 0),
      transactionCount: (sums?.transactionCount ?? 0) + allocationCount,
    };
  });

  return {
    openingBalance: ledger ? Number(ledger.openingBalance) : 0,
    trackingFrom: ledger?.trackingFrom.toISOString() ?? null,
    latestImport: latestImport
      ? {
          fileName: latestImport.fileName,
          importedAt: latestImport.importedAt.toISOString(),
        }
      : null,
    bankAccount: bankAccount
      ? {
          ...bankAccount,
          currentBalance: decimalToNumber(bankAccount.currentBalance),
          balanceAsOf: bankAccount.balanceAsOf?.toISOString() ?? null,
        }
      : null,
    totalCampaignIncome: campaignRows.reduce((total, campaign) => total + campaign.income, 0),
    totalCampaignExpenses: campaignRows.reduce(
      (total, campaign) => total + campaign.expenses,
      0,
    ),
    totalCampaignRefunds: campaignRows.reduce((total, campaign) => total + campaign.refunds, 0),
    totalCampaignBalance: campaignRows.reduce(
      (total, campaign) => total + campaign.balance,
      0,
    ),
    campaigns: campaignRows,
  };
}
