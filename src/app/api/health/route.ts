import { NextResponse } from "next/server";

import { getPublicRuntimeConfig } from "@/lib/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPublicRuntimeConfig();

  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    storageDriver: config.storageDriver,
    uploadAccessKeyEnabled: config.uploadAccessKeyEnabled,
  });
}