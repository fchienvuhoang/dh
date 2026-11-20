import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    cache: { enabled: false },
    name: "dhamma",
    workersDev: true,
    previewUrls: false,
    observability: { enabled: true },
    // Workers Paid is required for SSR, Prisma query compilation and PDF imports.
    limits: { cpuMs: 30_000 },
    domains: ["dhamma-group.danasangha.org", "metta.danasangha.org"],
    triggers: [],
    entrypoint: "./src/cloudflare-worker.ts",
    compatibilityDate: "2026-11-20",
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*", "!/assets/*", "!/icons/*", "!/splash/*"],
    },
    env: {
      VINEXT_KV_CACHE: bindings.kv(),
      DATABASE_URL: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      AUTH_SECRET: bindings.secret(),
      ZIP_PASS: bindings.secret(),
      GOOGLE_ALLOWED_EMAILS: bindings.text("fchienvuhoang@gmail.com"),
      NEXT_PUBLIC_APP_URL: bindings.text("https://dhamma-group.danasangha.org"),
      ASSETS: bindings.assets(),
    },
  }),
});
