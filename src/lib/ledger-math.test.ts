import assert from "node:assert/strict";
import { test } from "node:test";
import { balanceFromOpening, trackedStatementRows } from "./ledger-math";
import { ledgerOpeningForCampaign } from "./bank-ledger";

test("MB cutoff starts at local midnight; historical rows remain intact", () => {
  const start=new Date("2026-11-16T00:00:00+07:00");
  const rows=[{transactionDate:new Date("2026-11-15T23:59:59+07:00"),id:"old"},{transactionDate:start,id:"new"}];
  assert.deepEqual(trackedStatementRows(rows,start).map(r=>r.id),["new"]);
  assert.equal(rows.length,2);
  assert.equal(trackedStatementRows(rows).length,2);
});

test("100k carryover plus four receipts totaling 320k closes at 420k; later transactions count once", () => {
  assert.equal(balanceFromOpening(100000,100000+100000+20000+100000,0),420000);
  assert.equal(balanceFromOpening(100000,420000,50000),470000);
  assert.equal(balanceFromOpening(0,0.3,0.1),0.2);
});

test("opening money belongs only to the explicitly chosen campaign", () => {
  const ledger={openingCampaignId:"vat-thuc",openingBalance:100000};
  assert.equal(ledgerOpeningForCampaign(ledger,"vat-thuc"),100000);
  assert.equal(ledgerOpeningForCampaign(ledger,"other"),0);
  assert.equal(ledgerOpeningForCampaign(null,"dhamma"),0);
});
