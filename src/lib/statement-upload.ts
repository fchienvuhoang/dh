import { ZipReader, Uint8ArrayReader, ERR_INVALID_PASSWORD, ERR_ENCRYPTED } from "@zip.js/zip.js";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function requirePdf(buffer: Buffer) {
  if (!buffer.length || !buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
    throw new Error("File bên trong không phải PDF hợp lệ.");
  }
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
      if (entries.length > 100) throw new Error("ZIP chứa quá nhiều tập tin. Vui lòng chỉ nén một file PDF sao kê.");
    }
    const pdfs = entries.filter((entry) => !entry.directory && !entry.filename.startsWith("__MACOSX/") && /\.pdf$/i.test(entry.filename));
    if (pdfs.length !== 1) throw new Error("ZIP cần chứa đúng một file PDF sao kê.");
    const pdf = pdfs[0];
    if (pdf.directory) throw new Error("ZIP cần chứa một file PDF sao kê.");
    if (pdf.encrypted && !password) throw new Error("Vui lòng cấu hình ZIP_PASS để giải nén ZIP.");
    if (pdf.uncompressedSize > MAX_PDF_BYTES) throw new Error("PDF sau giải nén không được vượt quá 20 MB.");
    const chunks: Buffer[] = [];
    let size = 0;
    await pdf.getData(new WritableStream<Uint8Array>({
      write(chunk) {
        size += chunk.byteLength;
        if (size > MAX_PDF_BYTES) throw new Error("PDF sau giải nén không được vượt quá 20 MB.");
        chunks.push(Buffer.from(chunk));
      },
    }), { password, checkSignature: true, signal: AbortSignal.timeout(30_000) });
    const extracted = Buffer.concat(chunks);
    requirePdf(extracted);
    return { fileName: pdf.filename.split(/[\\/]/).pop()!, buffer: extracted };
  } catch (error) {
    if (error instanceof Error && [ERR_INVALID_PASSWORD, ERR_ENCRYPTED].includes(error.message)) {
      throw new Error("Mật khẩu giải nén ZIP chưa đúng. Vui lòng kiểm tra ZIP_PASS.");
    }
    if (error instanceof Error && /^(ZIP |PDF |Vui lòng |File bên trong)/.test(error.message)) throw error;
    throw new Error("Không giải nén được ZIP. File có thể bị lỗi hoặc không được hỗ trợ.");
  } finally {
    await reader.close();
  }
}
