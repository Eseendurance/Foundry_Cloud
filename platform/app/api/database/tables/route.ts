import { NextResponse } from "next/server";
import { RawDatabaseEngine } from "@/raw-engine/database/query";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const tables = await RawDatabaseEngine.listTables();
    return NextResponse.json({
      tables: tables.map((name) => ({
        name,
        columns: RawDatabaseEngine.getTableSchema(name),
      })),
      mode: "read-only",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list workspace tables.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
