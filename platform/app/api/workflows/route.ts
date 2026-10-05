import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  validateWorkflowGraph,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/raw-engine/workflows/engine";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const nodeTypes: WorkflowNode["type"][] = [
  "trigger",
  "transform",
  "condition",
  "delay",
  "database",
  "action",
];

function isWorkflowNodeType(value: unknown): value is WorkflowNode["type"] {
  return typeof value === "string" && nodeTypes.some((type) => type === value);
}

function parseNode(value: unknown): WorkflowNode | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isWorkflowNodeType(value.type) ||
    !isRecord(value.data)
  ) {
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
    const workflows = await query<{
      id: string;
      name: string;
      nodes_json: WorkflowNode[];
      edges_json: WorkflowEdge[];
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, name, nodes_json, edges_json, is_active, created_at, updated_at
       FROM workflows WHERE org_id = $1
       ORDER BY updated_at DESC LIMIT 100`,
      [session.organizationId]
    );
    return NextResponse.json({ workflows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list workflows.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Workflow must be an object." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Workflow name must be between 1 and 100 characters." }, { status: 400 });
  }
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return NextResponse.json({ error: "Provide nodes and edges arrays." }, { status: 400 });
  }
  const parsedNodes = body.nodes.map(parseNode);
  const parsedEdges = body.edges.map(parseEdge);
  if (parsedNodes.some((node) => node === null) || parsedEdges.some((edge) => edge === null)) {
    return NextResponse.json({ error: "Workflow nodes or connections are malformed." }, { status: 400 });
  }
  const nodes = parsedNodes.filter((node): node is WorkflowNode => node !== null);
  const edges = parsedEdges.filter((edge): edge is WorkflowEdge => edge !== null);
  const validationError = validateWorkflowGraph(nodes, edges);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (
    body.id !== undefined &&
    (typeof body.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id))
  ) {
    return NextResponse.json({ error: "Workflow id must be a valid UUID." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : randomUUID();

  try {
    if (body.id === undefined) {
      await query(
        `INSERT INTO workflows (id, org_id, name, nodes_json, edges_json)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
        [id, session.organizationId, name, JSON.stringify(nodes), JSON.stringify(edges)]
      );
    } else {
      const updated = await query<{ id: string }>(
        `UPDATE workflows
         SET name = $1, nodes_json = $2::jsonb, edges_json = $3::jsonb,
             updated_at = now()
         WHERE id = $4 AND org_id = $5
         RETURNING id`,
        [name, JSON.stringify(nodes), JSON.stringify(edges), id, session.organizationId]
      );
      if (!updated[0]) {
        return NextResponse.json({ error: "Workflow not found in the active workspace." }, { status: 404 });
      }
    }
    return NextResponse.json({ id, name, nodes, edges }, { status: body.id === undefined ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save workflow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
