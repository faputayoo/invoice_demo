import { NextResponse } from "next/server";

import { buildWorkbookBuffer } from "@/lib/excel";
import { getJob } from "@/lib/job-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "未找到对应记录。" }, { status: 404 });
  }

  const buffer = await buildWorkbookBuffer(job);
  const fileName = encodeURIComponent(`发票台账-${jobId}.xlsx`);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      "Cache-Control": "no-store",
    },
  });
}