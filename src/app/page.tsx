import { bankScope } from "@/lib/bank-scope";
import { DashboardShell } from "@/components/dashboard-shell";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ bank?: string }> }) {
  const bank = bankScope((await searchParams).bank);
  return <DashboardShell key={bank} bank={bank} />;
}
