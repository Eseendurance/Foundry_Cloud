import { NextRequest, NextResponse } from "next/server";
import { parsePipeDSL } from "@/raw-engine/engine/parser";
import { executeAST } from "@/raw-engine/runtime/evaluator";
import { clientKey, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (rateLimited(`editor-validate:${clientKey(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many validation requests." }, { status: 429 });
  }

  let body: { code?: unknown; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ valid: false, error: "Pipeline DSL code is required." }, { status: 400 });
  }
  if (body.code.length > 100_000) {
    return NextResponse.json({ valid: false, error: "Pipeline DSL must be under 100 KB." }, { status: 413 });
  }

  try {
    const ast = parsePipeDSL(body.code);
    if (!ast.pipelines.length) {
      return NextResponse.json({
        valid: false,
        error: 'No valid pipeline declaration was parsed. Add a declaration such as pipeline "MyPipeline".',
      });
    }

    if (body.payload === undefined) {
      return NextResponse.json({ valid: true, ast, executionResult: null });
    }
    if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
      return NextResponse.json({ valid: false, error: "Test payload must be a JSON object." }, { status: 400 });
    }

    const testAst = {
      ...ast,
      pipelines: ast.pipelines.map((pipeline) => ({ ...pipeline, webhooks: [] })),
    };
    const result = await executeAST(testAst, body.payload as Record<string, unknown>);
    const passed = result.ctx.validationErrors.length === 0 && result.ctx.errors.length === 0;

    return NextResponse.json({
      valid: true,
      ast,
      executionResult: {
        status: passed ? "Passed" : "Failed",
        passed,
        outputPayload: result.data,
        validationErrors: result.ctx.validationErrors,
        errors: result.ctx.errors.map((error) => error.message),
        logs: result.ctx.logs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline parsing or execution failed.";
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}
