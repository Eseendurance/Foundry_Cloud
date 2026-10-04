import { NextResponse } from "next/server";
import { RawDatabaseEngine } from "@/raw-engine/database/query";

export async function GET() {
  try {
    const tableList = await RawDatabaseEngine.listTables();
    return NextResponse.json({ tables: tableList });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list database tables.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}