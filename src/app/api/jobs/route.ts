import { NextResponse } from "next/server";

import { processUploadBatch } from "@/lib/invoice-service";
import { assertUploadAccessKey } from "@/lib/runtime-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    assertUploadAccessKey(formData.get("accessKey"));
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const job = await processUploadBatch(files);

    return NextResponse.json({ jobId: job.jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "处理失败。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}