import type { Metadata } from "next";
import Link from "next/link";
import { JetBrains_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google";

import { GoogleAnalytics } from "@/components/google-analytics";

import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "票据清册",
  description: "把一堆电子发票 PDF，自动整理成可报销、可对账、可归档的 Excel。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${sourceSans.variable} ${sourceSerif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <GoogleAnalytics />
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-10">
          <header className="sticky top-0 z-30 pt-4">
            <div className="surface-card flex items-center justify-between rounded-full px-4 py-3 sm:px-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(202,92,45,0.35)]">
                  票
                </div>
                <div>
                  <p className="whitespace-nowrap text-sm tracking-[0.12em] text-[var(--muted)]">
                    Invoice Ledger
                  </p>
                  <p className="whitespace-nowrap text-lg font-semibold text-[var(--foreground)]">
                    票据清册
                  </p>
                </div>
              </Link>

              <nav className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] sm:gap-3">
                <Link href="/upload" className="rounded-full px-4 py-2 transition hover:bg-black/5">
                  上传文件
                </Link>
                <Link href="/history" className="rounded-full px-4 py-2 transition hover:bg-black/5">
                  历史记录
                </Link>
              </nav>
            </div>
          </header>

          <main className="flex-1 py-8">{children}</main>

          <footer className="mt-10 border-t border-black/10 py-6 text-sm text-[var(--muted)]">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium text-[var(--foreground)]">票据清册</p>
              <p>批量整理电子发票，导出可报销、可对账、可归档的标准台账。</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
