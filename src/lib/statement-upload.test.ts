import assert from "node:assert/strict";
import { test } from "node:test";
import { ZipWriter, Uint8ArrayWriter, Uint8ArrayReader } from "@zip.js/zip.js";
import { prepareStatementUpload } from "./statement-upload";

async function zip(files: [string, string][], password?: string, zipCrypto = false) {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false, useCompressionStream: true });
  for (const [name, content] of files) await writer.add(name, new Uint8ArrayReader(Buffer.from(content)), { password, zipCrypto });
  return Buffer.from(await writer.close());
}

test("extracts AES and ZipCrypto protected PDFs without writing archive paths to disk", async () => {
  for (const zipCrypto of [false, true]) {
    const archive = await zip([["folder/statement.PDF", "%PDF-1.4\nfixture"]], "test-password", zipCrypto);
    const result = await prepareStatementUpload("statement.zip", archive, "test-password");
    assert.equal(result.fileName, "statement.PDF");
    assert.equal(result.buffer.toString(), "%PDF-1.4\nfixture");
    await assert.rejects(prepareStatementUpload("statement.zip", archive), /mật khẩu/);
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
