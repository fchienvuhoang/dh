import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { publicBankForHost } from "@/lib/bank-scope";
import { activeBankTransactionWhere, getBankLedger } from "@/lib/bank-ledger";
import { decimalToNumber } from "@/lib/money";
import { getPrisma, withDatabaseReadRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Đối chiếu tài khoản Metta",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function MettaAccountReport() {
  if (publicBankForHost((await headers()).get("host")) !== "MBBANK") notFound();
  const [ledger, where] = await Promise.all([
    getBankLedger("MBBANK"), activeBankTransactionWhere("MBBANK"),
  ]);
  const sums = await withDatabaseReadRetry(() => getPrisma().bankTransaction.aggregate({
    where, _sum: { creditAmount: true, debitAmount: true }, _count: true,
  }));
  const income = decimalToNumber(sums._sum.creditAmount);
  const expenses = decimalToNumber(sums._sum.debitAmount);
  const opening = ledger ? Number(ledger.openingBalance) : 0;
  const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;
  return (
    <main className="min-h-screen bg-[#f8faf7] px-4 py-8 text-emerald-950 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-medium text-emerald-700">Metta · Đối chiếu nội bộ</p>
          <h1 className="mt-2 text-2xl font-semibold">Tài khoản MB</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {ledger ? `Theo dõi từ ${ledger.trackingFrom.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : "Toàn bộ giao dịch đã nhập"}
            {` · ${sums._count.toLocaleString("vi-VN")} giao dịch`}
          </p>
        </header>
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Thu chi tài khoản MB">
          {[
            ["Số dư chuyển sang", opening], ["Tổng thu", income],
            ["Tổng chi (gồm hoàn lại và phí)", expenses], ["Hiện còn", opening + income - expenses],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-600">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{money(Number(value))}</p>
            </div>
          ))}
        </section>
        <p className="text-sm text-zinc-500">Số tiền hiện còn được tính từ số dư chuyển sang + tổng thu − tổng chi của sao kê đã nhập, bao gồm cả giao dịch chưa gán thiện pháp.</p>
      </div>
    </main>
  );
}
