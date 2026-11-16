import { headers } from "next/headers";
import { publicBankForHost } from "@/lib/bank-scope";
import type { Metadata } from "next";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { TransferSyntax } from "@/components/transfer-syntax";
import { getCachedActivePublicCampaigns } from "@/lib/public-campaign";

export const metadata: Metadata = {
  title: "Các thiện pháp đang thực hiện",
  description: "Danh sách các thiện pháp đang được nhóm thực hiện.",
};

export default async function ActiveCampaignsPage() {
  const bank = publicBankForHost((await headers()).get("host"));
  const campaigns = await getCachedActivePublicCampaigns(bank);

  return (
    <div className={`min-h-screen text-zinc-950 ${bank === "MBBANK" ? "bg-[#f8faf7]" : "bg-[#fcf9fa]"}`}>
      <header className={`border-b ${bank === "MBBANK" ? "border-emerald-100 bg-gradient-to-br from-emerald-50 to-[#faf6ed]" : "border-[#ecdae3] bg-gradient-to-br from-[#f6eaf1] to-[#fffaf5]"}`}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700">
            <HeartHandshake className="h-4 w-4" />
            {bank === "MBBANK" ? "Thiện pháp Metta" : "Thiện pháp Dhamma"}
          </div>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            Các thiện pháp đang thực hiện
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {campaigns.length.toLocaleString("vi-VN")} thiện pháp đang chạy
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
        {campaigns.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((campaign) => (
              <article
                key={campaign.code}
                className="flex min-w-0 flex-col rounded-xl border border-zinc-200/80 bg-white p-4 shadow-[0_4px_20px_#00000003] transition hover:border-zinc-300 hover:shadow-md sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    Đang chạy
                  </span>
                </div>

                <h2 className="mt-4 break-words text-base font-semibold leading-6 text-zinc-950">
                  {campaign.name}
                </h2>
                {campaign.description ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-600">
                    {campaign.description}
                  </p>
                ) : null}

                <TransferSyntax code={campaign.code} />

                <a
                  href={`/thien-phap/${campaign.code}`}
                  className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition sm:w-fit sm:self-start ${bank === "MBBANK" ? "bg-[#235b4b] hover:bg-[#194333]" : "bg-[#4c173b] hover:bg-[#6a2d54]"}`}
                >
                  Xem thiện pháp
                  <ArrowRight className="h-4 w-4" />
                </a>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-md border border-zinc-200 bg-white px-4 py-12 text-center">
            <HeartHandshake className="mx-auto h-6 w-6 text-zinc-400" />
            <p className="mt-3 text-sm text-zinc-500">Hiện chưa có thiện pháp nào đang chạy.</p>
          </section>
        )}
      </main>
    </div>
  );
}
