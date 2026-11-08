import assert from "node:assert/strict";
import { test } from "node:test";
import { ZipWriter, Uint8ArrayWriter, Uint8ArrayReader } from "@zip.js/zip.js";
import * as XLSX from "xlsx";
import { parseTechcombankStatement } from "./techcombank";
import { prepareStatementUpload } from "./statement-upload";

async function zip(files: [string, string | Uint8Array][], password?: string, zipCrypto = false) {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false, useCompressionStream: true });
  for (const [name, content] of files) await writer.add(name, new Uint8ArrayReader(typeof content === "string" ? Buffer.from(content) : content), { password, zipCrypto });
  return Buffer.from(await writer.close());
}

test("extracts AES and ZipCrypto protected PDFs without writing archive paths to disk", async () => {
  for (const zipCrypto of [false, true]) {
    const archive = await zip([["folder/statement.PDF", "%PDF-1.4\nfixture"]], "test-password", zipCrypto);
    const result = await prepareStatementUpload("statement.zip", archive, "test-password");
    assert.equal(result.fileName, "statement.PDF");
    assert.equal(result.buffer.toString(), "%PDF-1.4\nfixture");
    await assert.rejects(prepareStatementUpload("statement.zip", archive), /ZIP_PASS/);
    await assert.rejects(prepareStatementUpload("statement.zip", archive, "incorrect"), /Mật khẩu/);
  }
});

test("rejects ambiguous archives and files pretending to be PDFs", async () => {
  for (const files of [ [["file.txt", "text"]], [["one.pdf", "%PDF-1.4"], ["two.pdf", "%PDF-1.4"]], [["fake.pdf", "not PDF"]] ] as [string, string][][]) {
    await assert.rejects(prepareStatementUpload("statement.zip", await zip(files)));
  }
  await assert.rejects(prepareStatementUpload("statement.zip", Buffer.from("broken")));
});

test("accepts an unencrypted ZIP and rejects oversized decompressed PDFs", async () => {
  assert.equal((await prepareStatementUpload("statement.zip", await zip([["statement.pdf", "%PDF-1.4"]]))).buffer.toString(), "%PDF-1.4");
  const archive = await zip([["huge.pdf", "%PDF-1.4\n" + "a".repeat(20 * 1024 * 1024)]]);
  await assert.rejects(prepareStatementUpload("statement.zip", archive), /20 MB/);
});


test("decrypts Excel ZIPs and feeds the existing Excel statement parser", async () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Số tài khoản", "123456"],
    ["Ngày", "Diễn giải", "Chi tiết", "Nợ", "Có", "Số dư"],
    ["08/11/2026", "TP01 Gop phuoc", "FT123", "", "100,000", "100,000"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Statement");
  for (const [extension, bookType] of [["xlsx", "xlsx"], ["xls", "biff8"]] as const) {
    const bytes = XLSX.write(workbook, { type: "buffer", bookType });
    const archive = await zip([[`folder/statement.${extension}`, bytes]], "zip-password");
    const result = await prepareStatementUpload("statement.zip", archive, "zip-password");
    assert.equal(result.fileName, `statement.${extension}`);
    const parsed = parseTechcombankStatement(result.buffer);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].detail, "FT123");
    assert.equal(parsed.rows[0].creditAmount, 100000);
    await assert.rejects(prepareStatementUpload("statement.zip", archive, "wrong"), /ZIP_PASS/);
  }
  await assert.rejects(prepareStatementUpload("bad.zip", await zip([["fake.xlsx", "not Excel"]])), /Excel/);
  await assert.rejects(prepareStatementUpload("mixed.zip", await zip([["statement.xlsx", XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })], ["statement.pdf", "%PDF-1.4"]])), /đúng một/);
});
