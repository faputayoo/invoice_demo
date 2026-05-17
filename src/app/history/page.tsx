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
        <p className="eyebrow">History</p>
        <h1 className="text-4xl sm:text-5xl">历史页</h1>
        <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
          当前部署会把每次处理结果保存到已配置的存储后端，你可以随时回来看预览或重新下载 Excel。
        </p>
      </section>

      {jobs.length === 0 ? (
        <section className="surface-card rounded-[2rem] p-8">
          <h2 className="text-2xl">还没有处理记录</h2>
          <p className="mt-3 max-w-xl text-base leading-8 text-[var(--muted)]">
            先去上传一批 PDF，或者先体验一次示例结果，历史页就会开始累计记录。
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            去上传页
          </Link>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.jobId} className="surface-card rounded-[2rem] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--teal)]">
                    {job.mode === "demo" ? "示例数据" : "真实上传"}
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
                  查看结果页
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