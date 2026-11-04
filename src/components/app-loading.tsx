import Image from "next/image";

export function AppLoading() {
  return (
    <div className="app-loading" role="status" aria-live="polite" aria-busy="true">
      <Image src="/icons/icon-192.png" alt="" width={80} height={80} priority className="app-loading-logo" />
      <p className="app-loading-title">Dhamma Group</p>
      <span className="app-loading-spinner" aria-hidden="true" />
      <p className="app-loading-caption">Đang tải, xin chờ một chút…</p>
    </div>
  );
}
