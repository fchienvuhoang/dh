import assert from "node:assert/strict";
import { test } from "node:test";
import type { CampaignSummary } from "./dashboard";
import { buildCombinedCampaignStatement, selectedStatementCampaigns } from "./campaign-statement";

function campaign(code: string, status: CampaignSummary["status"] = "ACTIVE"): CampaignSummary {
  return { id: code, code, name: `Thiện pháp ${code}`, description: null, status, income: 123456, debit: 100, expenses: 100, refunds: 0, balance: 123356, transactionCount: 2, keywords: [] };
}

test("combines exactly the selected active campaigns, with a single greeting and blessing", () => {
  const campaigns = [campaign("tp01"), campaign("tp02"), campaign("tp03"), campaign("tp05", "PAUSED"), campaign("tp06", "COMPLETED")];
  const all = buildCombinedCampaignStatement(campaigns, campaigns.map((item) => item.id));
  assert.match(all, /của 3 thiện pháp/);
  for (const code of ["tp01", "tp02", "tp03"]) assert.ok(all.includes(`/thien-phap/${code}`));
  const two = buildCombinedCampaignStatement(campaigns, ["tp01", "tp03", "tp03", "tp05", "tp06", "deleted"]);
  assert.match(two, /của 2 thiện pháp/);
  assert.ok(two.includes("1. TP01"));
  assert.ok(two.includes("2. TP03"));
  for (const code of ["tp02", "tp05", "tp06"]) assert.ok(!two.includes(code.toUpperCase()) && !two.includes(`/thien-phap/${code}`));
  assert.equal(two.split("KÍNH CHÚC QUÝ VỊ").length - 1, 1);
  assert.equal(two.split("🌺 Sādhu! Sādhu! Sādhu!").length - 1, 1);
  assert.equal(buildCombinedCampaignStatement(campaigns, []), "");
  assert.equal(selectedStatementCampaigns(campaigns, ["tp03", "tp01"]).length, 2);
});

test("preserves TP04 expense details in the combined statement", () => {
  const text = buildCombinedCampaignStatement([campaign("tp04"), campaign("tp09")], ["tp04", "tp09"], {
    tp04: [{ transactionDate: "2026-11-03T12:00:00Z", amount: 100, description: "Cúng dường vật thực" }],
  });
  assert.match(text, /CHI TIẾT 01 KHOẢN CÚNG DƯỜNG/);
  assert.match(text, /Cúng dường vật thực/);
  assert.ok(text.includes("/thien-phap/tp04") && text.includes("/thien-phap/tp09"));
});
