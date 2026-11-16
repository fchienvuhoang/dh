import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSameBank, bankScope, transactionBankWhere } from "./bank-scope";

test("bank selection defaults existing links to Dhamma and recognizes MB", () => {
  assert.equal(bankScope(undefined), "TECHCOMBANK");
  assert.equal(bankScope("MBBANK"), "MBBANK");
  assert.equal(bankScope("OTHER"), "TECHCOMBANK");
});

test("each ledger restricts transactions to its bank; legacy unlinked rows stay in Dhamma", () => {
  assert.deepEqual(transactionBankWhere("TECHCOMBANK"), { OR: [{ account: { bankName: "TECHCOMBANK" } }, { accountId: null }] });
  assert.deepEqual(transactionBankWhere("MBBANK"), { account: { bankName: "MBBANK" } });
});

test("manual assignment and splitting reject cross-bank campaigns in either direction", () => {
  assert.doesNotThrow(() => assertSameBank("TECHCOMBANK", null));
  assert.doesNotThrow(() => assertSameBank("MBBANK", "MBBANK"));
  assert.throws(() => assertSameBank("MBBANK", "TECHCOMBANK"), /ngân hàng khác/);
  assert.throws(() => assertSameBank("TECHCOMBANK", "MBBANK"), /ngân hàng khác/);
  assert.throws(() => assertSameBank("MBBANK", null), /ngân hàng khác/);
});

test("Metta and Dhamma public domains resolve to separate ledgers", async () => {
  const { publicBankForHost, publicBankOrigin } = await import("./bank-scope");
  assert.equal(publicBankForHost("metta.danasangha.org"), "MBBANK");
  assert.equal(publicBankForHost("dhamma-group.danasangha.org"), "TECHCOMBANK");
  assert.equal(publicBankOrigin("MBBANK"), "https://metta.danasangha.org");
  assert.equal(publicBankOrigin("TECHCOMBANK"), "https://dhamma-group.danasangha.org");
});
