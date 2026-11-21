import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";

const require = createRequire(import.meta.url);

// A clean Workers build may invoke Vite directly and pnpm may skip install
// scripts. Generate before resolving @prisma/client/edge in every Vite build.
execFileSync(process.execPath, [join(dirname(require.resolve("prisma/package.json")), "build/index.js"), "generate"], {
  cwd: fileURLToPath(new URL(".", import.meta.url)),
  stdio: "inherit",
});

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
