import type { PublicCampaignData } from "./public-campaign";

// Strip internal accounting before serializing the Metta donor page.
export function donorCampaignData(data: PublicCampaignData): PublicCampaignData {
  if (data.bankName !== "MBBANK") return data;
  const transactions = data.transactions
    .filter(row => row.creditAmount > 0 && row.debitAmount === 0 && row.outflowType === "DONATION")
    .map(row => ({ ...row, refundLinks: [] }));
  return {
    ...data, transactions, transactionCount: transactions.length,
    openingBalance: 0, trackingFrom: null, income: 0, expenses: 0,
    refunds: 0, balance: 0, bills: [], donations: [],
  };
}
