import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DatabaseNotConfiguredError, isTransientDatabaseError } from "@/lib/prisma";

export function apiError(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(
      {
        error: "DATABASE_URL chưa được cấu hình. Hãy tạo PostgreSQL trên Vercel và thêm biến môi trường.",
      },
      { status: 503 },
    );
  }

  if (isTransientDatabaseError(error)) {
    return NextResponse.json(
      { error: "Kết nối database đang bận hoặc phản hồi chậm. Vui lòng đợi một chút rồi thử lại." },
      { status: 503, headers: { "Retry-After": "3" } },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Dữ liệu gửi lên chưa hợp lệ.",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Có lỗi không xác định." }, { status: 500 });
}
