import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function worker(failNetwork = false) {
  const handlers = {}, removed = [], navigated = [];
  const self = {
    addEventListener: (name, handler) => handlers[name] = handler,
    skipWaiting: async () => {},
    registration: { navigationPreload: { disable: async () => {} } },
    clients: { claim: async () => {}, matchAll: async () => [
      { url: "https://dhamma.example/khoi-dong", navigate: async (path) => navigated.push(["launch", path]) },
      { url: "https://dhamma.example/", navigate: async (path) => navigated.push(["dashboard", path]) },
    ] },
  };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self, URL, Response,
    caches: { keys: async () => ["dhamma-launch-old", "other-application"], delete: async (name) => removed.push(name) },
    fetch: async () => { if (failNetwork) throw new Error("offline"); return new Response("current network document"); },
  });
  return { handlers, removed, navigated, fetch: async (path, mode = "navigate") => {
    let response;
    handlers.fetch({ request: { method: "GET", mode, url: `https://dhamma.example${path}` }, respondWith: (promise) => response = promise });
    return response;
  } };
}

test("root and launch navigations always use the current server document, never redirect to a cached shell", async () => {
  const w = worker();
  for (const path of ["/", "/?pwa_recovery=1", "/khoi-dong", "/dang-nhap"]) {
    const response = await w.fetch(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(await response.text(), "current network document");
  }
});

test("activation clears obsolete launch caches and releases only stuck launch pages", async () => {
  const w = worker(); let activation;
  w.handlers.activate({ waitUntil: (promise) => activation = promise }); await activation;
  assert.deepEqual(w.removed, ["dhamma-launch-old"]);
  assert.deepEqual(w.navigated, [["launch", "/"]]);
});

test("API and runtime requests bypass the worker, offline navigation shows a manual retry", async () => {
  const w = worker(true);
  assert.equal(await w.fetch("/api/campaigns", "cors"), undefined);
  assert.equal(await w.fetch("/_next/static/runtime.js", "cors"), undefined);
  const response = await w.fetch("/");
  assert.match(await response.text(), /Chưa có kết nối mạng/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
