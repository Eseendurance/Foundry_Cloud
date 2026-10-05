import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateText, availableProviders } from "@/lib/llm";
import { verifyApiKey } from "@/lib/api-keys";
import { query } from "@/lib/db";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExecutionStep = {
  id: string;
  type: "transform" | "condition" | "delay" | "ai_generate";
  data: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStep(value: unknown): ExecutionStep | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length < 1 ||
    value.id.length > 80 ||
    !isRecord(value.data)
  ) {
    return null;
  }
  if (
    value.type !== "transform" &&
    value.type !== "condition" &&
    value.type !== "delay" &&
    value.type !== "ai_generate"
  ) {
    return null;
  }
  return { id: value.id, type: value.type, data: value.data };
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: "A Foundry API key is required." }, { status: 401 });
  }

  let identity: Awaited<ReturnType<typeof verifyApiKey>>;
  try {
    identity = await verifyApiKey(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "API key verification failed.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if (!identity) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }
  if (identity.quotaExceeded) {
    return NextResponse.json({ error: "Monthly API key quota exceeded." }, { status: 429 });
  }
  if (
    await rateLimitedPersistently(
      `v1-execute:${identity.keyId}:${clientKey(request)}`,
      20,
      60_000
    )
  ) {
    return NextResponse.json({ error: "Execution rate limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  if (!isRecord(body) || !Array.isArray(body.steps) || body.steps.length === 0 || body.steps.length > 50) {
    return NextResponse.json({ error: "steps must contain between 1 and 50 operations." }, { status: 400 });
  }

  const parsed = body.steps.map(parseStep);
  if (parsed.some((step) => step === null)) {
    return NextResponse.json(
      { error: "Each step needs a unique id, supported type, and object data." },
      { status: 400 }
    );
  }
  const steps = parsed.filter((step): step is ExecutionStep => step !== null);
  if (new Set(steps.map((step) => step.id)).size !== steps.length) {
    return NextResponse.json({ error: "Step ids must be unique." }, { status: 400 });
  }

  const startedAt = Date.now();
  const results: Record<string, unknown> = {};
  let payload: Record<string, unknown> = {};
  let delayBudgetMs = 0;
  let responseStatus = 200;

  for (const step of steps) {
    if (step.type === "transform") {
      if (!isRecord(step.data.values)) {
        return NextResponse.json({ error: `Step ${step.id} requires a values object.` }, { status: 400 });
      }
      payload = { ...payload, ...step.data.values };
      results[step.id] = { transformed: true, keys: Object.keys(step.data.values) };
      continue;
    }
    if (step.type === "condition") {
      if (typeof step.data.key !== "string" || !("value" in step.data)) {
        return NextResponse.json({ error: `Step ${step.id} requires key and value.` }, { status: 400 });
      }
      results[step.id] = {
        conditionMet: payload[step.data.key] === step.data.value,
        checkedKey: step.data.key,
      };
      continue;
    }
    if (step.type === "delay") {
      const durationMs = step.data.durationMs;
      if (
        typeof durationMs !== "number" ||
        !Number.isInteger(durationMs) ||
        durationMs < 0 ||
        durationMs + delayBudgetMs > 30_000
      ) {
        return NextResponse.json(
          { error: "Combined delay duration must be an integer no greater than 30000 ms." },
          { status: 400 }
        );
      }
      delayBudgetMs += durationMs;
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      results[step.id] = { waitedMs: durationMs };
      continue;
    }

    const prompt = step.data.prompt;
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 12_000) {
      return NextResponse.json({ error: `Step ${step.id} needs a prompt under 12000 characters.` }, { status: 400 });
    }
    if (!availableProviders().includes("local")) {
      responseStatus = 503;
      results[step.id] = { error: "The local AI engine is offline." };
      break;
    }
    try {
      const generated = await generateText(
        "You are a software engineer running a user-authorized workflow.",
        prompt,
        4000
      );
      results[step.id] = { output: generated.text, provider: generated.provider };
    } catch (error) {
      responseStatus = 502;
      results[step.id] = {
        error: error instanceof Error ? error.message : "Local generation failed.",
      };
      break;
    }
  }

  try {
    await query(
      `INSERT INTO api_request_logs (id, key_id, endpoint, action, status_code, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        identity.keyId,
        "/api/v1/execute",
        "WORKFLOW_EXECUTE",
        responseStatus,
        Date.now() - startedAt,
      ]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not write API audit log.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(
    { success: responseStatus === 200, results, durationMs: Date.now() - startedAt },
    { status: responseStatus }
  );
}
