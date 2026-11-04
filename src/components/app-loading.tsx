"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function AppLoading() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-loading" role="status" aria-live="polite" aria-busy="true">
      <Image src="/icons/icon-192.png" alt="" width={80} height={80} priority className="app-loading-logo" />
      <p className="app-loading-title">Dhamma Group</p>
      <span className="app-loading-spinner" aria-hidden="true" />
      <p className="app-loading-caption">Đang tải, xin chờ một chút…</p>
      {slow ? (
        <div>
          <p className="app-loading-caption">Kết nối đang chậm hoặc trang chưa tải được.</p>
          <a href="" className="mt-4 inline-block text-sm text-emerald-700 underline">Tải lại trang</a>
        </div>
      ) : null}
      <noscript><p>Vui lòng bật JavaScript trong trình duyệt để sử dụng ứng dụng.</p></noscript>
    </div>
  );
}
