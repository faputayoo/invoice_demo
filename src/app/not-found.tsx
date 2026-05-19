import Link from "next/link";

export default function NotFound() {
  return (
    <section className="surface-card rounded-[2rem] p-8">
      <p className="eyebrow">记录不存在</p>
      <h1 className="mt-3 text-4xl">没有找到这份处理结果</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--muted)]">
        可能是这次处理还没有生成记录，或者这条记录已经被清理。你可以回到上传页面重新整理一批 PDF。
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
      >
        返回上传
      </Link>
    </section>
  );
}