import type { BankScope } from "@/lib/bank-scope";
import { publicBankOrigin } from "@/lib/bank-scope";

export type SharedStatementRow = {
  id: string;
  transactionDate: string;
  description: string;
  creditAmount: number;
  debitAmount: number;
  campaigns: { code: string; name: string }[];
};

export function buildShareSummary(bank: BankScope, rows: SharedStatementRow[]) {
  if (!rows.length) return "";
  const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
  const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric" }).format(new Date(value));
  const sorted = [...rows].sort((a,b)=>a.transactionDate.localeCompare(b.transactionDate)||a.id.localeCompare(b.id));
  const campaigns = [...new Map(rows.flatMap(row=>row.campaigns).map(campaign=>[campaign.code,campaign])).values()];
  return [
    `DANH SÁCH HÙN PHƯỚC VÀ CHI · ${bank === "MBBANK" ? "METTA" : "DHAMMA"}`,
    `${rows.length} giao dịch trong đợt này`,
    ...sorted.map((row,index)=>`${index+1}. ${date(row.transactionDate)} · ${row.creditAmount>0?"Thu":"Chi"} ${money(row.creditAmount||row.debitAmount)} · ${row.description.replace(/\s+/g," ").trim()}`),
    `Tổng thu đợt này: ${money(rows.reduce((sum,row)=>sum+row.creditAmount,0))}`,
    `Tổng chi đợt này: ${money(rows.reduce((sum,row)=>sum+row.debitAmount,0))}`,
    ...(campaigns.length ? ["Sao kê tổng hợp (gồm các đợt trước):",...campaigns.map(campaign=>`${campaign.name}: ${publicBankOrigin(bank)}/thien-phap/${encodeURIComponent(campaign.code)}`)] : []),
  ].join("\n");
}

export function filterShareRows<T extends { shareBatch: unknown }>(rows:T[], filter:"all"|"shared"|"unshared") {
  return rows.filter(row => filter === "all" || (filter === "shared" ? Boolean(row.shareBatch) : !row.shareBatch));
}
