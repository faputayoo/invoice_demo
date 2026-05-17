import { NextResponse } from "next/server";

import { retryFailedFile } from "@/lib/invoice-service";
import { assertUploadAccessKey } from "@/lib/runtime-config";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    assertUploadAccessKey(request.headers.get("x-invoice-access-key"));
    const { jobId } = await context.params;
    const payload = (await request.json()) as { fileName?: string };

    if (!payload.fileName) {
      return NextResponse.json({ error: "缺少 fileName。" }, { status: 400 });
    }

    const job = await retryFailedFile(jobId, payload.fileName);
    return NextResponse.json({ jobId: job.jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "重试失败。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}