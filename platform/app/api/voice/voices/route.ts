import { NextResponse } from "next/server";
import { listLocalVoices } from "@/lib/local-voice";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ voices: await listLocalVoices(), engine: "espeak-ng" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local voice engine is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
