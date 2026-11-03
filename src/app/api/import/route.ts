import { NextResponse } from "next/server";
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
      return NextResponse.json({ error: "Vui lòng chọn file Excel hoặc PDF sao kê." }, { status: 400 });
    }

    if (!/\.(xlsx|xls|pdf)$/i.test(file.name)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ Excel (.xlsx, .xls) và PDF. Nếu file là ZIP, hãy giải nén trong ứng dụng Tệp trước." }, { status: 400 });
    }
    if (!file.size || file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Vui lòng chọn file có dữ liệu và không quá 4 MB." }, { status: 400 });
    }
    const password = formData.get("password");

    const buffer = Buffer.from(await file.arrayBuffer());
    if (/\.pdf$/i.test(file.name) && !buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
      return NextResponse.json({ error: "File không phải PDF hợp lệ." }, { status: 400 });
    }
    const result = await importTechcombankStatement(file.name, buffer, uploadedAt, typeof password === "string" ? password : undefined);
    const affectedCodes = invalidatePublicCampaignCache(result.affectedCampaignCodes);
    await warmPublicCampaignCaches(affectedCodes);

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
