import type { CampaignSummary } from "@/lib/dashboard";
import { normalizeTransferText } from "@/lib/text";

type StatementExpense = { transactionDate: string; description: string; amount: number };

const PUBLIC_CAMPAIGN_ORIGIN = "https://dhamma-group.danasangha.org";

const statementIntroductions = [
  "Dhamma Group xin kính gửi đến quý vị bản cập nhật sao kê của thiện pháp",
  "Chúng con xin phép cập nhật thông tin tịnh tài của thiện pháp",
  "Dhamma Group trân trọng gửi quý vị phần tổng hợp minh bạch của thiện pháp",
  "Kính mời quý vị cùng theo dõi thông tin thu chi mới nhất của thiện pháp",
  "Chúng con xin được chia sẻ bản cập nhật tịnh tài dành cho thiện pháp",
];

const statementGreeting =
  "KÍNH CHÚC QUÝ VỊ NGÀY MỚI AN VUI TRONG CHÁNH PHÁP, THUẬN DUYÊN TẠO CÁC THIỆN NGHIỆP, VUN BỒI VÀ LÀM VIÊN MÃN CÁC PĀRAMĪ.";

const statementTotals = [
  "Tính đến hôm nay, tổng tịnh tài quý vị đã cùng phát tâm hùn phước là:",
  "Tổng số tịnh tài được ghi nhận đến thời điểm cập nhật là:",
  "Đến ngày hôm nay, thiện pháp đã nhận được tổng tịnh tài hùn phước:",
  "Số tịnh tài quý vị đồng phát tâm đóng góp hiện được ghi nhận là:",
  "Tổng tịnh tài đã được cập nhật minh bạch đến hôm nay là:",
];

const statementLinkInvitations = [
  "Kính mời quý vị xem danh sách giao dịch và thông tin chi tiết tại:",
  "Toàn bộ số liệu được công khai tại đường dẫn dưới đây, kính mời quý vị theo dõi:",
  "Quý vị có thể kiểm tra phần sao kê minh bạch và các giao dịch tại:",
  "Thông tin chi tiết của từng khoản tịnh tài được cập nhật tại:",
  "Kính mời quý vị cùng theo dõi bản sao kê công khai qua đường dẫn:",
];

const statementBlessings = [
  "🌺 Sādhu! Sādhu! Sādhu!",
  "   Lành thay! Lành thay! Lành thay!",
  "🌺 Idaṃ me puññaṃ nibbānassa paccayo hotu.",
  "   Nguyện phước báu này của tôi là duyên lành đưa đến Niết-bàn.",
  "🌺 Buddhasāsanaṃ ciraṃ tiṭṭhatu.",
  "   Nguyện Giáo pháp của Đức Phật trường tồn lâu dài.",
];

export function buildCampaignStatement(campaign: CampaignSummary, expenses: StatementExpense[] = [], bodyOnly = false) {
  const variant = hashText(campaign.code) % statementIntroductions.length;
  const date = vietnamDate(new Date());
  const code = campaign.code.toLocaleUpperCase("vi-VN");
  const name = campaign.name.trim().replace(/[.。]+$/, "").toLocaleUpperCase("vi-VN");
  const publicUrl = `${PUBLIC_CAMPAIGN_ORIGIN}${publicCampaignPath(campaign.code)}`;

  if (campaign.code.toLocaleLowerCase("vi-VN") === "tp04") {
    return [
      ...(!bodyOnly ? [`🏦 CẬP NHẬT SAO KÊ THIỆN PHÁP ${code} · ${date}`, `🌺 ${name}`, ""] : []),
      `💰 Tổng hùn phước: ${money(campaign.income)}`,
      `💝 Tổng cúng dường: ${money(campaign.expenses)}`,
      `🌿 Tịnh tài hiện tại: ${money(campaign.balance)}`,
      "",
      `CHI TIẾT ${String(expenses.length).padStart(2, "0")} KHOẢN CÚNG DƯỜNG`,
      ...expenses.map((expense, index) =>
        `${index + 1}. ${shortVietnamDate(expense.transactionDate)} · ${money(expense.amount)} – ${formatTp04ExpenseDescription(expense.description)}`,
      ),
      "",
      `🔎 Xem chi tiết: ${publicUrl}`,
      ...(!bodyOnly ? statementBlessings : []),
    ].join("\n");
  }

  return [
    ...(!bodyOnly ? [
      `🏦 CẬP NHẬT SAO KÊ THIỆN PHÁP ${code}`, `NGÀY ${date}`, "", statementGreeting, "",
      `🙏 ${statementIntroductions[variant]} ${code}:`, name, "",
    ] : []),
    `💰 ${statementTotals[variant]}`,
    money(campaign.income),
    "",
    `🔎 ${statementLinkInvitations[variant]}`,
    publicUrl,
    "",
    ...(!bodyOnly ? statementBlessings : []),
  ].join("\n");
}

