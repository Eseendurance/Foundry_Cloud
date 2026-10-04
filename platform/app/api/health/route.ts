import { NextResponse } from "next/server";
import { getPlatformHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getPlatformHealth();
  return NextResponse.json(health, {
    status: health.status === "offline" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
