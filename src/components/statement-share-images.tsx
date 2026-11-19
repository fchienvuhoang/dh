"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Loader2, X } from "lucide-react";
import type { BankScope } from "@/lib/bank-scope";
import type { SharedStatementRow } from "@/lib/statement-sharing";
import { createStatementImages } from "@/lib/statement-share-image";

type ExportImage = { blob: Blob; url: string };
export type StatementImageSelection = { rows: SharedStatementRow[]; sentAt: string };

export function StatementShareImages({ bank, selection, onClose }: { bank: BankScope; selection: StatementImageSelection; onClose: () => void }) {
  const [images, setImages] = useState<ExportImage[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copying, setCopying] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    createStatementImages(bank, selection.rows, selection.sentAt).then(blobs => {
      if (cancelled) return;
      const result = blobs.map(blob => { const url = URL.createObjectURL(blob); urls.push(url); return { blob, url }; });
      setImages(result);
    }).catch(() => { if (!cancelled) setError("Chưa tạo được ảnh. Đóng và mở lại để thử lại."); });
    return () => { cancelled = true; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [bank, selection]);
  useEffect(() => {
    const original = document.activeElement;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (original instanceof HTMLElement) original.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Ảnh các giao dịch đã chọn" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-zinc-900">Ảnh các giao dịch đã chọn</h2><button autoFocus type="button" aria-label="Đóng ảnh giao dịch" onClick={onClose} className="rounded-full p-3"><X className="h-5 w-5"/></button></div>
      <p className="my-2 text-sm text-zinc-600">Copy ảnh rồi mở Zalo để dán. Copy ảnh sẽ thay nội dung chữ trong bộ nhớ tạm; bạn có thể copy lại mẫu từ lịch sử đợt gửi.</p>
      {notice ? <p role="status" className="my-2 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p role="alert" className="my-2 text-sm text-rose-700">{error}</p> : null}
      {!images.length && !error ? <p className="flex items-center gap-2 py-6 text-sm"><Loader2 className="h-4 w-4 animate-spin"/>Đang tạo ảnh…</p> : null}
      {images.map((image, index) => <div key={image.url} className="mt-3">
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" disabled={copying !== null} onClick={async () => {
            setError(""); setNotice(""); setCopying(index);
            try {
              if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error();
              await navigator.clipboard.write([new ClipboardItem({ "image/png": image.blob })]);
              setNotice(`Đã copy ảnh ${index + 1}. Mở Zalo và chọn Dán để gửi.`);
            } catch { setError("Thiết bị chưa cho phép copy ảnh. Bạn có thể bấm Tải ảnh rồi gửi ảnh trong Zalo."); }
            finally { setCopying(null); }
          }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white disabled:opacity-50">{copying === index ? <Loader2 className="h-4 w-4 animate-spin"/> : <Copy className="h-4 w-4"/>}Copy ảnh{images.length > 1 ? ` ${index + 1}/${images.length}` : ""}</button>
          <a href={image.url} download={`giao-dich-${bank.toLowerCase()}-${index + 1}.png`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-semibold"><Download className="h-4 w-4"/>Tải ảnh</a>
        </div>
        {/* Blob preview stays local to the browser and needs no image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={`Giao dịch đã chọn, ảnh ${index + 1}/${images.length}`} className="h-auto w-full rounded-lg border border-zinc-200"/>
      </div>)}
    </section>
  </div>;
}
