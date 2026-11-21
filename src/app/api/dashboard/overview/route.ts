import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getDashboardState } from "@/lib/dashboard";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const bank = z.enum(["TECHCOMBANK", "MBBANK"]).parse(new URL(request.url).searchParams.get("bank"));
    const state = await getDashboardState(bank);
    if (!state.ok) return NextResponse.json({ error: "Chưa tải được dữ liệu tổng quan. Vui lòng thử lại." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json(state.data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
