import type { Metadata } from "next";
import { headers } from "next/headers";
import { publicBankForHost } from "@/lib/bank-scope";

export async function generateMetadata(): Promise<Metadata> {
  if (publicBankForHost((await headers()).get("host")) !== "MBBANK") return {};
  return {
    applicationName: "Metta",
    title: { default: "Thiện pháp Metta", template: "%s · Metta" },
    icons: { icon: "/metta-icon.svg", apple: [] },
    appleWebApp: { title: "Metta" },
  };
}

export default function PublicCampaignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
