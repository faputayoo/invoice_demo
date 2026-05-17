const UPLOAD_ACCESS_KEY_STORAGE_KEY = "invoice-upload-access-key";

export function getSavedUploadAccessKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(UPLOAD_ACCESS_KEY_STORAGE_KEY) ?? "";
}

export function saveUploadAccessKey(value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = value.trim();

  if (!normalized) {
    window.localStorage.removeItem(UPLOAD_ACCESS_KEY_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(UPLOAD_ACCESS_KEY_STORAGE_KEY, normalized);
}