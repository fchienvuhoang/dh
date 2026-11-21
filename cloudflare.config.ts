import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    cache: { enabled: false },
    name: "dh",
    workersDev: false,
    previewUrls: false,
    observability: { enabled: true },
    // Workers Paid is required for SSR, Prisma query compilation and PDF imports.
    limits: { cpuMs: 30_000 },
    triggers: [
      triggers.fetch({ pattern: "dhamma-group.danasangha.org/*", zone: "danasangha.org" }),
      triggers.fetch({ pattern: "metta.danasangha.org/*", zone: "danasangha.org" }),
    ],
    entrypoint: "./src/cloudflare-worker.ts",
    compatibilityDate: "2026-11-21",
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*", "!/assets/*", "!/icons/*", "!/splash/*"],
    },
    env: {
      VINEXT_KV_CACHE: bindings.kv({ id: "7d426dbfa89940f7953119ed9e469fd2" }),
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
