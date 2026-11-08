// Never substitute cached Next.js documents or runtime code during navigation.
// A launch document from another deployment can trigger a hard-reload loop.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  if (self.registration.navigationPreload) {
    try { await self.registration.navigationPreload.disable(); } catch { /* Optional API. */ }
  }
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith("dhamma-launch-")).map((name) => caches.delete(name)));
  await self.clients.claim();
  // Only the obsolete launch screen is safe to navigate automatically: it has
  // no editable data. Leave all other open pages and forms untouched.
  const clients = await self.clients.matchAll({ type: "window" });
  await Promise.all(clients.filter((client) => new URL(client.url).pathname === "/khoi-dong")
    .map((client) => client.navigate("/").catch(() => {})));
})()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dhamma – Mất kết nối</title><body style="font:18px system-ui;padding:32px;background:#f7f7f4"><h1>Chưa có kết nối mạng</h1><p>Kết nối Internet để mở Dhamma.</p><button onclick="location.reload()">Thử lại</button></body></html>',
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )));
});
