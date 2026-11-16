import { bankScope } from "@/lib/bank-scope";
import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardState } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ bank?: string }> }) {
  const state = await getDashboardState(bankScope((await searchParams).bank));

  return <DashboardShell key={bankScope((await searchParams).bank)} state={state} />;
}
