"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ImageIcon, Loader2, Undo2 } from "lucide-react";
import type { BankScope } from "@/lib/bank-scope";
import type { ShareBatchSummary, TransactionSummary } from "@/lib/dashboard";
import { buildShareSummary, type SharedStatementRow } from "@/lib/statement-sharing";

import { StatementShareImages, type StatementImageSelection } from "@/components/statement-share-images";

export function shareTime(value:string) {
  return new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value));
}

async function readResponse(response:Response) {
  const value=await response.json();
  if(!response.ok) throw new Error(value.error??"Không lưu được đợt gửi.");
  return value;
}
async function copyText(text:string) {
  try {await navigator.clipboard.writeText(text);return;} catch {}
  const field=document.createElement("textarea");field.value=text;field.style.position="fixed";field.style.opacity="0";document.body.appendChild(field);field.select();
  const copied=document.execCommand("copy");field.remove();if(!copied)throw new Error("Chưa copy được danh sách. Vui lòng thử lại.");
}

export function StatementShareControls({bank,selected,batches,busy,onBusyChange,onRecorded}:{bank:BankScope;selected:TransactionSummary[];batches:ShareBatchSummary[];busy:boolean;onBusyChange:(busy:boolean)=>void;onRecorded:()=>void}) {
  const router=useRouter();
  const [notice,setNotice]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [pending,setPending]=useState<string|null>(null);
  const rows:SharedStatementRow[]=selected.map(row=>({id:row.id,transactionDate:row.transactionDate,description:row.description,creditAmount:row.creditAmount,debitAmount:row.debitAmount,campaigns:row.campaign?[row.campaign]:row.allocations.map(allocation=>allocation.campaign),receipt:{campaignName:row.campaign?.name??(row.allocations.length?row.allocations.map(item=>`${item.campaign.name} (${item.amount.toLocaleString("vi-VN")}\u00a0₫)`).join(" · "):"Giao dịch chưa gán thiện pháp"),campaignCode:row.campaign?.code??(row.allocations.length?row.allocations.map(item=>item.campaign.code).join(" · "):bank==="MBBANK"?"mb":"tcb"),transaction:{id:row.id,transactionDate:row.transactionDate,createdAt:row.createdAt,statementRow:row.statementRow,description:row.description,debitAmount:row.debitAmount,creditAmount:row.creditAmount,outflowType:row.outflowType,refundLinks:row.refundLinks.map(link=>({amount:link.amount,transactionDate:link.originalTransaction.transactionDate,description:link.originalTransaction.description}))}}}));
  const [imageSelection,setImageSelection]=useState<StatementImageSelection|null>(null);
  const [lastRecorded,setLastRecorded]=useState<StatementImageSelection|null>(null);
  const hasShared=selected.some(row=>row.shareBatch);
  async function run(key:string,action:()=>Promise<void>) {
    setNotice(null);setError(null);setPending(key);onBusyChange(true);
    try {await action();}catch(caught){setError(caught instanceof Error?caught.message:"Chưa hoàn tất thao tác.");}finally{setPending(null);onBusyChange(false);}
  }
  return <div className="mt-3 space-y-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-sm font-semibold text-sky-950">Gửi danh sách vào nhóm</p><p className="mt-0.5 text-xs leading-5 text-sky-800">Chọn giao dịch → đánh dấu & copy mẫu thông báo → dán vào nhóm kèm ảnh. Nếu chưa gửi, bạn có thể hoàn tác đánh dấu.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy||!rows.length} onClick={()=>setImageSelection({rows,sentAt:new Date().toISOString()})} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 disabled:opacity-50"><ImageIcon className="h-4 w-4"/>Ảnh từng giao dịch đã chọn</button>
        <button type="button" disabled={busy||!rows.length} onClick={()=>void run("copy",async()=>{await copyText(buildShareSummary(bank,rows));setNotice(`Đã copy ${rows.length} giao dịch. Sau khi gửi vào nhóm, hãy bấm Đánh dấu đã gửi.`);})} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 disabled:opacity-50">{pending==="copy"?<Loader2 className="h-4 w-4 animate-spin"/>:<Copy className="h-4 w-4"/>}Copy danh sách đã chọn</button>
        <button type="button" disabled={busy||!rows.length||hasShared} onClick={()=>void run("mark",async()=>{await copyText(buildShareSummary(bank,rows));const saved=await readResponse(await fetch("/api/statement-shares",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bank,transactionIds:rows.map(row=>row.id)})}));setLastRecorded({rows,sentAt:saved.sentAt});setNotice(`Đã đánh dấu và copy mẫu thông báo kèm ${rows.length} giao dịch. Hãy dán vào nhóm kèm ảnh; khoản đến sau vẫn ở Chưa gửi.`);onRecorded();router.refresh();})} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sky-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending==="mark"?<Loader2 className="h-4 w-4 animate-spin"/>:<Check className="h-4 w-4"/>}Đánh dấu đã gửi & copy nội dung</button>
      </div>
    </div>
    {lastRecorded?<button type="button" onClick={()=>setImageSelection(lastRecorded)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800"><ImageIcon className="h-4 w-4"/>Copy ảnh đợt vừa đánh dấu ({lastRecorded.rows.length} giao dịch)</button>:null}
    {imageSelection?<StatementShareImages bank={bank} selection={imageSelection} onClose={()=>setImageSelection(null)}/>:null}
    {hasShared?<p className="text-xs text-amber-800">Trong các khoản đang chọn có giao dịch đã gửi. Chọn bộ lọc Chưa gửi để tạo đợt mới.</p>:null}
    {notice?<p role="status" className="text-xs leading-5 text-emerald-800">{notice}</p>:null}
    {error?<p role="alert" className="text-xs leading-5 text-rose-700">{error}</p>:null}
    {batches.length?<details className="border-t border-sky-100 pt-2"><summary className="cursor-pointer text-xs font-semibold text-sky-900">Lịch sử các đợt gửi gần đây ({batches.length})</summary>
      <ul className="mt-2 divide-y divide-sky-100">{batches.map(batch=><li key={batch.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
        <div><span className="font-medium text-zinc-800">{shareTime(batch.sentAt)} · {batch.transactionCount} giao dịch</span><p className="mt-0.5 text-zinc-500">Thu {batch.totalCredit.toLocaleString("vi-VN")}đ · Chi {batch.totalDebit.toLocaleString("vi-VN")}đ{batch.voidedAt?" · Đã hoàn tác":""}</p></div>
        <div className="flex gap-2"><button type="button" disabled={busy} onClick={()=>void run(batch.id,async()=>{const saved=await readResponse(await fetch(`/api/statement-shares/${batch.id}?bank=${bank}`));await copyText(buildShareSummary(bank,saved.snapshot as SharedStatementRow[],new Date(saved.sentAt)));setNotice("Đã copy đúng danh sách đã lưu của đợt này.");})} className="min-h-9 rounded-md border border-sky-200 bg-white px-2 text-sky-900 disabled:opacity-50">Copy lại</button>
        <button type="button" disabled={busy} onClick={()=>void run(`image-${batch.id}`,async()=>{const saved=await readResponse(await fetch(`/api/statement-shares/${batch.id}?bank=${bank}`));setImageSelection({rows:saved.snapshot as SharedStatementRow[],sentAt:saved.sentAt});})} className="min-h-9 rounded-md border border-sky-200 bg-white px-2 text-sky-900 disabled:opacity-50">Ảnh giao dịch</button>
        {!batch.voidedAt?<button type="button" disabled={busy} onClick={()=>void run(batch.id,async()=>{await readResponse(await fetch(`/api/statement-shares/${batch.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({bank,action:"undo"})}));setNotice("Đã hoàn tác. Các giao dịch của đợt này trở về Chưa gửi.");router.refresh();})} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-zinc-600 disabled:opacity-50"><Undo2 className="h-3 w-3"/>Hoàn tác đánh dấu</button>:null}</div>
      </li>)}</ul>
    </details>:null}
  </div>;
}
