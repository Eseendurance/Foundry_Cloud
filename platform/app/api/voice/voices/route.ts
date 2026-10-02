import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      {
        error:
          "This module needs ELEVENLABS_API_KEY set in your Vercel project's environment variables. See the README.",
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `ElevenLabs rejected this: ${res.status} ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const voices = (data.voices || []).map(
      (v: { voice_id: string; name: string }) => ({
        voice_id: v.voice_id,
        name: v.name,
      })
    );

    return NextResponse.json({ voices });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't reach ElevenLabs.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
