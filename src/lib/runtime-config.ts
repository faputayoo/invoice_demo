import path from "node:path";

export type StorageDriver = "local" | "supabase";

const DEFAULT_SUPABASE_JOBS_TABLE = "invoice_jobs";
const DEFAULT_SUPABASE_FILES_BUCKET = "invoice-source-files";

export function getStorageDriver(): StorageDriver {
  const configured = process.env.INVOICE_STORAGE_DRIVER?.trim().toLowerCase();

  if (!configured) {
    return isSupabaseConfigured() ? "supabase" : "local";
  }

  if (configured !== "local" && configured !== "supabase") {
    throw new Error("INVOICE_STORAGE_DRIVER 只支持 local 或 supabase。");
  }

  if (configured === "supabase" && !isSupabaseConfigured()) {
    throw new Error(
      "INVOICE_STORAGE_DRIVER=supabase 但缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。",
    );
  }

  return configured;
}

export function getLocalDataRoot(): string {
  const configured = process.env.INVOICE_LOCAL_DATA_ROOT?.trim();

  if (!configured) {
    return path.join(process.cwd(), "data");
  }

  return path.isAbsolute(configured)
    ? configured
    : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
}

export function getOcrCachePath(): string {
  const configured = process.env.INVOICE_OCR_CACHE_PATH?.trim();

  if (configured) {
    return configured;
  }

  if (getStorageDriver() === "supabase" || process.env.VERCEL) {
    return path.join("/tmp", "invoice-demo", "ocr-cache");
  }

  return path.join(getLocalDataRoot(), "ocr-cache");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function getSupabaseUrl(): string {
  const value = process.env.SUPABASE_URL?.trim();

  if (!value) {
    throw new Error("缺少 SUPABASE_URL。");
  }

  return value;
}

export function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!value) {
    throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY。");
  }

  return value;
}

export function getSupabaseJobsTable(): string {
  return process.env.SUPABASE_JOBS_TABLE?.trim() || DEFAULT_SUPABASE_JOBS_TABLE;
}

export function getSupabaseFilesBucket(): string {
  return process.env.SUPABASE_FILES_BUCKET?.trim() || DEFAULT_SUPABASE_FILES_BUCKET;
}

export function isUploadAccessKeyEnabled(): boolean {
  return Boolean(process.env.INVOICE_UPLOAD_ACCESS_KEY?.trim());
}

export function assertUploadAccessKey(
  candidate: FormDataEntryValue | string | null | undefined,
): void {
  const expected = process.env.INVOICE_UPLOAD_ACCESS_KEY?.trim();

  if (!expected) {
    return;
  }

  const actual = typeof candidate === "string" ? candidate.trim() : "";

  if (actual !== expected) {
    throw new Error("上传口令无效。");
  }
}

export function getPublicRuntimeConfig(): {
  storageDriver: StorageDriver;
  uploadAccessKeyEnabled: boolean;
} {
  return {
    storageDriver: getStorageDriver(),
    uploadAccessKeyEnabled: isUploadAccessKeyEnabled(),
  };
}