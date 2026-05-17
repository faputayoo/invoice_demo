import Link from "next/link";

import { DemoJobButton } from "@/components/demo-job-button";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="surface-card overflow-hidden rounded-[2rem] border px-6 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <p className="eyebrow">Invoice Ledger Demo</p>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl leading-tight sm:text-5xl lg:text-6xl">
                上传电子发票 PDF，30 秒整理成 Excel。
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                这不是一个无限兜底的 OCR 平台，而是一个边界清楚、价值直接的票据整理工具：批量提取字段、标记疑似重复、汇总金额并导出标准台账。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                开始上传 PDF
              </Link>
              <DemoJobButton label="先看示例结果" />
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
              <span className="ink-chip rounded-full px-4 py-2">支持数电票 PDF</span>
              <span className="ink-chip rounded-full px-4 py-2">支持普通电子发票 PDF</span>
              <span className="ink-chip rounded-full px-4 py-2">图片版 PDF 自动 OCR</span>
              <span className="ink-chip rounded-full px-4 py-2">单批最多 50 张</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["从 PDF 抄字段", "改成自动抽取发票号码、日期、金额、抬头与备注。"],
              ["重复票先提醒", "同号或核心金额组合重复时直接标记，减少月底返工。"],
              ["结果先预览", "导出前先看汇总卡片、异常文件和失败原因。"],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5">
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--teal)]">即时反馈</p>
                <h2 className="mt-2 text-2xl">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          ["1", "拖入多个 PDF", "从邮箱、微信、网盘收集来的电子发票，一次性拖进来。"],
          ["2", "自动识别字段", "优先走 PDF 文本层和规则提取，减少不必要的 AI 成本。"],
          ["3", "查看疑似重复", "重复票和不完整字段会被单独标记，先处理异常。"],
          ["4", "导出标准 Excel", "输出可报销、可对账、可归档的标准发票台账。"],
        ].map(([index, title, description]) => (
          <article key={index} className="surface-card rounded-[1.75rem] p-6">
            <p className="text-4xl text-[var(--accent)]">{index}</p>
            <h2 className="mt-4 text-2xl">{title}</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="surface-card rounded-[2rem] p-7">
          <p className="eyebrow">支持范围</p>
          <h2 className="mt-3 text-3xl">第一版边界写死，售后才会轻。</h2>
          <div className="mt-6 space-y-3 text-base leading-8 text-[var(--muted)]">
            <p>支持：标准电子发票 PDF、图片版 PDF 的 OCR fallback、批量导出 Excel。</p>
            <p>暂不支持：手机拍照图片直传、手写票据、国外 invoice、任意自定义模板。</p>
            <p>文本层清晰的 PDF 会优先走规则提取；只有失败时才会触发 OCR，所以成本和稳定性还在可控范围内。</p>
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-7">
          <p className="eyebrow">目标用户</p>
          <h2 className="mt-3 text-3xl">你卖的不是 AI，是月底少做一轮重复劳动。</h2>
          <div className="mt-6 grid gap-3 text-base leading-8 text-[var(--muted)] sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-black/10 bg-white/65 p-4">
              <p className="font-semibold text-[var(--foreground)]">小商家老板</p>
              <p className="mt-2 text-sm">月底集中整理票据，交给财务或自己留档。</p>
            </div>
            <div className="rounded-[1.5rem] border border-black/10 bg-white/65 p-4">
              <p className="font-semibold text-[var(--foreground)]">兼职财务 / 行政</p>
              <p className="mt-2 text-sm">需要快速提取字段、汇总金额、找异常。</p>
            </div>
            <div className="rounded-[1.5rem] border border-black/10 bg-white/65 p-4">
              <p className="font-semibold text-[var(--foreground)]">代账前整理人</p>
              <p className="mt-2 text-sm">把零散 PDF 先整理成清晰的 Excel 台账。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
