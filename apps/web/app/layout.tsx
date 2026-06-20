import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maya AI — EQA Readiness",
  description: "Multi-tenant EQA readiness assessment platform for Seera.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${notoArabic.variable}`}
    >
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
