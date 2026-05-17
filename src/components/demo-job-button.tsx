"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DemoJobButtonProps = {
  label?: string;
};

export function DemoJobButton({
  label = "体验示例结果",
}: DemoJobButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError("");
    startTransition(() => {
      void createDemoJob();
    });
  }

  async function createDemoJob() {
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "示例数据创建失败。");
      }

      const payload = (await response.json()) as { jobId: string };
      router.push(`/result/${payload.jobId}`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "示例数据创建失败。";
      setError(message);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-6 py-3 text-base font-semibold text-[var(--foreground)] transition hover:border-[var(--teal)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "正在生成示例结果..." : label}
      </button>
      {error ? <p className="text-sm text-[var(--accent-strong)]">{error}</p> : null}
    </div>
  );
}