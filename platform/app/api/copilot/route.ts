import { NextRequest, NextResponse } from "next/server";
import { availableProviders, generateText } from "@/lib/llm";
import { getSession } from "@/lib/auth";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You are the Foundry Platform pipeline DSL generator.
Generate a valid .pipe configuration for the supplied request.
Return only a JSON object with string fields "dsl" and "explanation".
Do not use markdown or code fences.`;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `copilot:${session.organizationId}:${clientKey(request)}`,
      10,
      5 * 60_000
    )
  ) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: { prompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (!availableProviders().includes("local")) {
    return NextResponse.json(
      { error: "The local AI engine is offline. Configure LOCAL_LLM_URL and LOCAL_LLM_MODEL." },
      { status: 503 }
    );
  }

  try {
    const { text } = await generateText(
      SYSTEM_INSTRUCTION,
      `Generate a pipeline for: ${body.prompt.trim().slice(0, 4_000)}`,
      4_000
    );
    const parsed = JSON.parse(text) as { dsl?: unknown; explanation?: unknown };
    if (typeof parsed.dsl !== "string" || typeof parsed.explanation !== "string") {
      throw new Error("Local model response must contain string dsl and explanation fields.");
    }
    return NextResponse.json({ dsl: parsed.dsl, explanation: parsed.explanation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
