import type { PublicCampaignTransaction } from "@/lib/public-campaign";
import type { BankScope } from "@/lib/bank-scope";
import { publicBankOrigin } from "@/lib/bank-scope";

export type SharedStatementRow = {
  id: string;
  transactionDate: string;
  description: string;
  creditAmount: number;
  debitAmount: number;
  campaigns: { code: string; name: string }[];
  receipt?: { campaignName: string; campaignCode: string; transaction: PublicCampaignTransaction };
};

export function buildShareSummary(bank: BankScope, rows: SharedStatementRow[], sentAt = new Date()) {
  if (!rows.length) return "";
  const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
  const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric" }).format(new Date(value));
  const sorted = [...rows].sort((a,b)=>a.transactionDate.localeCompare(b.transactionDate)||a.id.localeCompare(b.id));
  const campaigns = [...new Map(rows.flatMap(row=>row.campaigns).map(campaign=>[campaign.code,campaign])).values()];
  const isMetta = bank === "MBBANK";
  if (isMetta) return [
    `🌿 HÙN PHƯỚC NGÀY ${date(sentAt.toISOString()).replaceAll("/", ".")}`,
    "Cúng dường vật thực tới Tăng đoàn",
    "",
    "🙏 Kính thưa quý vị!",
    "",
    "Con xin gửi danh sách các thí chủ hùn phước để làm danh sách chia phước và hồi hướng ngày mai.",
    "",
    `${publicBankOrigin(bank)}/thien-phap/cdvatthuc`,
    "",
    "🌼 Quý thí chủ muốn hồi hướng phước báu tới cha mẹ, thân bằng quyến thuộc còn hiện tiền hoặc đã quá vãng, xin vui lòng liên hệ cô Diệu Quy để sắp xếp danh sách hồi hướng.",
    "",
    "Các khoản phát sinh sau đợt này con xin gửi bổ sung vào tối mai ạ.",
    "",
    "🌺 Sādhu Sādhu Anumodana",
    "🌺 Idaṃ me puññaṃ nibbānassa paccayo hotu.",
    "🌺 Buddhasāsanaṃ Ciraṃ Tiṭṭhatu.",
  ].join("\n");
  return [
    `🌿 DANH SÁCH HÙN PHƯỚC NGÀY ${date(sentAt.toISOString()).replaceAll("/", ".")}`,
    ...(isMetta ? ["Cúng dường vật thực tới tăng đoàn"] : campaigns.map(campaign=>campaign.name)),
    "",
    isMetta
      ? "Con xin gửi các khoản cúng dường vật thực hôm nay theo nội dung giao dịch để ghi nhận vào danh sách chia phước ngày mai ạ."
      : "Con xin gửi các khoản hùn phước và chi theo nội dung giao dịch trong đợt này.",
    "",
    ...sorted.map((row,index)=>`${index+1}. ${row.debitAmount>0?"Chi ":""}${money(row.creditAmount||row.debitAmount)} — ${row.description.replace(/\s+/g," ").trim()}`),
    ...(campaigns.length ? ["", "👉 Sao kê tổng hợp thu, chi và số dư quỹ:",...campaigns.map(campaign=>`${campaigns.length>1?`${campaign.name}: `:""}${publicBankOrigin(bank)}/thien-phap/${encodeURIComponent(campaign.code)}`)] : []),
    ...(isMetta ? ["", "🌼 Quý thí chủ muốn hồi hướng phước báu tới cha mẹ, thân bằng quyến thuộc còn hiện tiền hoặc đã quá vãng, xin vui lòng liên hệ cô Diệu Quy để sắp xếp danh sách hồi hướng."] : []),
    "",
    "Các khoản phát sinh sau đợt này con xin gửi bổ sung vào tối mai ạ. Xin tùy hỷ phước báu của quý thí chủ 🙏",
    "",
    "🌺 Sādhu Sādhu Anumodana",
    "🌺 Idaṃ me puññaṃ nibbānassa paccayo hotu.",
    "🌺 Buddhasāsanaṃ Ciraṃ Tiṭṭhatu.",
  ].join("\n");
}

export function filterShareRows<T extends { shareBatch: unknown }>(rows:T[], filter:"all"|"shared"|"unshared") {
  return rows.filter(row => filter === "all" || (filter === "shared" ? Boolean(row.shareBatch) : !row.shareBatch));
}
