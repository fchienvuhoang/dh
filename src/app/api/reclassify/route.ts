import { bankScope } from "@/lib/bank-scope";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { reclassifyImportedTransactions } from "@/lib/importer";
import {
  invalidatePublicCampaignCache,
  warmPublicCampaignCaches,
} from "@/lib/public-campaign";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await reclassifyImportedTransactions(bankScope(new URL(request.url).searchParams.get("bank")));
    const affectedCodes = invalidatePublicCampaignCache(result.affectedCampaignCodes);
    await warmPublicCampaignCaches(affectedCodes);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
