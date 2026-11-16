import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import type { ParsedStatement, StatementTransactionRow } from "@/lib/techcombank";
import { normalizeTransferText } from "@/lib/text";

export const MB_IMPORT_START = "2026-11-16";
const invalid = () => new Error("Sao kê MB thiếu dữ liệu hoặc số dư không khớp. Chưa có giao dịch nào được nhập.");

export function parseMbStatement(buffer: Buffer): ParsedStatement | null {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: null });
    const text = matrix.flat().map((value) => String(value ?? "")).join("\n");
    if (!/Military Commercial Joint Stock Bank|NGÂN HÀNG TMCP QUÂN ĐỘI/i.test(text)) continue;
    const accountNumber = text.match(/Account No:\s*(\d+)/i)?.[1];
    const accountName = text.match(/Customer name:\s*([^\n]+)/i)?.[1]?.trim();
    const currency = text.match(/Currency:\s*(\w+)/i)?.[1];
    const period = text.match(/From:\s*(\d{2}\/\d{2}\/\d{4}).*?To:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const amount = (value: unknown) => {
      const raw = String(value ?? "").trim();
      if (!raw) return 0;
      if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw)) throw invalid();
      return Number(raw.replaceAll(",", ""));
    };
    const opening = text.match(/Opening Balance:\s*([\d,.-]+)/i)?.[1];
    const closing = text.match(/Closing Balance:\s*([\d,.-]+)/i)?.[1];
    const header = matrix.findIndex((row) => normalizeTransferText(row[0]) === "ngay giao dich" && normalizeTransferText(row[2]) === "so but toan");
    if (!accountNumber || !accountName || currency !== "VND" || !period || opening == null || closing == null || header < 0) throw invalid();
    const fromDate = mbDate(period[1]);
    const lastDay = mbDate(period[2]);
    if (!fromDate || !lastDay || fromDate > lastDay) throw invalid();
    const periodStart = fromDate.getTime() - 12 * 3600000;
    const periodEnd = lastDay.getTime() + 12 * 3600000 - 1;
    let previousTime = periodStart;
    let balance = amount(opening);
    let debitTotal = 0, creditTotal = 0;
    const rows: StatementTransactionRow[] = [];
    const references = new Set<string>();
    let total: unknown[] | undefined;
    for (let index = header + 1; index < matrix.length; index++) {
      const row = matrix[index];
      if (normalizeTransferText(row[0]).includes("tong phat sinh trong ky")) { total = row; break; }
      if (normalizeTransferText(row[0]) === "transaction date" || row.every((cell) => cell == null || cell === "")) continue;
      const date = mbDate(row[0]);
      const reference = String(row[2] ?? "").trim();
      const description = String(row[6] ?? "").trim();
      if (!date || !reference || !description) throw invalid();
      if (date.getTime() < previousTime || date.getTime() > periodEnd) throw invalid();
      previousTime = date.getTime();
      const debitAmount = amount(row[3]), creditAmount = amount(row[4]), balanceAfter = amount(row[5]);
      if (debitAmount < 0 || creditAmount < 0 || (debitAmount > 0) === (creditAmount > 0) || row[5] == null || row[5] === "") throw invalid();
      balance += creditAmount - debitAmount;
      if (Math.abs(balance - balanceAfter) > 0.01) throw invalid();
      const identity = createHash("sha256").update(JSON.stringify([date.toISOString(), reference, description, debitAmount, creditAmount, balanceAfter])).digest("hex");
      if (references.has(identity)) throw invalid();
      references.add(identity);
      debitTotal += debitAmount; creditTotal += creditAmount;
      rows.push({ transactionDate: date, statementRow: index + 1, description, detail: `MB-${accountNumber}-${reference}-${identity}`, debitAmount, creditAmount, balanceAfter, raw: { cells: row } });
    }
    if (!total || Math.abs(debitTotal - amount(total[3])) > 0.01 || Math.abs(creditTotal - amount(total[4])) > 0.01 || Math.abs(balance - amount(closing)) > 0.01) throw invalid();
    const cutoff = new Date(`${MB_IMPORT_START}T00:00:00+07:00`);
    const eligible = rows.filter((row) => row.transactionDate >= cutoff);
    if (!eligible.length) throw new Error("Sao kê MB không có giao dịch từ ngày 16/11/2026 trở đi. Vui lòng chọn sao kê mới hơn; chưa có dữ liệu nào được nhập.");
    return { sheetName, rows: eligible, meta: {
      sourceBank: "MBBANK", accountNumber, accountName, currency,
      fromDate: new Date(Math.max(cutoff.getTime(), periodStart)), toDate: new Date(periodEnd),
      openingBalance: eligible[0].balanceAfter! - eligible[0].creditAmount + eligible[0].debitAmount,
      closingBalance: amount(closing),
    } };
  }
  return null;
}

function mbDate(value: unknown) {
  const match = String(value ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, day, month, year, hour = "12", minute = "00", second = "00"] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return null;
  return date;
}
