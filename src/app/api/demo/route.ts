import { NextResponse } from "next/server";

import { createAndSaveDemoJob } from "@/lib/invoice-service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const job = await createAndSaveDemoJob();
    return NextResponse.json({ jobId: job.jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "示例数据创建失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}