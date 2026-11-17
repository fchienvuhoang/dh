import { headers } from "next/headers";
import { publicBankForHost } from "@/lib/bank-scope";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { donorCampaignData } from "@/lib/donor-campaign";
import { PublicCampaignView } from "@/components/public-campaign-view";
import { getCachedPublicCampaignData, getCachedPublicCampaignMeta } from "@/lib/public-campaign";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await getCachedPublicCampaignMeta(code, publicBankForHost((await headers()).get("host")));

  if (!data || data.bankName !== publicBankForHost((await headers()).get("host"))) {
    return {
      title: "Không tìm thấy thiện pháp",
    };
  }

  return {
    title: `${data.name} | Thiện pháp`,
    description: data.description ?? (data.bankName === "MBBANK" ? `Danh sách hùn phước thiện pháp ${data.code}.` : `Theo dõi thu chi thiện pháp ${data.code}.`),
  };
}

export default async function PublicCampaignPage({ params }: Props) {
  const { code } = await params;
  const data = await getCachedPublicCampaignData(code, publicBankForHost((await headers()).get("host")));

  if (!data || data.bankName !== publicBankForHost((await headers()).get("host"))) {
    notFound();
  }

  return <PublicCampaignView data={donorCampaignData(data)} />;
}
