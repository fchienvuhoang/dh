import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegistration } from "@/components/pwa-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { themeColor: "#18181b" };

export const metadata: Metadata = {
  applicationName: "Dhamma",
  appleWebApp: { capable: true, title: "Dhamma", statusBarStyle: "default" },
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
      <body className="min-h-full flex flex-col"><PwaRegistration />{children}</body>
    </html>
  );
}
