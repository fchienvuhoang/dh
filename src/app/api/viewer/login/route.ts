import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import {
  READONLY_SESSION_COOKIE,
  createReadonlySessionToken,
  getReadonlySessionMaxAge,
  isReadonlyViewConfigured,
  verifyReadonlyPassword,
  verifyReadonlyViewToken,
} from "@/lib/auth";

const loginSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    if (!isReadonlyViewConfigured()) {
      return NextResponse.json({ error: "Trang báo cáo chưa được cấu hình." }, { status: 503 });
    }

    const body = loginSchema.parse(await request.json());
    if (!verifyReadonlyViewToken(body.token) || !verifyReadonlyPassword(body.password)) {
      return NextResponse.json({ error: "Đường dẫn hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, next: `/bao-cao/${body.token}` });
    response.cookies.set(READONLY_SESSION_COOKIE, await createReadonlySessionToken(), {
      httpOnly: true,
      maxAge: getReadonlySessionMaxAge(),
      path: "/bao-cao",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
