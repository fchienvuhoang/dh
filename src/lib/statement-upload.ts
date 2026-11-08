import { ZipReader, Uint8ArrayReader, ERR_INVALID_PASSWORD, ERR_ENCRYPTED } from "@zip.js/zip.js";

const MAX_STATEMENT_BYTES = 20 * 1024 * 1024;

function requirePdf(buffer: Buffer) {
  if (!buffer.length || !buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
    throw new Error("File bên trong không phải PDF hợp lệ.");
  }
}

function requireStatement(fileName: string, buffer: Buffer) {
  if (/\.pdf$/i.test(fileName)) return requirePdf(buffer);
  const zip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const ole = buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (!zip && !(/\.xls$/i.test(fileName) && ole)) throw new Error("File bên trong không phải Excel hợp lệ.");
}

export async function prepareStatementUpload(fileName: string, buffer: Buffer, password?: string) {
  if (!/\.zip$/i.test(fileName)) {
    if (/\.pdf$/i.test(fileName)) requirePdf(buffer);
    return { fileName, buffer };
  }
  const reader = new ZipReader(new Uint8ArrayReader(buffer), { useWebWorkers: false, useCompressionStream: true });
  try {
    const entries = [];
    for await (const entry of reader.getEntriesGenerator()) {
      entries.push(entry);
      if (entries.length > 100) throw new Error("ZIP chứa quá nhiều tập tin. Vui lòng chỉ nén một file Excel hoặc PDF sao kê.");
    }
    const statements = entries.filter((entry) => !entry.directory && !entry.filename.startsWith("__MACOSX/") && /\.(xlsx|xls|pdf)$/i.test(entry.filename));
    if (statements.length !== 1) throw new Error("ZIP cần chứa đúng một file Excel hoặc PDF sao kê.");
    const statement = statements[0];
    if (statement.directory) throw new Error("ZIP cần chứa một file Excel hoặc PDF sao kê.");
    if (statement.encrypted && !password) throw new Error("Vui lòng cấu hình ZIP_PASS để giải nén ZIP.");
    if (statement.uncompressedSize > MAX_STATEMENT_BYTES) throw new Error("File sao kê sau giải nén không được vượt quá 20 MB.");
    const chunks: Buffer[] = [];
    let size = 0;
    await statement.getData(new WritableStream<Uint8Array>({
      write(chunk) {
        size += chunk.byteLength;
        if (size > MAX_STATEMENT_BYTES) throw new Error("File sao kê sau giải nén không được vượt quá 20 MB.");
        chunks.push(Buffer.from(chunk));
      },
    }), { password, checkSignature: true, signal: AbortSignal.timeout(30_000) });
    const extracted = Buffer.concat(chunks);
    requireStatement(statement.filename, extracted);
    return { fileName: statement.filename.split(/[\\/]/).pop()!, buffer: extracted };
  } catch (error) {
    if (error instanceof Error && [ERR_INVALID_PASSWORD, ERR_ENCRYPTED].includes(error.message)) {
      throw new Error("Mật khẩu giải nén ZIP chưa đúng. Vui lòng kiểm tra ZIP_PASS.");
    }
    if (error instanceof Error && /^(ZIP |PDF |Vui lòng |File )/.test(error.message)) throw error;
    throw new Error("Không giải nén được ZIP. File có thể bị lỗi hoặc không được hỗ trợ.");
  } finally {
    await reader.close();
  }
}
