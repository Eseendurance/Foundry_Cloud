import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  RawWorkflowEngine,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/raw-engine/workflows/engine";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

const NODE_TYPES: WorkflowNode["type"][] = [
  "trigger",
  "transform",
  "condition",
  "delay",
  "database",
  "action",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkflowNodeType(value: unknown): value is WorkflowNode["type"] {
  return typeof value === "string" && NODE_TYPES.some((type) => type === value);
}

function parseNode(value: unknown): WorkflowNode | null {
  if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.data)) {
    return null;
  }
  if (!isWorkflowNodeType(value.type)) {
    return null;
  }
  return {
    id: value.id,
    type: value.type,
    data: value.data,
  };
}

function parseEdge(value: unknown): WorkflowEdge | null {
  if (!isRecord(value) || typeof value.source !== "string" || typeof value.target !== "string") {
    return null;
  }
  if (value.condition !== undefined && value.condition !== "true" && value.condition !== "false") {
    return null;
  }
  return {
    source: value.source,
    target: value.target,
    ...(value.condition ? { condition: value.condition } : {}),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const executions = await query<{
      id: string;
      succeeded: boolean;
      steps: unknown;
      created_at: string;
    }>(
      `SELECT id, succeeded, steps, created_at
       FROM workflow_execution_logs
       WHERE organization_id = $1
       ORDER BY created_at DESC LIMIT 100`,
      [session.organizationId]
    );
    return NextResponse.json({ executions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load execution history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `workflow:${session.organizationId}:${clientKey(request)}`,
      20,
      60_000
    )
  ) {
    return NextResponse.json({ error: "Workflow execution limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Workflow execution payload must be an object." }, { status: 400 });
  }
  if (
    !Array.isArray(body.nodes) ||
    !Array.isArray(body.edges) ||
    !isRecord(body.triggerPayload)
  ) {
    return NextResponse.json(
      { error: "Provide nodes, edges, and an object triggerPayload." },
      { status: 400 }
    );
  }

  const nodes = body.nodes.map(parseNode);
  const edges = body.edges.map(parseEdge);
  if (nodes.some((node) => node === null) || edges.some((edge) => edge === null)) {
    return NextResponse.json({ error: "Workflow nodes or connections are malformed." }, { status: 400 });
  }
  const startedAt = Date.now();
  const result = await RawWorkflowEngine.executeGraph(
    nodes.filter((node): node is WorkflowNode => node !== null),
    edges.filter((edge): edge is WorkflowEdge => edge !== null),
    body.triggerPayload
  );

  try {
    await query(
      `INSERT INTO workflow_execution_logs
         (id, organization_id, user_id, succeeded, steps)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        randomUUID(),
        session.organizationId,
        session.userId,
        result.success,
        JSON.stringify(
          result.logs.map(({ nodeId, type, durationMs, output }) => ({
            nodeId,
            type,
            durationMs,
            failed: isRecord(output) && typeof output.error === "string",
          }))
        ),
      ]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record workflow execution.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(
    { ...result, durationMs: Date.now() - startedAt },
    { status: result.success ? 200 : 422 }
  );
}
