"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { getSavedUploadAccessKey } from "@/lib/upload-access-key";

type RetryFailedButtonProps = {
  jobId: string;
  fileName: string;
};

export function RetryFailedButton({
  jobId,
  fileName,
}: RetryFailedButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    setMessage("");
    startTransition(() => {
      void retryFile();
    });
  }

  async function retryFile() {
    try {
      const accessKey = getSavedUploadAccessKey();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessKey) {
        headers["x-invoice-access-key"] = accessKey;
      }

      const response = await fetch(`/api/jobs/${jobId}/retry`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fileName }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "重试失败，请稍后再试。");
      }

      setMessage("已重新处理");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "重试失败，请稍后再试。";
      setMessage(errorMessage);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isPending}
        className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "重试中..." : "单独重试"}
      </button>
      {message ? <p className="text-xs text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}