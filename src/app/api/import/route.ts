import { NextResponse } from "next/server";
import { prepareStatementUpload } from "@/lib/statement-upload";
import { apiError } from "@/lib/api";
import { importTechcombankStatement } from "@/lib/importer";
import {
  invalidatePublicCampaignCache,
  warmPublicCampaignCaches,
} from "@/lib/public-campaign";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const uploadedAt = new Date();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Vui lòng chọn file Excel, PDF hoặc ZIP sao kê." }, { status: 400 });
    }

    if (!/\.(xlsx|xls|pdf|zip)$/i.test(file.name)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ Excel (.xlsx, .xls), PDF và ZIP chứa PDF." }, { status: 400 });
    }
    if (!file.size || file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Vui lòng chọn file có dữ liệu và không quá 4 MB." }, { status: 400 });
    }
    const password = formData.get("password");

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadPassword = typeof password === "string" ? password : undefined;
    const prepared = await prepareStatementUpload(file.name, buffer, process.env.ZIP_PASS);
    const result = await importTechcombankStatement(prepared.fileName, prepared.buffer, uploadedAt, uploadPassword);
    const affectedCodes = invalidatePublicCampaignCache(result.affectedCampaignCodes);
    await warmPublicCampaignCaches(affectedCodes);

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
