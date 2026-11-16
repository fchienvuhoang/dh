import type { Prisma } from "@prisma/client";

export type BankScope = "TECHCOMBANK" | "MBBANK";
export function bankScope(value: unknown): BankScope {
  return value === "MBBANK" ? "MBBANK" : "TECHCOMBANK";
}
export function transactionBankWhere(bank: BankScope): Prisma.BankTransactionWhereInput {
  return bank === "TECHCOMBANK"
    ? { OR: [{ account: { bankName: bank } }, { accountId: null }] }
    : { account: { bankName: bank } };
}
export function assertSameBank(campaignBank: string, accountBank?: string | null) {
  if (campaignBank !== (accountBank ?? "TECHCOMBANK")) {
    throw new Error("Không thể gán hoặc phân bổ giao dịch sang thiện pháp của ngân hàng khác.");
  }
}

export function publicBankForHost(host: string | null): BankScope {
  return host?.toLowerCase().split(":")[0] === "metta.danasangha.org" ? "MBBANK" : "TECHCOMBANK";
}
export function publicBankOrigin(bank?: string): string {
  return bank === "MBBANK" ? "https://metta.danasangha.org" : "https://dhamma-group.danasangha.org";
}