export function formatTp04ExpenseDescription(description: string) {
  const normalized = normalizeTransferText(description);
  const knownDescriptions: Array<[string[], string]> = [
    [["50 hop dao lam", "myanmar"], "Cúng dường 50 hộp dao lam tới chư Tăng Myanmar."],
    [["dat bat 2000 vi", "pol"], "Cúng dường đặt bát 2.000 vị tại POL."],
    [["vt pa auk", "pausi"], "Cúng dường vật thực Pa-Auk, POL Pa-Auk Pausi."],
    [["mahavihara", "m obi"], "Cúng dường Kathina Mahāvihāra Hmawbi."],
    [["mawlamyine"], "Cúng dường Kathina Pa-Auk Mawlamyine."],
    [["ntt14"], "Cúng dường Kathina chùa Ngài Tam Tạng 14."],
    [["jatila"], "Cúng dường Kathina chùa Ngài Jatila."],
    [["dhamma gone"], "Cúng dường lễ dâng y Kathina Pa-Auk Dhamma Gone."],
    [["01 bo y", "kathina pol"], "Cúng dường 01 bộ y Kathina POL."],
  ];
  const known = knownDescriptions.find(([keywords]) =>
    keywords.every((keyword) => normalized.includes(keyword)),
  );
  if (known) return known[1];

  const cleaned = description
    .replace(/\btp04\b/gi, "")
    .replace(/\b(?:nh[oó]m\s+)?dhamma(?:\s+group)?(?:\s+vn)?\b/gi, "")
    .replace(/\bcd\b/i, "Cúng dường")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.。]+$/, "");
  return `${cleaned || "Khoản cúng dường"}.`;
}

function vietnamDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")}.${value("month")}.${value("year")}`;
}

export function shortVietnamDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function hashText(value: string) {
  return [...value].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0);
}


function publicCampaignPath(code: string) {
  return `/thien-phap/${encodeURIComponent(code)}`;
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

export function selectedStatementCampaigns(campaigns: CampaignSummary[], ids: string[]) {
  const selectedIds = new Set(ids);
  return campaigns.filter((campaign) => campaign.status === "ACTIVE" && selectedIds.has(campaign.id))
    .sort((a, b) => a.code.localeCompare(b.code, "vi"));
}

export function buildCombinedCampaignStatement(campaigns: CampaignSummary[], ids: string[], expensesById: Record<string, StatementExpense[]> = {}) {
  const selected = selectedStatementCampaigns(campaigns, ids);
  if (!selected.length) return "";
  return [
    `🏦 CẬP NHẬT SAO KÊ TỔNG HỢP ${selected.map((campaign) => campaign.code.toLocaleUpperCase("vi-VN")).join(" · ")}`,
    `NGÀY ${vietnamDate(new Date())}`, "", statementGreeting, "",
    `🙏 Dhamma Group xin kính gửi quý vị bản cập nhật sao kê của ${selected.length} thiện pháp:`, "",
    ...selected.flatMap((campaign, index) => [
      `${index + 1}. ${campaign.code.toLocaleUpperCase("vi-VN")} — ${campaign.name.trim().toLocaleUpperCase("vi-VN")}`,
      buildCampaignStatement(campaign, [...(expensesById[campaign.id] ?? [])].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()), true), "",
    ]),
    ...statementBlessings,
  ].join("\n");
}
