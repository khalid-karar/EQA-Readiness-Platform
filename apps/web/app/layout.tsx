import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { MAYA_AI_MARK_SRC } from "@/lib/brand-assets";
import { SITE_NAME_EN } from "@/lib/page-metadata";
import { readRequestLocale } from "@/lib/request-locale";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: SITE_NAME_EN,
    template: "%s",
  },
  description:
    "Multi-tenant EQA readiness assessment platform for Seera-pilot.",
  icons: {
    icon: [
      { url: MAYA_AI_MARK_SRC, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: MAYA_AI_MARK_SRC, sizes: "512x512", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const locale = await readRequestLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${notoArabic.variable}`}
    >
      <body className="min-h-screen font-sans">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
