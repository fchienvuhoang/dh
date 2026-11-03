import { createHash } from "node:crypto";
import { parseTechcombankMatrix, type ParsedStatement } from "@/lib/techcombank";
import { normalizeTransferText } from "@/lib/text";

type PdfText = { str: string; x: number; y: number };
const unsupported = "Chưa đọc được đầy đủ bố cục PDF này. Vui lòng dùng bản Excel hoặc gửi PDF mẫu để bổ sung định dạng; chưa có giao dịch nào được nhập.";

export async function parseTechcombankPdf(buffer: Buffer, password?: string): Promise<ParsedStatement> {
  const { getDocument, Util } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(buffer),
    password,
    useSystemFonts: true,
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 200) throw new Error("PDF vượt quá 200 trang. Vui lòng chia nhỏ sao kê.");
    const pages: PdfText[][] = [];
    const visualPages: PdfText[][] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.flatMap((item) => "str" in item && item.str.trim()
        ? [{ str: item.str.trim(), x: item.transform[4], y: item.transform[5] }]
        : []));
      const viewport = page.getViewport({ scale: 1 });
      visualPages.push(content.items.flatMap((item) => {
        if (!("str" in item) || !item.str.trim()) return [];
        const transform = Util.transform(viewport.transform, item.transform);
        return [{ str: item.str.trim(), x: transform[4] / viewport.width, y: transform[5] }];
      }));
      page.cleanup();
    }
    return visualPages[0]?.some((item) => item.str === "Transaction No")
      ? parseMobileBankStatement(visualPages)
      : parsePdfStatementPages(pages);
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new Error(password ? "Mật khẩu PDF chưa đúng. Vui lòng nhập lại." : "PDF được bảo vệ. Vui lòng nhập mật khẩu mở PDF.");
    }
    throw error;
  } finally {
    await task.destroy();
  }
}

// Accept only the six-column Techcombank layout with an explicit transaction ID.
// Unknown layouts are rejected rather than guessing the direction of a payment.
export function parsePdfStatementPages(pages: PdfText[][]): ParsedStatement {
  const headers = ["ngay", "dien giai", "chi tiet", "no", "co", "so du"];
  const matrix: string[][] = [];
  let columns: number[] | undefined;
  let transaction: string[] | undefined;
  let sawTable = false;
  let ended = false;
  const flush = () => {
    if (transaction) matrix.push(transaction);
    transaction = undefined;
  };
  for (const items of pages) {
    const lines: PdfText[][] = [];
    for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const line = lines.find((line) => Math.abs(line[0].y - item.y) < 2);
      if (line) line.push(item);
      else lines.push([item]);
    }
    for (const line of lines) {
      line.sort((a, b) => a.x - b.x);
      const labels = line.map((item) => normalizeTransferText(item.str));
      if (headers.every((header) => labels.includes(header))) {
        flush();
        columns = headers.map((header) => line[labels.indexOf(header)].x);
        if (columns.some((x, i) => i > 0 && x <= columns![i - 1])) throw new Error(unsupported);
        if (!sawTable) matrix.push(headers);
        sawTable = true;
        continue;
      }
      const lineText = normalizeTransferText(line.map((item) => item.str).join(" "));
      if (!sawTable || /^(so du dau ky|so du cuoi ky|so tai khoan|ten tai khoan|loai tien|tu ngay|toi ngay)\b/.test(lineText)) {
        const metaLabels = ["so tai khoan", "ten tai khoan", "loai tien", "tu ngay", "toi ngay", "so du dau ky", "so du cuoi ky"];
        for (const label of metaLabels) {
          const index = line.findIndex((item) => normalizeTransferText(item.str).replace(/:$/, "").trim() === label);
          if (index >= 0 && line[index + 1]) matrix.unshift([label, line.slice(index + 1).map((item) => item.str).join(" ")]);
        }
        if (sawTable && /^so du cuoi ky\b/.test(lineText)) { flush(); ended = true; }
        continue;
      }
      if (!columns || ended) continue;
      const cells = headers.map(() => "");
      for (const item of line) {
        let column = 0;
        // Column boundaries use header left edges; financial cells may be right-aligned.
        for (let i = 1; i < columns.length; i++) if (item.x >= columns[i] - 3) column = i;
        cells[column] = `${cells[column]} ${item.str}`.trim();
      }
      if (/^\d{1,2}\/\d{1,2}\/\d{4}(?:\s|$)/.test(cells[0])) {
        flush();
        transaction = cells;
      } else if (transaction && !cells[0] && cells.some(Boolean)) {
        for (let i = 1; i < cells.length; i++) transaction[i] = `${transaction[i]} ${cells[i]}`.trim();
      } else if (cells[0] && !/^(trang|page)\b/.test(lineText)) {
        flush();
        // A non-transaction footer terminates this page's table.
        columns = undefined;
      }
    }
  }
  flush();
  if (!sawTable) throw new Error(unsupported);
  return validatePdfMatrix(matrix);
}

