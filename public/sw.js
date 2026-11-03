// Bank statements and authenticated pages are never stored in Cache Storage.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dhamma – Mất kết nối</title><body style="font:18px system-ui;padding:32px"><h1>Chưa có kết nối mạng</h1><p>Kết nối Internet để mở Dhamma và nhập sao kê.</p><button onclick="location.reload()">Thử lại</button></body></html>',
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )));
});
