import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaStartup } from "@/components/pwa-startup";
import { PwaRegistration } from "@/components/pwa-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { themeColor: "#f7f7f4" };

export const metadata: Metadata = {
  applicationName: "Dhamma",
  appleWebApp: {
    capable: true,
    title: "Dhamma",
    statusBarStyle: "default",
    startupImage: [
      [375, 667, 2], [375, 812, 3], [390, 844, 3], [393, 852, 3],
      [402, 874, 3], [414, 896, 2], [414, 896, 3], [430, 932, 3], [440, 956, 3],
    ].map(([width, height, ratio]) => ({
      url: `/splash/iphone-${width}x${height}-${ratio}.png`,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
    })),
  },
  icons: { apple: "/icons/icon-180.png" },
  title: "Quản lý thiện pháp",
  description: "Phân loại sao kê Techcombank theo thiện pháp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><PwaRegistration /><PwaStartup />{children}</body>
    </html>
  );
}
