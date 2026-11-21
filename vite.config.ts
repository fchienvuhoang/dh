import { createRequire } from "node:module";
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";

const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: { alias: [{ find: /^@prisma\/client$/, replacement: require.resolve("@prisma/client/edge") }] },
  server: { allowedHosts: ["metta.danasangha.org", "dhamma-group.danasangha.org"] },
  plugins: [
    vinext({
      cache: { data: kvDataAdapter({ ttlSeconds: 60, tagCacheTtlMs: 0 }) },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
