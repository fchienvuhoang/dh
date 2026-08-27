"use client";

import { CircleCheck, Info, Link2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PublicCampaignData, PublicCampaignTransaction } from "@/lib/public-campaign";
import { normalizeTransferText } from "@/lib/text";

const statusLabels = {
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn tất",
};

const statusClassNames = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function PublicCampaignView({ data }: { data: PublicCampaignData }) {
  const [query, setQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<PublicCampaignTransaction | null>(null);
  const normalizedQuery = normalizeTransferText(query);

  const filteredTransactions = useMemo(() => {
    if (!normalizedQuery) {
      return [...data.transactions].sort(compareTransactionNewestFirst);
    }

    return data.transactions.filter((transaction) => {
      return normalizeTransferText(
        `${transaction.description} ${transaction.refundLinks.map((link) => link.description).join(" ")}`,
      ).includes(normalizedQuery);
    }).sort(compareTransactionNewestFirst);
  }, [data.transactions, normalizedQuery]);

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-zinc-950 px-2 py-1 font-mono text-xs font-medium text-white">
              {data.code}
            </span>
            <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClassNames[data.status]}`}>
              {statusLabels[data.status]}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
            {data.name}
          </h1>
          {data.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{data.description}</p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <PublicStat label="Hùn phước sau hoàn lại" value={money(data.income)} tone="emerald" />
            <PublicStat label="Đã cúng dường" value={money(data.expenses)} tone="amber" />
            <PublicStat label="Đã hoàn lại" value={money(data.refunds)} tone="amber" />
            <PublicStat label="Tịnh tài còn lại" value={money(data.balance)} />
            <PublicStat label="Lượt hùn phước" value={data.transactionCount.toLocaleString("vi-VN")} />
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-zinc-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
            <p>
              Hoàn lại là những khoản chuyển trả cho thí chủ để thí chủ tác ý lại,
              hoặc do thí chủ chuyển nhầm thiện pháp nên được hoàn lại.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6">
        <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Danh sách giao dịch</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {filteredTransactions.length.toLocaleString("vi-VN")} / {data.transactions.length.toLocaleString("vi-VN")} giao dịch
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên hoặc nội dung"
                className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2 md:hidden">
            {filteredTransactions.map((transaction) => (
              <PublicTransactionCard
                key={transaction.id}
                transaction={transaction}
                onViewDetails={() => setSelectedTransaction(transaction)}
              />
            ))}
            {filteredTransactions.length === 0 ? <EmptyState /> : null}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-md border border-zinc-200 md:block">
            <div className="max-h-[680px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Ngày</th>
                    <th className="px-3 py-2">Nội dung chuyển khoản</th>
                    <th className="px-3 py-2">Loại</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                    <th className="px-3 py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {filteredTransactions.map((transaction) => (
                    <PublicTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onViewDetails={() => setSelectedTransaction(transaction)}
                    />
                  ))}
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {selectedTransaction ? (
        <TransactionReceiptModal
          campaignName={data.name}
          campaignCode={data.code}
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      ) : null}
    </div>
  );
}

function PublicTransactionCard({
  transaction,
  onViewDetails,
}: {
  transaction: PublicCampaignTransaction;
  onViewDetails: () => void;
}) {
  const meta = transactionMeta(transaction);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-500">{dateOnly(transaction.transactionDate)}</div>
          <div className={`mt-1 inline-flex rounded-md border px-2 py-1 text-xs font-medium ${meta.className}`}>
            {meta.label}
          </div>
        </div>
        <div className={`whitespace-nowrap text-right text-sm font-semibold ${meta.amountClassName}`}>
          {money(meta.amount)}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
        {transaction.description}
      </p>
      <RefundRelationship transaction={transaction} />
      <button
        type="button"
        onClick={onViewDetails}
        className="mt-3 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
      >
        Xem chi tiết
      </button>
    </article>
  );
}

function PublicTransactionRow({
  transaction,
  onViewDetails,
}: {
  transaction: PublicCampaignTransaction;
  onViewDetails: () => void;
}) {
  const meta = transactionMeta(transaction);

  return (
    <tr className="hover:bg-zinc-50">
      <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-600">{dateOnly(transaction.transactionDate)}</td>
      <td className="max-w-2xl px-3 py-2 align-top">
        <div className="whitespace-pre-wrap break-words font-medium text-zinc-900">{transaction.description}</div>
        <RefundRelationship transaction={transaction} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top">
        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </td>
      <td className={`whitespace-nowrap px-3 py-2 text-right align-top font-semibold ${meta.amountClassName}`}>
        {money(meta.amount)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right align-top">
        <button
          type="button"
          onClick={onViewDetails}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          Chi tiết
        </button>
      </td>
    </tr>
  );
}

function TransactionReceiptModal({
  campaignName,
  campaignCode,
  transaction,
  onClose,
}: {
  campaignName: string;
  campaignCode: string;
  transaction: PublicCampaignTransaction;
  onClose: () => void;
}) {
  const meta = transactionMeta(transaction);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-receipt-title"
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-emerald-900/10 bg-[#fffdf7] shadow-2xl"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-10 top-20 rotate-[-18deg] select-none text-center text-emerald-900/[0.045]">
            <Sparkles className="mx-auto h-36 w-36 stroke-[0.8]" />
            <div className="mt-1 text-xl font-bold tracking-[0.32em]">CÁC CHƯ THIÊN</div>
          </div>
          <div className="absolute -bottom-8 -left-8 rotate-12 select-none text-emerald-900/[0.035]">
            <Sparkles className="h-40 w-40 stroke-[0.7]" />
          </div>
        </div>

        <div className="relative p-5 sm:p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết giao dịch"
            className="absolute right-3 top-3 rounded-full bg-white/80 p-2 text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-9 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CircleCheck className="h-6 w-6" />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Chi tiết giao dịch
            </p>
            <h2 id="transaction-receipt-title" className="mt-1 text-lg font-semibold leading-6 text-zinc-950">
              {campaignName}
            </h2>
            <p className="mt-1 font-mono text-xs text-zinc-500">{campaignCode}</p>
          </div>

          <div className="my-5 border-t border-dashed border-zinc-300" />

          <div className="text-center">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
              {meta.label}
            </span>
            <div className={`mt-2 text-3xl font-bold tracking-tight ${meta.amountClassName}`}>
              {money(meta.amount)}
            </div>
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <ReceiptRow label="Ngày giao dịch" value={dateOnly(transaction.transactionDate)} />
            <div>
              <dt className="text-xs text-zinc-500">Nội dung chuyển khoản</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words font-medium leading-6 text-zinc-900">
                {transaction.description}
              </dd>
            </div>
          </dl>

          <RefundRelationship transaction={transaction} />

          <div className="mt-6 border-t border-dashed border-zinc-300 pt-4 text-center text-[11px] leading-5 text-zinc-500">
            Thông tin được trích từ danh sách giao dịch công khai
          </div>
        </div>
      </section>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5">
      <dt className="shrink-0 text-xs text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

function RefundRelationship({ transaction }: { transaction: PublicCampaignTransaction }) {
  const linkedAmount = transaction.refundLinks.reduce((sum, link) => sum + link.amount, 0);
  const isIncoming = transaction.creditAmount > 0;

  if (isIncoming && linkedAmount <= 0) {
    return null;
  }
  if (!isIncoming && transaction.outflowType !== "REFUND") {
    return null;
  }

  const fullyRefunded = isIncoming &&
    Math.round(linkedAmount * 100) >= Math.round(transaction.creditAmount * 100);

  return (
    <div className={`mt-2 border-l-2 pl-2.5 text-xs leading-5 ${
      fullyRefunded ? "border-rose-400 text-rose-700" : "border-violet-300 text-violet-700"
    }`}>
      <div className="flex items-center gap-1.5 font-semibold">
        {fullyRefunded ? <CircleCheck className="h-3.5 w-3.5 shrink-0" /> : <Link2 className="h-3.5 w-3.5 shrink-0" />}
        {isIncoming
          ? fullyRefunded
            ? `Đã hoàn hết ${money(linkedAmount)}`
            : `Đã hoàn ${money(linkedAmount)} / ${money(transaction.creditAmount)}`
          : linkedAmount > 0
            ? `Đã liên kết ${money(linkedAmount)} / ${money(transaction.debitAmount)}`
            : "Chưa liên kết khoản nhận"}
      </div>
      {transaction.refundLinks.length > 0 ? (
        <ul className="mt-1 space-y-1 text-zinc-600">
          {transaction.refundLinks.map((link, index) => (
            <li key={`${link.transactionDate}-${link.amount}-${index}`} className="break-words">
              {isIncoming ? "Hoàn ngày" : "Hoàn cho khoản nhận ngày"} {dateOnly(link.transactionDate)}: {link.description} ({money(link.amount)})
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return <div className="px-3 py-10 text-center text-sm text-zinc-500">Không có giao dịch phù hợp.</div>;
}

function PublicStat({ label, value, tone = "zinc" }: { label: string; value: string; tone?: "zinc" | "emerald" | "amber" }) {
  const color = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-zinc-950";

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function transactionMeta(transaction: PublicCampaignTransaction) {
  if (transaction.creditAmount > 0) {
    return {
      label: "Hùn phước",
      amount: transaction.creditAmount,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      amountClassName: "text-emerald-700",
    };
  }

  if (transaction.outflowType === "REFUND") {
    return {
      label: "Hoàn lại",
      amount: transaction.debitAmount,
      className: "border-violet-200 bg-violet-50 text-violet-700",
      amountClassName: "text-violet-700",
    };
  }

  return {
    label: "Cúng dường",
    amount: transaction.debitAmount,
    className: "border-amber-200 bg-amber-50 text-amber-700",
    amountClassName: "text-amber-700",
  };
}

function compareTransactionNewestFirst(left: PublicCampaignTransaction, right: PublicCampaignTransaction) {
  const dateDifference = new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime();
  if (dateDifference !== 0) {
    return dateDifference;
  }

  const createdAtDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return (right.statementRow ?? 0) - (left.statementRow ?? 0);
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateOnly(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
