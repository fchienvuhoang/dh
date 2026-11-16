import { createHash } from "node:crypto";
import type { ParsedStatement, StatementTransactionRow } from "@/lib/techcombank";

type PdfText = { s: string; x: number; y: number };
const invalid = () => new Error("PDF MB thiếu dữ liệu hoặc tổng thu chi không khớp. Chưa nhập giao dịch nào.");

export async function parseMbPdf(buffer: Buffer, password?: string): Promise<ParsedStatement | null> {
  const { getDocument, Util } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(buffer), password, useSystemFonts: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 200) throw invalid();
    const pages: PdfText[][] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n), viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      pages.push(content.items.flatMap(item => {
        if (!("str" in item) || !item.str.trim()) return [];
        const t = Util.transform(viewport.transform, item.transform);
        return [{ s: item.str.trim(), x: t[4] * 842 / viewport.width, y: t[5] * 595 / viewport.height }];
      }));
      page.cleanup();
    }
    return parseMbPdfPages(pages);
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new Error("PDF cần mật khẩu mở file hợp lệ.");
    throw error;
  } finally { await task.destroy(); }
}

export function parseMbPdfPages(pages: PdfText[][]): ParsedStatement | null {
  const first = pages[0] ?? [];
  if (!first.some(item => /Military Commercial Joint Stock Bank/.test(item.s))) return null;
  const after = (label: string) => {
    const item = first.find(item => item.s === label);
    return item && first.filter(other => other.x > item.x && Math.abs(other.y - item.y) < 2).sort((a,b) => a.x-b.x)[0]?.s;
  };
  const accountNumber = after("/Account No:");
  const accountName = after("/Account name:");
  const period = first.map(item => item.s).join(" ").match(/From:\s*(\d{2}\/\d{2}\/\d{4}).*?To:\s*(\d{2}\/\d{2}\/\d{4})/);
  if (!accountNumber || !/^\d+$/.test(accountNumber) || !accountName || after("/Currency:") !== "VND" || !period) throw invalid();
  const date = (raw: string) => {
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/);
    if (!match) throw invalid();
    const [,d,m,y,h="00",min="00"] = match;
    const result = new Date(`${y}-${m}-${d}T${h}:${min}:00+07:00`);
    if (!Number.isFinite(result.getTime()) || new Date(result.getTime()+7*3600000).toISOString().slice(0,10) !== `${y}-${m}-${d}`) throw invalid();
    return result;
  };
  const amount = (raw: string) => {
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)\.\d{2}$/.test(raw)) throw invalid();
    return Number(raw.replaceAll(",", ""));
  };
  const fromDate = date(period[1]), toDate = new Date(date(period[2]).getTime()+86400000-1);
  const rows: StatementTransactionRow[] = [];
  let totals: [number, number] | undefined;
  let previous = Infinity;
  for (const [pageIndex, page] of pages.entries()) {
    const dates = page.filter(item => item.x < 85 && /^\d{2}\/\d{2}\/\d{4} /.test(item.s)).sort((a,b)=>a.y-b.y);
    const total = page.find(item => item.s.includes("Tổng phát sinh trong kỳ/Total"));
    if (total) {
      if (totals) throw invalid();
      const column = (left: number,right: number) => page.filter(item=>item.x>=left && item.x<right && item.y>total.y-12 && item.y<total.y+15).sort((a,b)=>a.y-b.y||a.x-b.x).map(item=>item.s).join("");
      totals=[amount(column(228,290)),amount(column(290,352))];
    }
    if (!dates.length && total) continue;
    if (!dates.length || (totals && !total) || !page.some(item=>item.s==="Transaction No")) throw invalid();
    const headerY = Math.max(...page.filter(item=>["Transaction Date","Transaction No","Debit","Credit","Details"].includes(item.s)).map(item=>item.y));
    for (const [index, anchor] of dates.entries()) {
      const top=index ? (dates[index-1].y+anchor.y)/2 : headerY+5;
      const bottom=index+1<dates.length ? (anchor.y+dates[index+1].y)/2 : (total ? total.y-14 : 550);
      const cells=page.filter(item=>item.y>top && item.y<bottom);
      const column=(left:number,right:number)=>cells.filter(item=>item.x>=left&&item.x<right).sort((a,b)=>a.y-b.y||a.x-b.x).map(item=>item.s).join(" ");
      const transactionDate=date(anchor.s), reference=column(85,228), description=column(352,568);
      if (!/^[A-Z0-9][A-Z0-9.-]+$/.test(reference) || !description || transactionDate.getTime()>previous || transactionDate<fromDate || transactionDate>toDate) throw invalid();
      previous=transactionDate.getTime();
      const debitAmount=amount(column(228,290)),creditAmount=amount(column(290,352));
      if ((debitAmount>0)===(creditAmount>0)) throw invalid();
      const hash=createHash("sha256").update(JSON.stringify([anchor.s,reference,description,debitAmount,creditAmount])).digest("hex");
      rows.push({transactionDate,statementRow:rows.length+1,description,detail:`MBPDF-${accountNumber}-${reference}-${hash}`,debitAmount,creditAmount,balanceAfter:null,raw:{page:pageIndex+1,reference,beneficiary:column(568,706),counterpartyAccount:column(706,774),counterpartyBank:column(774,842)}});
    }
  }
  if (!rows.length || !totals || new Set(rows.map(row=>row.detail)).size!==rows.length || Math.abs(rows.reduce((s,r)=>s+r.debitAmount,0)-totals[0])>.01 || Math.abs(rows.reduce((s,r)=>s+r.creditAmount,0)-totals[1])>.01) throw invalid();
  return {sheetName:"MB PDF",rows,meta:{sourceBank:"MBBANK",accountNumber,accountName,currency:"VND",fromDate,toDate,openingBalance:null,closingBalance:null}};
}
