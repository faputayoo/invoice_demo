import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { InvoiceJob, JobMode } from "@/lib/invoice-types";
import {
  getLocalDataRoot,
  getStorageDriver,
  getSupabaseFilesBucket,
  getSupabaseJobsTable,
} from "@/lib/runtime-config";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const DATA_ROOT = path.join(getLocalDataRoot(), "jobs");

type StoreHandlers<T> = {
  local: () => Promise<T>;
  supabase: () => Promise<T>;
};

export async function createJobId(): Promise<string> {
  await ensureDataRoot();
  return randomUUID().slice(0, 8);
}

export async function saveJob(job: InvoiceJob): Promise<void> {
  await withStore({
    local: async () => {
      const jobDirectory = path.join(DATA_ROOT, job.jobId);
      await mkdir(jobDirectory, { recursive: true });
      await writeFile(
        path.join(jobDirectory, "job.json"),
        JSON.stringify(job, null, 2),
        "utf8",
      );
    },
    supabase: async () => {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from(getSupabaseJobsTable())
        .upsert(
          {
            job_id: job.jobId,
            created_at: job.createdAt,
            payload: job as unknown as Record<string, unknown>,
          },
          { onConflict: "job_id" },
        );

      if (error) {
        throw new Error(`保存处理记录失败：${error.message}`);
      }
    },
  });
}

export async function getJob(jobId: string): Promise<InvoiceJob | null> {
  return withStore({
    local: async () => {
      try {
        const rawContent = await readFile(path.join(DATA_ROOT, jobId, "job.json"), "utf8");
        return JSON.parse(rawContent) as InvoiceJob;
      } catch {
        return null;
      }
    },
    supabase: async () => {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from(getSupabaseJobsTable())
        .select("payload")
        .eq("job_id", jobId)
        .maybeSingle();

      if (error) {
        throw new Error(`读取处理记录失败：${error.message}`);
      }

      if (!data?.payload) {
        return null;
      }

      return data.payload as InvoiceJob;
    },
  });
}

export async function listJobs(): Promise<InvoiceJob[]> {
  return withStore({
    local: async () => {
      await ensureDataRoot();
      const entries = await readdir(DATA_ROOT, { withFileTypes: true });
      const jobIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      const jobs = await Promise.all(jobIds.map((jobId) => getJob(jobId)));

      return jobs
        .filter((job): job is InvoiceJob => Boolean(job))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    supabase: async () => {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from(getSupabaseJobsTable())
        .select("payload")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`读取历史记录失败：${error.message}`);
      }

      return (data ?? [])
        .map((entry) => entry.payload as InvoiceJob)
        .filter(Boolean);
    },
  });
}

export async function saveSourceFile(
  jobId: string,
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  return withStore({
    local: async () => {
      const filesDirectory = path.join(DATA_ROOT, jobId, "files");
      await mkdir(filesDirectory, { recursive: true });

      const safeFileName = sanitizeFileName(fileName);
      const filePath = path.join(filesDirectory, safeFileName);
      await writeFile(filePath, buffer);

      return filePath;
    },
    supabase: async () => {
      const objectPath = path.posix.join(jobId, sanitizeFileName(fileName));
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase.storage
        .from(getSupabaseFilesBucket())
        .upload(objectPath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (error) {
        throw new Error(`保存原始文件失败：${error.message}`);
      }

      return objectPath;
    },
  });
}

export async function readSourceFile(
  jobId: string,
  fileName: string,
): Promise<Buffer> {
  return withStore({
    local: async () =>
      readFile(path.join(DATA_ROOT, jobId, "files", sanitizeFileName(fileName))),
    supabase: async () => {
      const objectPath = path.posix.join(jobId, sanitizeFileName(fileName));
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.storage
        .from(getSupabaseFilesBucket())
        .download(objectPath);

      if (error || !data) {
        throw new Error(`读取原始文件失败：${error?.message ?? "文件不存在"}`);
      }

      return Buffer.from(await data.arrayBuffer());
    },
  });
}

export async function buildJobRecord(params: {
  jobId?: string;
  mode: JobMode;
  sourceLabel: string;
  records: InvoiceJob["records"];
  failures: InvoiceJob["failures"];
  summary: InvoiceJob["summary"];
}): Promise<InvoiceJob> {
  const jobId = params.jobId ?? (await createJobId());

  return {
    jobId,
    createdAt: new Date().toISOString(),
    mode: params.mode,
    sourceLabel: params.sourceLabel,
    records: params.records,
    failures: params.failures,
    summary: params.summary,
  };
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\p{L}\p{N}._-]+/gu, "_");
}

async function ensureDataRoot(): Promise<void> {
  if (getStorageDriver() !== "local") {
    return;
  }

  await mkdir(DATA_ROOT, { recursive: true });
}

async function withStore<T>(handlers: StoreHandlers<T>): Promise<T> {
  if (getStorageDriver() === "supabase") {
    return handlers.supabase();
  }

  return handlers.local();
}