import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { parseMbStatement } from "./mbbank";

function fixture(change?: (rows: unknown[][]) => void) {
  const rows: unknown[][] = [
    ["NGÂN HÀNG TMCP QUÂN ĐỘI"],
    ["Từ ngày / From: 15/11/2026 Đến ngày / To: 17/11/2026"],
    ["Tên khách hàng/ Customer name: TEST", "Tài khoản/ Account No: 123456789"],
    ["Loại tiền/ Currency: VND"],
    ["Số dư đầu kỳ/ Opening Balance: 1,000 VND"],
    ["Ngày giao dịch", "Ngày hạch toán", "Số bút toán", "Phát sinh nợ", "Phát sinh có", "Số dư lũy kế", "Nội dung"],
    ["Transaction date", "Accounting Date", "Transaction No", "Debit", "Credit", "Accumulated balance", "Details"],
    ["15/11/2026 23:59:59", "15/11/2026", "FT1", "", "300", "1,300", "Khoan cu"],
    ["16/11/2026 00:00:00", "16/11/2026", "FT2", "100", "", "1,200", "Chi"],
    ["17/11/2026 08:00:00", "17/11/2026", "FT2", "", "500", "1,700", "TP14"],
    ["Tổng phát sinh trong kỳ / Total", null, null, "100", "800"],
    ["Số dư cuối kỳ / Closing Balance: 1,700 VND"],
  ];
  change?.(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "MB");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

test("MB validates full statement then includes all historical dates", () => {
  const parsed = parseMbStatement(fixture())!;
  assert.equal(parsed.meta.sourceBank, "MBBANK");
  assert.equal(parsed.meta.accountNumber, "123456789");
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0].transactionDate.toISOString(), "2026-11-15T16:59:59.000Z");
  assert.equal(parsed.meta.openingBalance, 1000);
  assert.equal(parsed.meta.closingBalance, 1700);
  assert.notEqual(parsed.rows[0].detail, parsed.rows[1].detail);
  assert.deepEqual(parsed.rows.map(r => r.detail), parseMbStatement(fixture())!.rows.map(r => r.detail));
});

test("accepts old-only statements without a November 16 cutoff", () => {
  const parsed = parseMbStatement(fixture(rows => {
    rows[8][0] = "15/11/2026 23:59:59";
    rows[9][0] = "15/11/2026 23:59:59";
  }))!;
  assert.equal(parsed.rows.length, 3);
});

test("rejects missing rows, invalid values, totals, balances and dates", () => {
  for (const change of [
    (rows: unknown[][]) => { rows.splice(7, 1); },
    (rows: unknown[][]) => { rows[8][3] = "invalid"; },
    (rows: unknown[][]) => { rows[10][4] = "801"; },
    (rows: unknown[][]) => { rows[8][5] = "1,201"; },
    (rows: unknown[][]) => { rows[8][0] = "31/11/2026 00:00:00"; },
  ]) assert.throws(() => parseMbStatement(fixture(change)), /thiếu dữ liệu hoặc số dư không khớp/);
});

test("does not claim non-MB Excel files", () => {
  assert.equal(parseMbStatement(fixture(rows => { rows[0][0] = "Techcombank"; })), null);
});
