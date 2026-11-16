import type { BankScope } from "@/lib/bank-scope";
import { transactionBankWhere } from "@/lib/bank-scope";
import { getPrisma, withDatabaseReadRetry } from "@/lib/prisma";

export async function getBankLedger(bank: BankScope) {
  return withDatabaseReadRetry(() => getPrisma().bankLedger.findUnique({ where: { bankName: bank } }));
}

export async function activeBankTransactionWhere(bank: BankScope) {
  const ledger = await getBankLedger(bank);
  return { ...transactionBankWhere(bank), ...(ledger ? { transactionDate: { gte: ledger.trackingFrom } } : {}) };
}

export function ledgerOpeningForCampaign(ledger: { openingCampaignId: string | null; openingBalance: unknown } | null, campaignId: string) {
  return ledger?.openingCampaignId === campaignId ? Number(ledger.openingBalance) : 0;
}
