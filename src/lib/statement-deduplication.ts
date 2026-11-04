import { compactTransferText } from "@/lib/text";

type ComparableStatementRow = {
  detail: string;
  transactionDate: Date;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balanceAfter: number | null;
};
type ExistingStatementRow = ComparableStatementRow & { accountId: string | null };

export function isPdfFallbackReference(detail: string) {
  return detail.startsWith("TCB-PDF-");
}

function identity(row: ComparableStatementRow) {
  if (row.balanceAfter == null) return null;
  return JSON.stringify([
    row.transactionDate.toISOString().slice(0, 10),
    compactTransferText(row.description),
    row.debitAmount.toFixed(2), row.creditAmount.toFixed(2), row.balanceAfter.toFixed(2),
  ]);
}

// A PDF may omit an Excel transaction reference (e.g. interest and bank fees).
// Match those rows only on the same account, bank date, full normalized content,
// debit/credit direction, amounts and running balance. Consume matches one-to-one.
export function newStatementRows<T extends ComparableStatementRow>(rows: T[], existing: ExistingStatementRow[], accountId: string): T[] {
  const existingByDetail = new Map(existing.map((row) => [row.detail, row]));
  const consumed = new Set<ExistingStatementRow>();
  const exactDuplicates = new Set<T>();
  for (const row of rows) {
    const match = existingByDetail.get(row.detail);
    if (match) { consumed.add(match); exactDuplicates.add(row); }
  }
  const byIdentity = new Map<string, ExistingStatementRow[]>();
  for (const row of existing) {
    if (row.accountId !== accountId || consumed.has(row)) continue;
    const key = identity(row);
    if (key !== null) byIdentity.set(key, [...(byIdentity.get(key) ?? []), row]);
  }
  return rows.filter((row) => {
    if (exactDuplicates.has(row)) return false;
    const key = identity(row);
    if (key === null) return true;
    const matches = byIdentity.get(key);
    const index = matches?.findIndex((match) => isPdfFallbackReference(row.detail) || isPdfFallbackReference(match.detail)) ?? -1;
    if (!matches || index < 0) return true;
    matches.splice(index, 1);
    return false;
  });
}
