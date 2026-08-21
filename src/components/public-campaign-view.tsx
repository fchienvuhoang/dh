"use client";

import { CircleCheck, HeartHandshake, Info, Landmark, Link2, Search } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { PublicCampaignData, PublicCampaignTransaction } from "@/lib/public-campaign";
import { normalizeTransferText } from "@/lib/text";

const statusLabels = {
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn tất",
};

const statusClassNames = {
  ACTIVE: "border-[#9fc9bb] bg-[#eef8f4] text-[#256957]",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function PublicCampaignView({ data }: { data: PublicCampaignData }) {
  const [query, setQuery] = useState("");
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
    <div className="min-h-screen bg-[#f2f6f4] text-[#172522]">
      <header
        className="public-campaign-hero relative isolate overflow-hidden border-b border-[#d4c07b] bg-[#e8f0ed] bg-cover bg-center"
      >
        <Image
          src="/assets/dhamma-celestial-hero-mobile.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 767px) 100vw, 1px"
          className="object-cover object-top md:hidden"
        />
        <Image
          src="/assets/dhamma-celestial-hero.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 100vw, 1px"
          className="hidden object-cover object-center md:block"
        />
        <div className="absolute inset-0 bg-[#f8fbf9]/55 sm:bg-[#f8fbf9]/75" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9 lg:py-12">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] lg:gap-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#d7bd64] bg-[#164b42] text-[#f7e7a8] shadow-sm">
                  <Landmark className="h-6 w-6" />
                </span>
                <span className="rounded-md bg-[#164b42] px-3 py-1.5 font-mono text-xs font-semibold text-white">
                  Thiện pháp {data.code}
                </span>
                <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${statusClassNames[data.status]}`}>
                  {statusLabels[data.status]}
                </span>
              </div>

              <p className="mt-6 text-xs font-bold uppercase text-[#8a6b1f] sm:text-sm">
                DĀNA
              </p>
              <h1 className="mt-2 max-w-3xl break-words rounded-lg border border-white/80 bg-white/72 px-4 py-3 text-3xl font-bold leading-tight text-[#123f38] shadow-[0_10px_28px_rgba(20,63,56,0.12)] backdrop-blur-md sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-4xl sm:shadow-none sm:backdrop-blur-none">
                {data.name}
              </h1>
              {data.description ? (
                <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-[#465c57] sm:text-base">
                  {data.description}
                </p>
              ) : null}
            </div>

            <section className="overflow-hidden rounded-lg border border-[#c9ad52] bg-white/95 shadow-lg shadow-[#143e35]/10" aria-label="Tổng quan tịnh tài">
              <div className="bg-[#143f38] px-5 py-5 text-white sm:px-6">
                <p className="text-xs font-semibold uppercase text-[#e7d493]">Tịnh tài hiện còn</p>
                <p className="mt-2 break-words text-3xl font-bold leading-tight sm:text-4xl">{money(data.balance)}</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-[#eadca9]">
                <SummaryStat label="Hùn phước sau hoàn lại" value={money(data.income)} tone="jade" />
                <SummaryStat label="Đã cúng dường" value={money(data.expenses)} tone="gold" />
                <SummaryStat label="Đã hoàn lại" value={money(data.refunds)} tone="gold" />
                <SummaryStat label="Lượt hùn phước" value={data.transactionCount.toLocaleString("vi-VN")} tone="dark" />
              </div>
            </section>
          </div>

          <div className="mt-5 flex max-w-3xl items-start gap-2 border-l-2 border-[#b9942e] pl-3 text-xs leading-5 text-[#405651]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a6b1f]" />
            <p>
              Hoàn lại là những khoản chuyển trả cho thí chủ để thí chủ tác ý lại,
              hoặc do thí chủ chuyển nhầm thiện pháp nên được hoàn lại.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        <section className="rounded-lg border border-[#f0dfaa] bg-white p-3 shadow-[0_10px_30px_rgba(181,137,25,0.08)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e6a817] text-white shadow-sm">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-6 text-[#173f37]">
                  Phương danh thí chủ hùn phước
                </h2>
                <p className="mt-1 text-xs text-[#6c736e]">
                  {filteredTransactions.length.toLocaleString("vi-VN")} / {data.transactions.length.toLocaleString("vi-VN")} giao dịch công khai
                </p>
              </div>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8e8c83]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo phương danh hoặc nội dung"
                className="min-h-10 w-full rounded-md border border-[#efd27a] bg-[#fffef9] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#e6a817] focus:ring-2 focus:ring-[#fff0b8]"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3 md:hidden">
            {filteredTransactions.map((transaction, index) => (
              <PublicTransactionCard key={transaction.id} transaction={transaction} index={index + 1} />
            ))}
            {filteredTransactions.length === 0 ? <EmptyState /> : null}
          </div>

          <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#f0dfaa] md:block">
            <div className="max-h-[720px] overflow-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="sticky top-0 bg-[#fff8dc] text-xs uppercase text-[#5d5a50]">
                  <tr>
                    <th className="px-4 py-3">Ngày</th>
                    <th className="px-4 py-3">Phương danh thí chủ hùn phước</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4ecd3] bg-white">
                  {filteredTransactions.map((transaction) => (
                    <PublicTransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
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
    </div>
  );
}

function PublicTransactionCard({
  transaction,
  index,
}: {
  transaction: PublicCampaignTransaction;
  index: number;
}) {
  const meta = transactionMeta(transaction);

  return (
    <article className="overflow-hidden rounded-lg border border-[#f0d377] bg-white shadow-[0_6px_18px_rgba(205,151,13,0.09)]">
      <div className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-[#f3dfa0] p-3 ${meta.cardHeaderClassName}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f1c952] bg-[#fffdf5] text-sm font-bold text-[#c47d00] shadow-sm">
          {index.toLocaleString("vi-VN")}
        </span>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#6c6a61]">{dateOnly(transaction.transactionDate)}</div>
            <div className={`mt-1 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${meta.className}`}>
              {meta.label}
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-[#f0d377] bg-white px-3 py-2 text-right shadow-[0_3px_10px_rgba(205,151,13,0.1)]">
            <span className={`whitespace-nowrap text-sm font-bold ${meta.amountClassName}`}>
              {money(meta.amount)}
            </span>
          </div>
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words px-3 py-4 text-sm font-semibold leading-6 text-[#202522]">
        {transaction.description}
      </p>
      <div className="px-3 pb-3">
        <RefundRelationship transaction={transaction} />
      </div>
    </article>
  );
}

function PublicTransactionRow({ transaction }: { transaction: PublicCampaignTransaction }) {
  const meta = transactionMeta(transaction);

  return (
    <tr className="transition-colors hover:bg-[#fffdf4]">
      <td className="whitespace-nowrap px-4 py-3 align-top text-[#676b67]">{dateOnly(transaction.transactionDate)}</td>
      <td className="max-w-2xl px-4 py-3 align-top">
        <div className="whitespace-pre-wrap break-words font-semibold text-[#222724]">{transaction.description}</div>
        <RefundRelationship transaction={transaction} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </td>
      <td className={`whitespace-nowrap px-4 py-3 text-right align-top font-bold ${meta.amountClassName}`}>
        {money(meta.amount)}
      </td>
    </tr>
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
  return <div className="px-3 py-10 text-center text-sm text-[#73756f]">Không có giao dịch phù hợp.</div>;
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "jade" | "gold" | "dark";
}) {
  const color = tone === "jade" ? "text-[#246b58]" : tone === "gold" ? "text-[#8b6713]" : "text-[#183d36]";

  return (
    <div className="min-w-0 bg-[#fffdf8] px-4 py-3 sm:px-5 sm:py-4">
      <div className="text-xs leading-5 text-[#6f716b]">{label}</div>
      <div className={`mt-1 break-words text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}

function transactionMeta(transaction: PublicCampaignTransaction) {
  if (transaction.creditAmount > 0) {
    return {
      label: "Hùn phước",
      amount: transaction.creditAmount,
      className: "border-[#8be0c1] bg-[#eafff7] text-[#08785c]",
      amountClassName: "text-[#d88b00]",
      cardHeaderClassName: "bg-[#fffdf5]",
    };
  }

  if (transaction.outflowType === "REFUND") {
    return {
      label: "Hoàn lại",
      amount: transaction.debitAmount,
      className: "border-violet-200 bg-violet-50 text-violet-700",
      amountClassName: "text-violet-700",
      cardHeaderClassName: "bg-violet-50",
    };
  }

  return {
    label: "Cúng dường",
    amount: transaction.debitAmount,
    className: "border-amber-200 bg-amber-50 text-amber-700",
    amountClassName: "text-amber-700",
    cardHeaderClassName: "bg-amber-50",
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
