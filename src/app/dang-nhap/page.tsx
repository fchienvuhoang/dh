import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { isAdminPasswordConfigured, safeRedirectPath } from "@/lib/auth";
import { googleAuthConfigured } from "@/lib/google-auth";

type Props = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const nextPath = safeRedirectPath(next);
  const googleConfigured = googleAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-4 py-8 text-zinc-950">
      <section className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-zinc-100 p-2 text-zinc-700">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Đăng nhập quản trị</h1>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Đăng nhập để nhập sao kê và quản lý thiện pháp.
            </p>
          </div>
        </div>

        {error ? <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error === "google_access_denied" ? "Tài khoản Google này chưa được cấp quyền quản trị." : "Không đăng nhập được bằng Google. Vui lòng thử lại."}</p> : null}
        {googleConfigured ? (
          <a href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`} className="mt-5 flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm font-medium hover:bg-zinc-50">Đăng nhập bằng Google</a>
        ) : null}
        {googleConfigured && isAdminPasswordConfigured() ? <p className="mt-4 text-center text-xs text-zinc-500">Hoặc dùng mật khẩu quản trị</p> : null}
        {isAdminPasswordConfigured() || !googleConfigured ? <LoginForm authConfigured={isAdminPasswordConfigured()} nextPath={nextPath} /> : null}
      </section>
    </main>
  );
}
