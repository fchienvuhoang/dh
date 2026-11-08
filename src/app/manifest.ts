import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dhamma Group – Quản lý thiện pháp",
    short_name: "Dhamma",
    description: "Nhập sao kê và quản lý thiện pháp của Dhamma Group.",
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f4",
    theme_color: "#f7f7f4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
