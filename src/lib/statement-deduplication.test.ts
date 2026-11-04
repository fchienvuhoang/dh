import assert from "node:assert/strict";
import { test } from "node:test";
import { newStatementRows } from "./statement-deduplication";

const original = { accountId: "account", detail: "19800000000\\DDA", transactionDate: new Date("2026-10-31T12:00:00Z"), description: "Thanh toan tu dong no lai chi tieu TK 19800000000 - So tien 42381 VND", debitAmount: 42381, creditAmount: 0, balanceAfter: 123772161 };
const pdf = { ...original, detail: "TCB-PDF-generated", description: original.description.replace("chi tieu", "chi  tieu") };

test("same fee imported across Excel and PDF is skipped in both directions", () => {
  assert.equal(newStatementRows([pdf], [original], "account").length, 0);
  assert.equal(newStatementRows([original], [pdf], "account").length, 0);
  assert.equal(newStatementRows([pdf], [pdf], "account").length, 0);
});

test("equal amount alone never merges a compensating receipt or another transaction", () => {
  for (const row of [
    { ...pdf, debitAmount: 0, creditAmount: 42381 },
    { ...pdf, balanceAfter: 123814542 },
    { ...pdf, transactionDate: new Date("2026-11-01T12:00:00Z") },
    { ...pdf, description: "A different payment" },
    { ...pdf, balanceAfter: null },
  ]) assert.equal(newStatementRows([row], [original], "account").length, 1);
  assert.equal(newStatementRows([pdf], [{ ...original, accountId: "other" }], "account").length, 1);
});

test("distinct bank references are kept and matching rows are consumed once", () => {
  assert.equal(newStatementRows([{ ...original, detail: "FTdifferent" }], [original], "account").length, 1);
  assert.equal(newStatementRows([pdf, { ...pdf, detail: "TCB-PDF-second" }], [original], "account").length, 1);
  assert.equal(newStatementRows([pdf, original], [original], "account").length, 1);
});
