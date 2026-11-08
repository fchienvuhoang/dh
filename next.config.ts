import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/import": [
      // Include real files in pnpm's store, rather than directories reached
      // through package symlinks, which Vercel rejects when assembling functions.
      "./node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/.pnpm/@napi-rs+canvas@*/node_modules/@napi-rs/canvas/*.js",
      "./node_modules/.pnpm/@napi-rs+canvas@*/node_modules/@napi-rs/canvas/package.json",
      "./node_modules/.pnpm/@napi-rs+canvas-*@*/node_modules/@napi-rs/canvas-*/*.node",
      "./node_modules/.pnpm/@napi-rs+canvas-*@*/node_modules/@napi-rs/canvas-*/package.json",
    ],
  },
  async headers() {
    return [
      { source: "/pwa-recovery.html", headers: [{ key: "Cache-Control", value: "no-store" }] },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/bao-cao/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
