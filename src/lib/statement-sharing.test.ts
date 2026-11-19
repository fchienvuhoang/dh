import assert from "node:assert/strict";
import { test } from "node:test";
import { buildShareSummary, filterShareRows, type SharedStatementRow } from "./statement-sharing";

test("sent membership uses exact transactions rather than a date boundary",()=>{
  const rows=[
    {id:"sent-1",transactionDate:"2026-11-16T15:00:00Z",shareBatch:{id:"batch1"}},
    {id:"late-same-day",transactionDate:"2026-11-16T15:01:00Z",shareBatch:null},
    {id:"late-import-earlier-time",transactionDate:"2026-11-16T14:00:00Z",shareBatch:null},
    {id:"tomorrow",transactionDate:"2026-11-17T14:00:00Z",shareBatch:null},
  ];
  assert.deepEqual(filterShareRows(rows,"unshared").map(row=>row.id),["late-same-day","late-import-earlier-time","tomorrow"]);
  assert.deepEqual(filterShareRows(rows,"shared").map(row=>row.id),["sent-1"]);
  assert.equal(filterShareRows(rows,"all").length,4);
});

test("MB uses the approved group announcement without transaction details or totals",()=>{
  const rows:SharedStatementRow[]=[
    {id:"one",transactionDate:"2026-11-16T17:05:00Z",description:"First receipt",creditAmount:100000,debitAmount:0,campaigns:[{code:"cdvatthuc",name:"Vật thực"}]},
    {id:"two",transactionDate:"2026-11-17T14:00:00Z",description:"Offering",creditAmount:0,debitAmount:20000,campaigns:[{code:"cdvatthuc",name:"Vật thực"}]},
  ];
  const text=buildShareSummary("MBBANK",rows,new Date("2026-11-17T18:00:00Z"));
  assert.match(text,/NGÀY 18\.11\.2026/);
  assert.ok(!text.includes("First receipt") && !text.includes("Offering"));
  assert.match(text,/Sādhu Sādhu Anumodana/);
  assert.match(text,/🙏 Kính thưa quý vị!/);
  assert.match(text,/Con xin gửi danh sách các thí chủ hùn phước để làm danh sách chia phước và hồi hướng ngày mai\./);
  assert.match(text,/Cúng dường vật thực tới Tăng đoàn/);
  assert.match(text,/cô Diệu Quy để sắp xếp danh sách hồi hướng/);
  assert.ok(!text.includes("Tổng thu") && !text.includes("Tổng chi") && !text.includes("Tổng hùn phước"));
  assert.equal(text.split("https://metta.danasangha.org/thien-phap/cdvatthuc").length-1,1);
  assert.ok(!text.includes("420.000"));
  assert.match(buildShareSummary("TECHCOMBANK",rows),/First receipt/);
  assert.match(buildShareSummary("TECHCOMBANK",rows),/https:\/\/dhamma-group.danasangha.org/);
  assert.equal(buildShareSummary("MBBANK",[]),"");
});
