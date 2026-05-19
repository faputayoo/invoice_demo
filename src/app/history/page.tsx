import Link from "next/link";

import { listJobs } from "@/lib/job-store";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

export default async function HistoryPage() {
  const jobs = await listJobs();

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="eyebrow">处理历史</p>
        <h1 className="text-4xl sm:text-5xl">历史记录</h1>
        <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
          每次处理结果都会保存到当前配置的存储中，方便回看明细、下载 Excel 或继续处理异常文件。
        </p>
      </section>

      {jobs.length === 0 ? (
        <section className="surface-card rounded-[2rem] p-8">
          <h2 className="text-2xl">还没有处理记录</h2>
          <p className="mt-3 max-w-xl text-base leading-8 text-[var(--muted)]">
            先上传一批 PDF，记录就会出现在这里；如果想先了解最终效果，也可以先打开一份样例结果。
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            去上传文件
          </Link>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.jobId} className="surface-card rounded-[2rem] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--teal)]">
                    {job.mode === "demo" ? "样例结果" : "本次上传"}
                  </p>
                  <h2 className="mt-2 text-2xl">{job.sourceLabel}</h2>
                </div>
                <span className="ink-chip rounded-full px-4 py-2 text-sm">
                  {new Date(job.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-2xl border border-black/10 bg-white/65 p-4">
                  <p className="text-[var(--muted)]">识别</p>
                  <p className="mt-2 text-2xl number-tabular">{job.summary.recognizedCount}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/65 p-4">
                  <p className="text-[var(--muted)]">失败</p>
                  <p className="mt-2 text-2xl number-tabular">{job.summary.failureCount}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/65 p-4">
                  <p className="text-[var(--muted)]">重复</p>
                  <p className="mt-2 text-2xl number-tabular">{job.summary.duplicateCount}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/65 p-4">
                  <p className="text-[var(--muted)]">价税合计</p>
                  <p className="mt-2 text-lg number-tabular">
                    {currencyFormatter.format(job.summary.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/result/${job.jobId}`}
                  className="rounded-full bg-[var(--teal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f5a61]"
                >
                  查看详情
                </Link>
                <a
                  href={`/api/jobs/${job.jobId}/export`}
                  className="rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
                >
                  下载 Excel
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}