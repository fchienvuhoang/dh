"use client";
import { createContext, useContext, useEffect, useState } from "react";
export const DashboardRefresh = createContext<() => void>(() => {});
export const useDashboardRefresh = () => useContext(DashboardRefresh);

export function useDashboardResource<T>(url: string | null, revision: number, delay = 0, keepPreviousData = false) {
  const key = `${url}:${revision}`;
  const [result, setResult] = useState<{ key: string; url: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(url, { signal: controller.signal, cache: "no-store" }).then(async response => {
        if (response.status === 401) { window.location.assign("/dang-nhap"); throw new Error("Vui lòng đăng nhập lại."); }
        const json = await response.json() as T & { error?: string };
        if (!response.ok) throw new Error(json.error ?? "Chưa tải được dữ liệu. Vui lòng thử lại.");
        if (!controller.signal.aborted) setResult({ key, url, data: json });
      }).catch(error => { if (!controller.signal.aborted) setResult(previous => ({ key, url, data: keepPreviousData && previous?.url === url ? previous.data : undefined, error: error instanceof Error ? error.message : "Chưa tải được dữ liệu." })); });
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [url, key, delay, keepPreviousData]);
  const current = result?.key === key ? result : null;
  return { data: current?.data ?? (keepPreviousData && result?.url === url ? result.data : undefined), error: current?.error, loading: Boolean(url) && !current };
}
