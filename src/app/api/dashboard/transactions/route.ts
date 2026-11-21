import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getTransactionPage } from "@/lib/dashboard-transactions";
const schema = z.object({ bank: z.enum(["TECHCOMBANK", "MBBANK"]), campaign: z.string().max(200).default("all"), q: z.string().max(300).default(""), share: z.enum(["all", "shared", "unshared"]).default("all"), kind: z.enum(["all", "debit"]).default("all"), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50) });
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const query = schema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json(await getTransactionPage(query), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
