import Link from "next/link";
import { notFound } from "next/navigation";

import { RetryFailedButton } from "@/components/retry-failed-button";
import { getJob } from "@/lib/job-store";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

export default async function ResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    notFound();
  }

  const duplicateRecords = job.records.filter((record) => record.duplicate);

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">处理结果</p>
            <h1 className="mt-3 text-4xl sm:text-5xl">本次处理结果</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted)]">
              本次上传的识别明细、重复提醒、失败项和导出入口都汇总在这里，处理完成后可以直接下载标准 Excel 台账。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/jobs/${job.jobId}/export`}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              导出 Excel
            </a>
            <Link
              href="/history"
              className="rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
            >
              查看历史记录
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["成功识别", String(job.summary.recognizedCount)],
            ["疑似重复", String(job.summary.duplicateCount)],
            ["失败文件", String(job.summary.failureCount)],
            ["价税合计", currencyFormatter.format(job.summary.totalAmount)],
            ["税额合计", currencyFormatter.format(job.summary.totalTax)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5">
              <p className="text-sm text-[var(--muted)]">{label}</p>
              <p className="mt-3 text-3xl number-tabular">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
        <div className="surface-card overflow-hidden rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">识别明细</p>
              <h2 className="mt-2 text-3xl">标准发票台账</h2>
            </div>
            <span className="ink-chip rounded-full px-4 py-2 text-sm">
              {job.sourceLabel}
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <span className="ink-chip rounded-full px-4 py-2 text-sm number-tabular">
              共 {job.records.length} 条记录
            </span>
          </div>

          <div className="mt-6 overflow-x-auto pb-2">
            <table className="w-max min-w-[1120px] border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[10rem]" />
                <col className="w-[9rem]" />
                <col className="w-[8rem]" />
                <col className="w-[14rem]" />
                <col className="w-[14rem]" />
                <col className="w-[8rem]" />
                <col className="w-[16rem]" />
                <col className="w-[16rem]" />
              </colgroup>
              <thead>
                <tr className="text-[var(--muted)]">
                  {[
                    "发票类型",
                    "发票号码",
                    "开票日期",
                    "销售方",
                    "购买方",
                    "价税合计",
                    "备注或项目",
                    "状态与提示",
                  ].map((title) => (
                    <th
                      key={title}
                      className="border-b border-black/10 px-4 py-3 font-medium whitespace-nowrap"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {job.records.map((record) => (
                  <tr key={record.id} className="align-top text-[var(--foreground)]">
                    <td className="border-b border-black/6 px-4 py-4 leading-7">{record.invoiceType || "-"}</td>
                    <td className="border-b border-black/6 px-4 py-4 number-tabular whitespace-nowrap">
                      {record.invoiceNumber || "-"}
                    </td>
                    <td className="border-b border-black/6 px-4 py-4 number-tabular whitespace-nowrap">
                      {record.invoiceDate || "-"}
                    </td>
                    <td className="border-b border-black/6 px-4 py-4 leading-7">{record.sellerName || "-"}</td>
                    <td className="border-b border-black/6 px-4 py-4 leading-7">{record.buyerName || "-"}</td>
                    <td className="border-b border-black/6 px-4 py-4 number-tabular whitespace-nowrap">
                      {record.amountIncludingTax === null
                        ? "-"
                        : currencyFormatter.format(record.amountIncludingTax)}
                    </td>
                    <td className="border-b border-black/6 px-4 py-4 leading-7">{record.remarkOrItem || "-"}</td>
                    <td className="border-b border-black/6 px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                            record.statusLabel === "识别成功"
                              ? "bg-[var(--teal-soft)] text-[var(--teal)]"
                              : "bg-[var(--warm-soft)] text-[var(--accent-strong)]"
                          }`}
                        >
                          {record.statusLabel}
                        </span>
                        {record.duplicate ? (
                          <span className="inline-flex whitespace-nowrap rounded-full bg-[var(--warm-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-strong)]">
                            疑似重复
                          </span>
                        ) : null}
                      </div>
                      {record.notes.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {record.notes.map((note) => (
                            <span
                              key={`${record.id}-${note}`}
                              className="inline-flex rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs leading-6 text-[var(--muted)]"
                            >
                              {note}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <section className="surface-card rounded-[2rem] p-6">
            <p className="eyebrow">重复提醒</p>
            <h2 className="mt-2 text-3xl">疑似重复票</h2>
            {duplicateRecords.length === 0 ? (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">本次没有发现明显重复。</p>
            ) : (
              <div className="mt-4 space-y-3">
                {duplicateRecords.map((record) => (
                  <div key={`${record.id}-duplicate`} className="rounded-2xl border border-black/10 bg-white/65 p-4">
                    <p className="font-medium text-[var(--foreground)]">{record.fileName}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {record.invoiceNumber || "无发票号码"} · {record.duplicateReason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card rounded-[2rem] p-6">
            <p className="eyebrow">失败项</p>
            <h2 className="mt-2 text-3xl">重新处理</h2>
            {job.failures.length === 0 ? (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">本次没有失败文件。</p>
            ) : (
              <div className="mt-4 space-y-4">
                {job.failures.map((failure) => (
                  <div key={failure.fileName} className="rounded-2xl border border-black/10 bg-white/65 p-4">
                    <p className="font-medium text-[var(--foreground)]">{failure.fileName}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{failure.reason}</p>
                    {job.mode === "upload" ? (
                      <div className="mt-4">
                        <RetryFailedButton jobId={job.jobId} fileName={failure.fileName} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}