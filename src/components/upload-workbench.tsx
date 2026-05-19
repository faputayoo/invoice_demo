"use client";

import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { DemoJobButton } from "@/components/demo-job-button";
import { trackEvent } from "@/lib/analytics";
import { MAX_FILES_PER_BATCH } from "@/lib/demo-constants";
import {
  getSavedUploadAccessKey,
  saveUploadAccessKey,
} from "@/lib/upload-access-key";

type UploadWorkbenchProps = {
  uploadAccessKeyRequired?: boolean;
};

export function UploadWorkbench({
  uploadAccessKeyRequired = false,
}: UploadWorkbenchProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const accessKeyInputRef = useRef<HTMLInputElement | null>(null);
  const accessKeyRef = useRef("");
  const timerRef = useRef<number | null>(null);

  const totalSizeText = useMemo(() => {
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes === 0) {
      return "0 MB";
    }

    return `${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
  }, [selectedFiles]);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 94) {
          return current;
        }

        return current + Math.max(2, Math.round((96 - current) / 5));
      });
    }, 220);
  }

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  useEffect(() => {
    if (!uploadAccessKeyRequired) {
      return;
    }

    const savedAccessKey = getSavedUploadAccessKey();
    accessKeyRef.current = savedAccessKey;

    if (accessKeyInputRef.current) {
      accessKeyInputRef.current.value = savedAccessKey;
    }
  }, [uploadAccessKeyRequired]);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    mergeFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    mergeFiles(event.dataTransfer.files);
  }

  function mergeFiles(list: FileList | null) {
    if (!list) {
      return;
    }

    const incomingFiles = Array.from(list).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf"),
    );

    if (incomingFiles.length === 0) {
      setError("请上传 PDF 文件。当前仅支持 PDF，不支持 JPG 或 PNG 直接上传。");
      return;
    }

    setError("");
    setSelectedFiles((current) => {
      const mergedFiles = [...current, ...incomingFiles].filter(
        (file, index, files) =>
          files.findIndex(
            (candidate) =>
              candidate.name === file.name &&
              candidate.size === file.size &&
              candidate.lastModified === file.lastModified,
          ) === index,
      );

      return mergedFiles.slice(0, MAX_FILES_PER_BATCH);
    });
  }

  function removeFile(fileName: string) {
    setSelectedFiles((current) => current.filter((file) => file.name !== fileName));
  }

  function clearFiles() {
    setSelectedFiles([]);
    setError("");
    setProgress(0);
  }

  function submitBatch() {
    setError("");

    if (selectedFiles.length === 0) {
      setError("先选择一批 PDF，再开始整理。");
      return;
    }

    if (uploadAccessKeyRequired && !accessKeyRef.current.trim()) {
      setError("当前部署已开启上传口令，请先输入口令。");
      return;
    }

    startTransition(() => {
      void processBatch();
    });
  }

  async function processBatch() {
    try {
      const totalSizeMb = Number(
        (selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2),
      );
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (accessKeyRef.current.trim()) {
        formData.append("accessKey", accessKeyRef.current.trim());
      }

      trackEvent("invoice_upload_started", {
        file_count: selectedFiles.length,
        total_size_mb: totalSizeMb,
      });

      setProgress(8);
      startTimer();

      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "处理失败，请检查 PDF 是否为可复制文本。");
      }

      const payload = (await response.json()) as { jobId: string };
      stopTimer();
      setProgress(100);
      trackEvent("invoice_upload_succeeded", {
        file_count: selectedFiles.length,
        total_size_mb: totalSizeMb,
      });
      router.push(`/result/${payload.jobId}`);
    } catch (caughtError) {
      stopTimer();
      setProgress(0);
      const message =
        caughtError instanceof Error ? caughtError.message : "处理失败，请稍后再试。";
      trackEvent("invoice_upload_failed", {
        file_count: selectedFiles.length,
        error_message: message.slice(0, 100),
      });
      setError(message);
    }
  }

  const statusText =
    progress < 30
      ? "正在准备上传队列..."
      : progress < 68
        ? "正在提取 PDF 文本层..."
        : progress < 95
          ? "正在整理字段并标记重复..."
          : "即将打开处理结果...";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="surface-card rounded-[2rem] p-6 sm:p-8">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-[1.75rem] border border-dashed p-8 text-center transition sm:p-12 ${
            isDragging
              ? "border-[var(--accent)] bg-[var(--warm-soft)]"
              : "border-black/15 bg-white/60"
          }`}
        >
          <p className="eyebrow">上传文件</p>
          <h2 className="mt-3 text-3xl">把电子发票整理成一张清晰台账。</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-[var(--muted)]">
            系统会优先解析文本型电子发票 PDF；图片版 PDF 会自动启用 OCR 识别。支持拖拽上传，单批最多 {MAX_FILES_PER_BATCH} 张。
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={openPicker}
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              选择 PDF 文件
            </button>
            <DemoJobButton label="查看样例结果" />
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {uploadAccessKeyRequired ? (
          <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
            <label htmlFor="upload-access-key" className="text-sm font-medium text-[var(--foreground)]">
              上传口令
            </label>
            <input
              ref={accessKeyInputRef}
              id="upload-access-key"
              type="password"
              onChange={(event) => {
                const nextValue = event.target.value;
                accessKeyRef.current = nextValue;
                saveUploadAccessKey(nextValue);
              }}
              placeholder="输入部署时配置的上传口令"
              autoComplete="current-password"
              className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--teal)]"
            />
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              用于控制公开站点的真实上传入口，样例结果仍可直接查看。
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <span className="ink-chip rounded-full px-4 py-2">已选 {selectedFiles.length} 张</span>
          <span className="ink-chip rounded-full px-4 py-2">总大小 {totalSizeText}</span>
          <span className="ink-chip rounded-full px-4 py-2">自动识别字段</span>
        </div>

        {selectedFiles.length > 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl">待处理文件</h3>
              <button
                type="button"
                onClick={clearFiles}
                className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                清空列表
              </button>
            </div>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {selectedFiles.map((file) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{file.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    className="rounded-full border border-black/10 px-3 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={submitBatch}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-[var(--teal)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#0f5a61] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "正在整理票据..." : "开始整理并生成结果"}
          </button>
          <button
            type="button"
            onClick={clearFiles}
            className="rounded-full border border-[var(--line)] bg-white/70 px-6 py-3 text-base font-semibold text-[var(--foreground)] transition hover:bg-white"
          >
            重新选择
          </button>
        </div>

        {(isPending || progress > 0) && progress < 100 ? (
          <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
            <div className="flex items-center justify-between text-sm text-[var(--muted)]">
              <span>{statusText}</span>
              <span className="number-tabular">{progress}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/6">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--teal))] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-[var(--accent-strong)]">{error}</p> : null}
      </section>

      <aside className="space-y-6">
        <section className="surface-card rounded-[2rem] p-6">
          <p className="eyebrow">处理完成后你会看到什么</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
            <p>成功识别多少张，失败多少张，疑似重复多少张。</p>
            <p>总金额合计和税额合计，直接用于报销和对账。</p>
            <p>失败文件会保留下来，方便单独重试或重新上传。</p>
          </div>
        </section>

        <section className="surface-card rounded-[2rem] p-6">
          <p className="eyebrow">处理范围</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
            <li>支持标准电子发票 PDF，也支持图片版 PDF 的 OCR 识别。</li>
            <li>优先走规则提取，只在文本层不足时才启用 OCR。</li>
            <li>处理记录会自动保存在当前配置的存储中，方便回看与导出。</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}