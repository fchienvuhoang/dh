import test from "node:test";
import assert from "node:assert/strict";
import { donorCampaignData } from "./donor-campaign";
import type { PublicCampaignData } from "./public-campaign";

const data = {
  bankName: "MBBANK", openingBalance: 100, trackingFrom: "2026-11-01",
  income: 200, expenses: 30, refunds: 10, balance: 260,
  bills: [{ id: "bill" }], donations: [{ id: "expense" }], transactionCount: 3,
  transactions: [
    { id: "income", creditAmount: 200, debitAmount: 0, outflowType: "DONATION", refundLinks: [{ amount: 10 }] },
    { id: "expense", creditAmount: 0, debitAmount: 30, outflowType: "DONATION", refundLinks: [] },
    { id: "refund", creditAmount: 0, debitAmount: 10, outflowType: "REFUND", refundLinks: [] },
  ],
} as PublicCampaignData;

test("Metta donor payload contains only contributions and no internal accounting", () => {
  const result = donorCampaignData(data);
  assert.deepEqual(result.transactions.map(row => row.id), ["income"]);
  assert.deepEqual(result.transactions[0].refundLinks, []);
  for (const key of ["income", "expenses", "refunds", "balance", "openingBalance"] as const) assert.equal(result[key], 0);
  assert.equal(result.trackingFrom, null);
  assert.deepEqual(result.bills, []);
  assert.deepEqual(result.donations, []);
  assert.equal(data.transactions.length, 3);
});

test("Techcombank public accounting stays available", () => {
  const dhamma = { ...data, bankName: "TECHCOMBANK" };
  assert.equal(donorCampaignData(dhamma), dhamma);
});
