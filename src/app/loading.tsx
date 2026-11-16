import { AppLoading } from "@/components/app-loading";
import { headers } from "next/headers";
import { publicBankForHost } from "@/lib/bank-scope";

export default async function Loading() {
  const isMetta = publicBankForHost((await headers()).get("host")) === "MBBANK";
  return <AppLoading branded={!isMetta} />;
}
