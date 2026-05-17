import { mkdir } from "node:fs/promises";

import { loadPdfParse } from "@/lib/pdf-parse-runtime";
import { getOcrCachePath } from "@/lib/runtime-config";

const OCR_PAGE_LIMIT = 2;
const OCR_DESIRED_WIDTH = 1800;

type OcrLanguageCandidate = {
  key: string;
  langs: string[];
};

export type OcrAttempt = {
  language: string;
  text: string;
  error?: string;
};

export async function extractPdfTextWithOcr(buffer: Buffer): Promise<OcrAttempt[]> {
  const screenshots = await renderPdfScreenshots(buffer);
  const attempts: OcrAttempt[] = [];

  for (const candidate of buildLanguageCandidates()) {
    try {
      const text = await recognizeScreenshots(screenshots, candidate);
      attempts.push({
        language: candidate.key,
        text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR 处理失败";
      attempts.push({
        language: candidate.key,
        text: "",
        error: message,
      });
    }
  }

  return attempts;
}

async function renderPdfScreenshots(buffer: Buffer): Promise<Buffer[]> {
  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getScreenshot({
      first: OCR_PAGE_LIMIT,
      desiredWidth: OCR_DESIRED_WIDTH,
      imageBuffer: true,
      imageDataUrl: false,
    });

    return result.pages
      .map((page) => Buffer.from(page.data))
      .filter((pageBuffer) => pageBuffer.length > 0);
  } finally {
    await parser.destroy();
  }
}

async function recognizeScreenshots(
  screenshots: Buffer[],
  candidate: OcrLanguageCandidate,
): Promise<string> {
  const cachePath = getOcrCachePath();
  await mkdir(cachePath, { recursive: true });

  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker(candidate.langs, 1, {
    cachePath,
    logger: () => {},
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });

    const texts: string[] = [];

    for (const screenshot of screenshots) {
      const {
        data: { text },
      } = await worker.recognize(screenshot, {
        rotateAuto: true,
      });

      texts.push(text ?? "");
    }

    return texts.join("\n");
  } finally {
    await worker.terminate();
  }
}

function buildLanguageCandidates(): OcrLanguageCandidate[] {
  const configured = process.env.INVOICE_OCR_LANGS?.trim();
  const rawCandidates = configured ? [configured, "eng"] : ["eng", "chi_sim+eng"];
  const uniqueCandidates = Array.from(new Set(rawCandidates.filter(Boolean)));

  return uniqueCandidates.map((candidate) => ({
    key: candidate,
    langs: candidate
      .split("+")
      .map((lang) => lang.trim())
      .filter(Boolean),
  }));
}