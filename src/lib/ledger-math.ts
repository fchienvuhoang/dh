export function trackedStatementRows<T extends { transactionDate: Date }>(rows: T[], trackingFrom?: Date | null) {
  return trackingFrom ? rows.filter(row => row.transactionDate >= trackingFrom) : rows;
}

export function balanceFromOpening(opening: number, credit: number, debit: number) {
  return Math.round((opening + credit - debit) * 100) / 100;
}
