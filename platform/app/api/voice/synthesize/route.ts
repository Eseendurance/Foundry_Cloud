import { NextRequest, NextResponse } from "next/server";
import { synthesizeLocalSpeech } from "@/lib/local-voice";
import { clientKey, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (rateLimited(`synthesize:${clientKey(request)}`, 10, 5 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: { text?: unknown; voiceId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Give the local voice engine something to say." }, { status: 400 });
  }
  if (typeof body.voiceId !== "string" || !body.voiceId.trim()) {
    return NextResponse.json({ error: "Choose a local voice." }, { status: 400 });
  }

  try {
    const audio = await synthesizeLocalSpeech(body.text.trim().slice(0, 2_000), body.voiceId);
    const responseBody = new ArrayBuffer(audio.byteLength);
    new Uint8Array(responseBody).set(audio);
    return new Response(responseBody, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local speech generation failed.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
