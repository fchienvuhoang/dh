import type { BankScope } from "@/lib/bank-scope";
import type { SharedStatementRow } from "@/lib/statement-sharing";

type Line = { text: string; color: string; bold?: boolean; gap?: number };

// Wrap long bank references as well as ordinary words; never shorten the memo.
export function wrapImageText(text: string, measure: (text: string) => number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    if (line && measure(`${line} ${word}`) > width) { lines.push(line); line = ""; }
    for (const char of (line ? ` ${word}` : word)) {
      if (line && measure(line + char) > width) { lines.push(line); line = ""; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createStatementImages(bank: BankScope, rows: SharedStatementRow[], sentAt: string): Promise<Blob[]> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Thiết bị chưa tạo được ảnh. Vui lòng thử lại.");
  const lines: Line[] = [];
  function add(text: string, color: string, bold = false, gap = 0) {
    ctx!.font = `${bold ? "600" : "400"} 26px Arial`;
    const wrapped = wrapImageText(text, value => ctx!.measureText(value).width, 888);
    wrapped.forEach((text, index) => lines.push({ text, color, bold, gap: index === 0 ? gap : 0 }));
  }
  const money = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;
  const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
  [...rows].sort((a,b)=>a.transactionDate.localeCompare(b.transactionDate)||a.id.localeCompare(b.id)).forEach((row, index) => {
    add(`${index + 1}. ${row.debitAmount > 0 ? "Chi" : "Hùn phước"} ${money(row.creditAmount || row.debitAmount)} · ${date(row.transactionDate)}`, row.debitAmount > 0 ? "#9a3412" : "#006b5b", true, 28);
    const campaigns = [...new Set(row.campaigns.map(campaign => campaign.name))];
    if (campaigns.length) add(campaigns.join(" · "), "#526561", false, 8);
    add(row.description, "#172f2a", false, 8);
  });
  // Keep each PNG small enough for phone clipboards, even for large selections.
  const pages: Line[][] = [[]];
  let used = 0;
  for (const line of lines) {
    const height = 38 + (line.gap ?? 0);
    if (used + height > 2000) { pages.push([]); used = 0; }
    pages[pages.length - 1].push(line); used += height;
  }
  const blobs: Blob[] = [];
  for (const [pageIndex, page] of pages.entries()) {
    canvas.height = 205 + page.reduce((sum, line) => sum + 38 + (line.gap ?? 0), 0);
    ctx.fillStyle = "#fffdf9"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#006b5b"; ctx.font = "700 34px Arial";
    ctx.fillText(`${bank === "MBBANK" ? "METTA" : "DHAMMA"} · GIAO DỊCH ĐÃ CHỌN`, 56, 66);
    ctx.fillStyle = "#526561"; ctx.font = "24px Arial";
    ctx.fillText(`${date(sentAt)} · ${rows.length} giao dịch · Ảnh ${pageIndex + 1}/${pages.length}`, 56, 108);
    ctx.strokeStyle = "#d5e5de"; ctx.beginPath(); ctx.moveTo(56,130); ctx.lineTo(944,130); ctx.stroke();
    let y = 152;
    for (const line of page) {
      y += line.gap ?? 0;
      ctx.fillStyle = line.color; ctx.font = `${line.bold ? "600" : "400"} 26px Arial`;
      ctx.fillText(line.text, 56, y + 26); y += 38;
    }
    blobs.push(await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Chưa tạo được ảnh PNG.")), "image/png")));
  }
  return blobs;
}
