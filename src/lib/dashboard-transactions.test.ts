import assert from "node:assert/strict";
import { test } from "node:test";
import { transactionFilter, type TransactionQuery } from "./dashboard-transactions";
const query: TransactionQuery = { bank: "MBBANK", campaign: "all", q: "", share: "all", page: 1, pageSize: 50, kind: "all" };
test("campaign and memo searches cannot replace the bank and ledger restrictions", () => {
  const bank = { account: { bankName: "MBBANK" }, transactionDate: { gte: new Date("2026-11-15T17:00:00Z") } };
  const filter = transactionFilter(bank, { ...query, campaign: "other-bank-campaign", q: "CÚNG DƯỜNG" });
  assert.deepEqual((filter.AND as unknown[])[0], bank);
  assert.match(JSON.stringify(filter), /cung duong/);
  assert.match(JSON.stringify(filter), /allocations/);
});
test("unclassified includes only rows with neither assignment nor allocation", () => {
  const filter = transactionFilter({}, { ...query, campaign: "unmatched", kind: "debit" });
  assert.deepEqual(filter.AND, [{}, { debitAmount: { gt: 0 } }, { campaignId: null, allocations: { none: {} } }]);
});
