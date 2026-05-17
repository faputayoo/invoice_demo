import { buildDemoJob } from "@/lib/demo-data";
import { MAX_FILES_PER_BATCH } from "@/lib/demo-constants";
import { buildJobSummary, applyDuplicateFlags, parseInvoiceFile } from "@/lib/invoice-parser";
import {
  buildJobRecord,
  createJobId,
  getJob,
  readSourceFile,
  saveJob,
  saveSourceFile,
} from "@/lib/job-store";
import type { InvoiceJob } from "@/lib/invoice-types";

export async function processUploadBatch(files: File[]): Promise<InvoiceJob> {
  if (files.length === 0) {
    throw new Error("请至少上传 1 个 PDF 文件。");
  }

  if (files.length > MAX_FILES_PER_BATCH) {
    throw new Error(`当前 demo 单批最多处理 ${MAX_FILES_PER_BATCH} 张 PDF。`);
  }

  const jobId = await createJobId();
  const records: InvoiceJob["records"] = [];
  const failures: InvoiceJob["failures"] = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      failures.push({
        fileName: file.name,
        reason: "只支持 PDF 文件。",
      });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveSourceFile(jobId, file.name, buffer);
    const outcome = await parseInvoiceFile(file.name, buffer);

    if (outcome.kind === "record") {
      records.push(outcome.record);
      continue;
    }

    failures.push(outcome.failure);
  }

  const normalizedRecords = applyDuplicateFlags(records);
  const job = await buildJobRecord({
    jobId,
    mode: "upload",
    sourceLabel: `批量上传 ${files.length} 张 PDF`,
    records: normalizedRecords,
    failures,
    summary: buildJobSummary(normalizedRecords, failures),
  });

  await saveJob(job);
  return job;
}

export async function createAndSaveDemoJob(): Promise<InvoiceJob> {
  const jobId = await createJobId();
  const job = buildDemoJob(jobId);
  await saveJob(job);
  return job;
}

export async function retryFailedFile(
  jobId: string,
  fileName: string,
): Promise<InvoiceJob> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error("未找到对应的处理记录。");
  }

  const buffer = await readSourceFile(jobId, fileName);
  const outcome = await parseInvoiceFile(fileName, buffer);
  const nextRecords = job.records.filter((record) => record.fileName !== fileName);
  const nextFailures = job.failures.filter((failure) => failure.fileName !== fileName);

  if (outcome.kind === "record") {
    nextRecords.push(outcome.record);
  } else {
    nextFailures.push(outcome.failure);
  }

  const normalizedRecords = applyDuplicateFlags(nextRecords);
  const nextJob: InvoiceJob = {
    ...job,
    records: normalizedRecords,
    failures: nextFailures,
    summary: buildJobSummary(normalizedRecords, nextFailures),
  };

  await saveJob(nextJob);
  return nextJob;
}