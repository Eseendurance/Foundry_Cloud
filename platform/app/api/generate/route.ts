import { NextRequest, NextResponse } from "next/server";
import { availableProviders, generateText } from "@/lib/llm";
import { getSession } from "@/lib/auth";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `generate:${session.organizationId}:${clientKey(request)}`,
      10,
      5 * 60_000
    )
  ) {
    return NextResponse.json({ error: "Too many generation requests. Try again shortly." }, { status: 429 });
  }

  let body: { prompt?: unknown; type?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "Prompt definition required." }, { status: 400 });
  }

  if (!availableProviders().includes("local")) {
    return NextResponse.json(
      { error: "The local AI engine is offline. Configure LOCAL_LLM_URL and LOCAL_LLM_MODEL." },
      { status: 503 }
    );
  }

  const system =
    body.type === "schema"
      ? "You are a database architect. Return clean SQL DDL statements or JSON schema objects."
      : "You are a software engineer. Return valid Next.js and TypeScript code.";

  try {
    const result = await generateText(system, body.prompt.trim().slice(0, 12_000));
    return NextResponse.json({ success: true, mode: "local", output: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
