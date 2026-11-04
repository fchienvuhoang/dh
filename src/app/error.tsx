"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Chưa tải được trang</h1>
      <p className="text-sm text-zinc-600">Vui lòng kiểm tra kết nối Internet và thử lại.</p>
      <button onClick={reset} className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white">Thử lại</button>
      <a href="" className="text-sm text-emerald-700 underline">Tải lại toàn bộ trang</a>
    </main>
  );
}
