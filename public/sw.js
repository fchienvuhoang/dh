// Only public launch artwork is cached. Never cache pages, APIs or bank statements.
const LAUNCH_CACHE = "dhamma-launch-v1";
const LAUNCH_ASSETS = ["/icons/icon-192.png", "/splash/iphone-430x932-3.png"];
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(LAUNCH_CACHE);
      await cache.addAll(LAUNCH_ASSETS);
    } catch { /* Installing the worker must not depend on artwork availability. */ }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  if (self.registration.navigationPreload) {
    try { await self.registration.navigationPreload.enable(); } catch { /* Optional optimization. */ }
  }
  await self.clients.claim();
})()));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin === self.location.origin && LAUNCH_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith((async () => {
      try {
        const cached = await caches.match(event.request, { cacheName: LAUNCH_CACHE });
        if (cached) return cached;
      } catch { /* Fall back to the network. */ }
      return fetch(event.request);
    })());
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    try {
      return (await event.preloadResponse) || await fetch(event.request);
    } catch {
      return new Response(
    '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dhamma – Mất kết nối</title><body style="font:18px system-ui;padding:32px"><h1>Chưa có kết nối mạng</h1><p>Kết nối Internet để mở Dhamma và nhập sao kê.</p><button onclick="location.reload()">Thử lại</button></body></html>',
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
      );
    }
  })());
});
