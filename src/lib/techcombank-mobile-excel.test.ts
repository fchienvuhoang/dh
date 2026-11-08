import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { parseTechcombankStatement } from "./techcombank";

function fixture(change?: (rows: unknown[][]) => void) {
  const rows: unknown[][] = [];
  const add = (cells: Record<number, unknown>) => { const row = Array(43).fill(null); for (const [index, value] of Object.entries(cells)) row[Number(index)] = value; rows.push(row); };
  add({ 18: "Từ ngày/ From:", 20: "02/11/2026", 23: "Đến ngày/ To:", 30: "08/11/2026" });
  add({ 27: "Số tài khoản/ Account no.:", 34: "123456" });
  add({ 27: "Tên tài khoản/ Account name:", 34: "TEST" });
  add({ 27: "Loại tiền/ Currency:", 34: "VND" });
  add({ 1: "Ngày giao dịch (1)\nTransaction Date", 6: "Đối tác\nRemitter", 11: "NH Đối tác\nRemitter Bank", 17: "Diễn giải\nDetails", 21: "Số bút toán\nTransaction No", 31: "Nợ TKTT\nDebit", 37: "Có TKTT\nCredit", 42: "Số dư (2)\nBalance" });
  add({ 1: "Số dư đầu kỳ/ Opening balance", 42: "1,000" });
  add({ 1: "02/11/2026", 17: "TP14 Gop phuoc", 21: "FT123\\BNK", 37: "300", 42: "1,300" });
  add({ 2: "08/11/2026 08:59:32", 10: "Page footer", 46: "1", 47: "/2" });
  add({ 1: "03/11/2026", 17: "Phi ngan hang", 31: "100", 42: "1,200" });
  add({ 1: "Cộng doanh số/Total volume", 31: "100", 37: "300" });
  add({ 1: "Số dư cuối kỳ/ Ending balance", 31: "1,200" });
  change?.(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "AccountStatement_A4_Landscape");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

test("reads sparse bilingual mobile export and reconciles totals and balances", () => {
  const parsed = parseTechcombankStatement(fixture());
  assert.equal(parsed.meta.accountNumber, "123456");
  assert.equal(parsed.meta.closingBalance, 1200);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].detail, "FT123\\BNK");
  assert.match(parsed.rows[1].detail, /^TCB-PDF-/);
  assert.equal(parsed.rows[0].creditAmount, 300);
  assert.equal(parsed.rows[1].debitAmount, 100);
});

test("rejects missing transactions, mismatched totals and invalid amounts before import", () => {
  for (const change of [
    (rows: unknown[][]) => { rows.splice(6, 1); },
    (rows: unknown[][]) => { rows[9][37] = "301"; },
    (rows: unknown[][]) => { rows[6][42] = "1,301"; },
    (rows: unknown[][]) => { rows[6][37] = "not an amount"; },
  ]) assert.throws(() => parseTechcombankStatement(fixture(change)), /Chưa đọc đầy đủ/);
});
