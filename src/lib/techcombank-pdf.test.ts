import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMobileBankStatement, parsePdfStatementPages, parseTechcombankPdf } from "./techcombank-pdf";

const xs = [40, 140, 260, 370, 450, 540];
function fixture() {
  const lines = [
    ["So tai khoan", "123456789"],
    ["So du dau ky", "1,000"],
    ["So du cuoi ky", "1,200"],
    ["Ngay", "Dien giai", "Chi tiet", "No", "Co", "So du"],
    ["01/11/2026", "Gop phuoc", "FT0001", "", "300", "1,300"],
    ["02/11/2026", "Chi phi", "FT0002", "100", "", "1,200"],
  ];
  return lines.flatMap((line, i) => line.flatMap((str, j) => str ? [{ str, x: xs[j], y: 760 - i * 30 }] : []));
}

test("reads six-column statement and reconciles both payment directions", () => {
  const result = parsePdfStatementPages([fixture()]);
  assert.equal(result.meta.accountNumber, "123456789");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].creditAmount, 300);
  assert.equal(result.rows[1].debitAmount, 100);
});

test("rejects missing rows, wrong balances, duplicate references and unknown layouts", () => {
  assert.throws(() => parsePdfStatementPages([fixture().filter((item) => item.y !== 640)]));
  assert.throws(() => parsePdfStatementPages([fixture().map((item) => item.str === "1,300" ? { ...item, str: "1,400" } : item)]));
  assert.throws(() => parsePdfStatementPages([fixture().map((item) => item.str === "FT0002" ? { ...item, str: "FT0001" } : item)]));
  assert.throws(() => parsePdfStatementPages([[]]));
});

// Minimal real PDF exercises the Node PDF.js worker and text extraction path.
function realPdf() {
  const text = fixture().map(({ str, x, y }) => `BT /F1 9 Tf ${x} ${y} Td (${str}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 650 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test("extracts transactions from a real PDF using the Node worker", async () => {
  const parsed = await parseTechcombankPdf(realPdf());
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.meta.closingBalance, 1200);
});


test("mobile layout reads wrapped descriptions and interest without a transaction number", () => {
  const cell = (str: string, x: number, y: number) => ({ str, x, y });
  const page = [
    cell("Số tài khoản/ Account no.:", .55, 10), cell("123456", .72, 10),
    cell("Tên tài khoản/ Account name:", .55, 20), cell("TEST", .72, 20),
    cell("Loại tiền/ Currency:", .55, 30), cell("VND", .72, 30),
    cell("Từ ngày/ From:", .3, 40), cell("01/11/2026", .45, 40),
    cell("Đến ngày/ To:", .55, 40), cell("02/11/2026", .72, 40),
    cell("Số dư đầu kỳ/ Opening balance", .35, 50), cell("1,000", .92, 50),
    cell("01/11/2026", .09, 70), cell("Gop phuoc", .38, 66), cell("TP14", .38, 74),
    cell("FT123456", .52, 70), cell("300", .82, 70), cell("1,300", .93, 70),
    cell("02/11/2026", .09, 100), cell("Tra lai tai khoan", .38, 100),
    cell("10", .82, 100), cell("1,310", .93, 100),
    cell("Cộng doanh số/Total volume", .25, 130), cell("0", .7, 130), cell("310", .82, 130),
    cell("Số dư cuối kỳ/ Ending balance", .25, 150), cell("1,310", .93, 150),
  ];
  const parsed = parseMobileBankStatement([page]);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].description, "Gop phuoc TP14");
  assert.match(parsed.rows[1].detail, /^TCB-PDF-/);
  assert.equal(parsed.rows[1].detail, parseMobileBankStatement([page]).rows[1].detail);
  assert.throws(() => parseMobileBankStatement([page.map((item) => item.str === "310" ? { ...item, str: "311" } : item)]));
});
