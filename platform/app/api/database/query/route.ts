import { NextRequest, NextResponse } from "next/server";
import { RawDatabaseEngine } from "@/raw-engine/database/query";
import { getSession } from "@/lib/auth";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `database-explorer:${session.organizationId}:${clientKey(request)}`,
      60,
      60_000
    )
  ) {
    return NextResponse.json({ error: "Workspace data explorer request limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.table !== "string") {
    return NextResponse.json({ error: "Choose an allowed workspace table." }, { status: 400 });
  }
  const limit = body.limit === undefined ? 100 : body.limit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "limit must be an integer from 1 to 100." }, { status: 400 });
  }

  try {
    const tables = await RawDatabaseEngine.listTables();
    if (!tables.includes(body.table)) {
      return NextResponse.json({ error: "That table is not available in the workspace data explorer." }, { status: 400 });
    }
    const [rows, columns] = await Promise.all([
      RawDatabaseEngine.executeQuery(body.table, session.organizationId, limit),
      Promise.resolve(RawDatabaseEngine.getTableSchema(body.table)),
    ]);
    return NextResponse.json({ table: body.table, columns, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not query workspace data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
