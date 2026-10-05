import { NextRequest, NextResponse } from "next/server";
import { availableProviders, generateText } from "@/lib/llm";
import { verifyApiKey } from "@/lib/api-keys";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: "A valid Foundry API key is required." }, { status: 401 });
  }

  let identity: Awaited<ReturnType<typeof verifyApiKey>>;
  try {
    identity = await verifyApiKey(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "API key verification failed.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if (!identity) {
    return NextResponse.json({ error: "A valid Foundry API key is required." }, { status: 401 });
  }
  if (identity.quotaExceeded) {
    return NextResponse.json({ error: "Monthly API key quota exceeded." }, { status: 429 });
  }
  if (
    await rateLimitedPersistently(
      `api-v1:${identity.keyId}:${clientKey(request)}`,
      30,
      60_000
    )
  ) {
    return NextResponse.json({ error: "API request limit exceeded. Try again shortly." }, { status: 429 });
  }

  let body: { action?: unknown; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  if (body.action === "generate_code") {
    const payload = body.payload;
    const prompt =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>).prompt
        : undefined;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "payload.prompt is required." }, { status: 400 });
    }
    if (!availableProviders().includes("local")) {
      return NextResponse.json({ error: "The local AI engine is offline." }, { status: 503 });
    }
    try {
      const result = await generateText("You are a software engineer. Return production-quality code.", prompt.slice(0, 12_000));
      return NextResponse.json({ success: true, action: "generate_code", result: result.text });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Local code generation failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (body.action === "create_schema") {
    return NextResponse.json(
      { error: "Schema provisioning is not enabled until workspace isolation and migrations are configured." },
      { status: 501 }
    );
  }
  if (body.action === "deploy_app") {
    return NextResponse.json(
      { error: "Deployment-provider integration is disabled. Export the project and deploy it on your own host." },
      { status: 501 }
    );
  }

  return NextResponse.json(
    { error: "Unsupported action. Supported actions: generate_code, create_schema, deploy_app." },
    { status: 400 }
  );
}
