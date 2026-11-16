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

export function buildShareSummary(bank: BankScope, rows: SharedStatementRow[], sentAt = new Date()) {
  if (!rows.length) return "";
  const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
  const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric" }).format(new Date(value));
  const sorted = [...rows].sort((a,b)=>a.transactionDate.localeCompare(b.transactionDate)||a.id.localeCompare(b.id));
  const campaigns = [...new Map(rows.flatMap(row=>row.campaigns).map(campaign=>[campaign.code,campaign])).values()];
  return [
    `🏦 SAO KÊ HÙN PHƯỚC VÀ CHI · ${bank === "MBBANK" ? "METTA" : "DHAMMA"}`,
    `NGÀY ${date(sentAt.toISOString()).replaceAll("/", ".")}`,
    "",
    "✍️ Con xin gửi các khoản hùn phước và chi mới được ghi nhận trong đợt này:",
    ...(campaigns.length ? campaigns.map(campaign=>campaign.name) : []),
    "",
    `${rows.length} giao dịch trong đợt này`,
    ...sorted.map((row,index)=>`${index+1}. ${date(row.transactionDate)} · ${row.creditAmount>0?"Hùn phước":"Chi"} ${money(row.creditAmount||row.debitAmount)}\n${row.description.replace(/\s+/g," ").trim()}`),
    "",
    `💰 Tổng thu đợt này: ${money(rows.reduce((sum,row)=>sum+row.creditAmount,0))}`,
    `Tổng chi đợt này: ${money(rows.reduce((sum,row)=>sum+row.debitAmount,0))}`,
    ...(campaigns.length ? ["", "👉 Sao kê tổng hợp thu, chi và số dư quỹ (gồm các đợt trước):",...campaigns.map(campaign=>`${campaigns.length>1?`${campaign.name}: `:""}${publicBankOrigin(bank)}/thien-phap/${encodeURIComponent(campaign.code)}`)] : []),
    "",
    "Kính nhờ cô ghi nhận các khoản hùn phước trên vào danh sách chia phước ngày mai ạ. Các khoản phát sinh sau đợt này con xin cập nhật vào đợt gửi tiếp theo.",
    "🌺 Sādhu Sādhu Anumodana",
    "🌺 Idaṃ me puññaṃ nibbānassa paccayo hotu.",
    "🌺 Buddhasāsanaṃ Ciraṃ Tiṭṭhatu.",
  ].join("\n");
}

export function filterShareRows<T extends { shareBatch: unknown }>(rows:T[], filter:"all"|"shared"|"unshared") {
  return rows.filter(row => filter === "all" || (filter === "shared" ? Boolean(row.shareBatch) : !row.shareBatch));
}
