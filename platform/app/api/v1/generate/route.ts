import { NextRequest, NextResponse } from "next/server";
import { generateText, availableProviders } from "@/lib/llm";
import { verifyApiKey } from "@/lib/api-keys";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You generate ONE self-contained HTML document implementing what's described — inline CSS in <style>, inline JS in <script>, no external dependencies beyond CDN scripts for React if needed. Output raw HTML only, starting with <!DOCTYPE html>, no markdown fences, no commentary.`;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!key) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Authorization: Bearer fc_live_..." },
      { status: 401 }
    );
  }

  const identity = await verifyApiKey(key);
  if (!identity) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  if (rateLimited(`v1-generate:${identity.keyId}`, 20, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded for this key: 20 requests/hour." },
      { status: 429 }
    );
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON with a prompt field." }, { status: 400 });
  }

  const prompt = (body.prompt || "").trim().slice(0, 2000);
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  if (availableProviders().length === 0) {
    return NextResponse.json(
      { error: "This platform has no AI provider configured yet." },
      { status: 500 }
    );
  }

  try {
    const { text: html, provider } = await generateText(SYSTEM_PROMPT, prompt, 8000);
    return NextResponse.json({ html, provider });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
