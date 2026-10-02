import { NextRequest, NextResponse } from "next/server";
import { rateLimited, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (rateLimited(`synthesize:${clientKey(req)}`, 10, 5 * 60_000)) {
    return NextResponse.json(
      { error: "Too many requests from this connection in a short window. Wait a few minutes and try again." },
      { status: 429 }
    );
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      {
        error:
          "This module needs ELEVENLABS_API_KEY set in your Vercel project's environment variables. See the README.",
      },
      { status: 500 }
    );
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  const text = (body.text || "").trim().slice(0, 2000);
  const voiceId = (body.voiceId || "").trim();

  if (!text) {
    return NextResponse.json({ error: "Give it something to say." }, { status: 400 });
  }
  if (!voiceId) {
    return NextResponse.json({ error: "Pick a voice first." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
      }
    );

    if (!res.ok || !res.body) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `ElevenLabs rejected this: ${res.status} ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    return new Response(res.body, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Speech generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
