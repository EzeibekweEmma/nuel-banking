import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getSiteUrl } from "../lib/site-url";
import "./globals.css";

const title = "Nuel Bank — Secure banking, smarter protection";
const description =
  "A modern digital banking experience with intelligent fraud monitoring, secure transfers, and clear control over your money.";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: "Nuel Bank",
  title: { default: title, template: "%s · Nuel Bank" },
  description,
  keywords: [
    "Nuel Bank",
    "digital banking",
    "secure transfers",
    "fraud monitoring",
    "personal finance",
  ],
  authors: [{ name: "Nuel Bank" }],
  creator: "Nuel Bank",
  publisher: "Nuel Bank",
  category: "finance",
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "Nuel Bank",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  appleWebApp: {
    capable: true,
    title: "Nuel Bank",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#092d24",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
