import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMbPdfPages } from "./mbbank-pdf";

function pages() {
  return [[
    {s:"Military Commercial Joint Stock Bank",x:600,y:60},
    {s:"/Account No:",x:68,y:102},{s:"123456",x:118,y:102},
    {s:"/Account name:",x:79,y:120},{s:"TEST",x:145,y:120},
    {s:"/Currency:",x:54,y:136},{s:"VND",x:96,y:136},
    {s:"Từ ngày/From: 01/09/2026 Đến ngày/To: 16/11/2026",x:126,y:152},
    {s:"Transaction No",x:128,y:249},
    {s:"16/11/2026 21:39",x:23,y:289},{s:"FT123",x:89,y:289},
    {s:"0.00",x:270,y:289},{s:"100,000.00",x:312,y:289},
    {s:"TP1 cung duong",x:355,y:284},{s:"vat thuc",x:355,y:294},
    {s:"01/09/2026 02:04",x:23,y:330},{s:"ONLINE.AC.CLOSURE-123",x:89,y:330},
    {s:"50,000.00",x:242,y:330},{s:"0.00",x:334,y:330},{s:"Chi",x:355,y:330},
  ],[
    {s:"Tổng phát sinh trong kỳ/Total",x:66,y:38},
    {s:"50,000.",x:236,y:33},{s:"00",x:274,y:44},
    {s:"100,000.0",x:295,y:33},{s:"0",x:343,y:44},
  ]];
}

test("MB PDF reads wrapped descriptions/totals and preserves all historical transactions without inventing a balance", () => {
  const parsed = parseMbPdfPages(pages())!;
  assert.equal(parsed.rows.length,2);
  assert.equal(parsed.rows[0].description,"TP1 cung duong vat thuc");
  assert.equal(parsed.rows[0].creditAmount,100000);
  assert.equal(parsed.rows[1].debitAmount,50000);
  assert.equal(parsed.meta.openingBalance,null);
  assert.equal(parsed.meta.closingBalance,null);
  assert.equal(parsed.rows[1].balanceAfter,null);
});

test("rejects incomplete PDF rows, missing totals and invalid financial values", () => {
  const missing=pages();missing[0]=missing[0].filter(item=>item.s!=="FT123");
  assert.throws(()=>parseMbPdfPages(missing),/thiếu dữ liệu/);
  assert.throws(()=>parseMbPdfPages(pages().slice(0,1)),/thiếu dữ liệu/);
  const wrong=pages();wrong[1][1].s="51,000.";
  assert.throws(()=>parseMbPdfPages(wrong),/không khớp/);
});