function validatePdfMatrix(matrix: string[][]) {
  const parsed = parseTechcombankMatrix(matrix, "PDF");
  const dataRows = matrix.filter((row) => /^\d{1,2}\/\d{1,2}\/\d{4}/.test(row[0]));
  if (!parsed.rows.length || parsed.rows.length !== dataRows.length || !parsed.meta.accountNumber || parsed.meta.openingBalance == null || parsed.meta.closingBalance == null) throw new Error(unsupported);
  if (new Set(parsed.rows.map((row) => row.detail)).size !== parsed.rows.length) throw new Error(unsupported);
  const amount = /^(?:-|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)?$/;
  for (const row of dataRows) {
    if (![row[3], row[4], row[5]].every((cell) => amount.test(cell))) throw new Error(unsupported);
  }
  if (parsed.rows.some((row) => (row.debitAmount > 0) === (row.creditAmount > 0) || row.balanceAfter == null)) throw new Error(unsupported);
  const delta = parsed.rows.reduce((sum, row) => sum + row.creditAmount - row.debitAmount, 0);
  if (Math.abs(parsed.meta.openingBalance + delta - parsed.meta.closingBalance) > 0.01) throw new Error(unsupported);
  // Check running balances too, accepting ascending or descending statement order.
  const reconciles = (rows: typeof parsed.rows) => {
    let balance = parsed.meta.openingBalance!;
    return rows.every((row) => {
      balance += row.creditAmount - row.debitAmount;
      return Math.abs(balance - row.balanceAfter!) < 0.01;
    });
  };
  if (!reconciles(parsed.rows) && !reconciles([...parsed.rows].reverse())) throw new Error(unsupported);
  return parsed;
}

// Techcombank mobile export: eight columns, rotated landscape pages, header only on page 1.
export function parseMobileBankStatement(pages: PdfText[][]): ParsedStatement {
  const all = pages.flat();
  const valueFor = (label: string, minX = 0) => {
    for (const page of pages) {
      const item = page.find((item) => normalizeTransferText(item.str).startsWith(normalizeTransferText(label)));
      if (!item) continue;
      const value = page.filter((other) => other !== item && Math.abs(other.y - item.y) < 2 && other.x > Math.max(item.x, minX)).sort((a, b) => a.x - b.x)[0];
      if (value) return value.str;
    }
    throw new Error(unsupported);
  };
  const matrix = [
    ["so tai khoan", valueFor("so tai khoan/")],
    ["ten tai khoan", valueFor("ten tai khoan/")],
    ["loai tien", valueFor("loai tien/")],
    ["tu ngay", valueFor("tu ngay/")],
    ["toi ngay", valueFor("den ngay/")],
    ["so du dau ky", valueFor("so du dau ky/", .87)],
    ["so du cuoi ky", valueFor("so du cuoi ky/", .87)],
    ["ngay", "dien giai", "chi tiet", "no", "co", "so du"],
  ];
  let referenceCount = 0;
  for (const page of pages) {
    const starts = page.flatMap((item, index) => /^\d{2}\/\d{2}\/\d{4}$/.test(item.str) && item.x > .08 && item.x < .14 ? [index] : []);
    for (let n = 0; n < starts.length; n++) {
      const group = page.slice(starts[n], starts[n + 1] ?? page.length).filter((item) => item.y < 550 && !/^(Cộng doanh số|Số dư cuối kỳ)/.test(item.str));
      const reference = group.filter((item) => item.x >= .515 && item.x < .65 && /^FT\d+(?:\\BNK)?$/.test(item.str));
      if (reference.length > 1) throw new Error(unsupported);
      referenceCount += reference.length;
      const anchor = reference[0] ?? page[starts[n]];
      const money = (left: number, right: number) => {
        const cells = group.filter((item) => item.x >= left && item.x < right && Math.abs(item.y - anchor.y) < 2);
        if (cells.length > 1) throw new Error(unsupported);
        return cells[0]?.str ?? "";
      };
      const description = group.filter((item) => item.x >= .375 && item.x < .515 && !/Ending balance/.test(item.str)).map((item) => item.str).join(" ");
      const fallback = "TCB-PDF-" + createHash("sha256").update(JSON.stringify([matrix[0][1], anchor.str, description, money(.65, .75), money(.75, .87), money(.87, 1)])).digest("hex");
      matrix.push([
        page[starts[n]].str,
        description,
        reference[0]?.str ?? fallback,
        money(.65, .75), money(.75, .87), money(.87, 1),
      ]);
    }
  }
  if (all.filter((item) => /^FT\d+(?:\\BNK)?$/.test(item.str)).length !== referenceCount) throw new Error(unsupported);
  const parsed = validatePdfMatrix(matrix);
  const totalsLabel = all.find((item) => item.str.startsWith("Cộng doanh số/"));
  if (!totalsLabel) throw new Error(unsupported);
  const totalPage = pages.find((page) => page.includes(totalsLabel))!;
  const totals = totalPage.filter((item) => item.x > .65 && Math.abs(item.y - totalsLabel.y) < 2).sort((a, b) => a.x - b.x).map((item) => Number(item.str.replaceAll(",", "")));
  if (totals.length !== 2 || Math.abs(parsed.rows.reduce((s, r) => s + r.debitAmount, 0) - totals[0]) > .01 || Math.abs(parsed.rows.reduce((s, r) => s + r.creditAmount, 0) - totals[1]) > .01) throw new Error(unsupported);
  return parsed;
}
