import type { Metadata } from "next";
import Link from "next/link";
import { JetBrains_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google";
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
  title: "票据清册 Demo",
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
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-10">
          <header className="sticky top-0 z-30 pt-4">
            <div className="surface-card flex items-center justify-between rounded-full px-4 py-3 sm:px-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(202,92,45,0.35)]">
                  票
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-[var(--muted)]">
                    Invoice Demo
                  </p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    票据清册
                  </p>
                </div>
              </Link>

              <nav className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] sm:gap-3">
                <Link href="/upload" className="rounded-full px-4 py-2 transition hover:bg-black/5">
                  上传页
                </Link>
                <Link href="/history" className="rounded-full px-4 py-2 transition hover:bg-black/5">
                  历史页
                </Link>
              </nav>
            </div>
          </header>

          <main className="flex-1 py-8">{children}</main>

          <footer className="mt-8 border-t border-black/10 py-6 text-sm text-[var(--muted)]">
            当前版本已经可以部署上线，优先支持文本型中文电子发票 PDF；图片版 PDF 会自动尝试 OCR 补救，但手机拍照图片、国外 invoice 和复杂税务流程仍不在支持范围内。
          </footer>
        </div>
      </body>
    </html>
  );
}
