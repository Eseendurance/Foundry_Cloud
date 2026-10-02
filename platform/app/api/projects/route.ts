import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query, databaseConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

type ProjectRow = { id: string; name: string; created_at: string };

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL isn't set. See the README." },
      { status: 500 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  try {
    const rows = await query<ProjectRow>(
      "SELECT id, name, created_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC",
      [session.userId]
    );
    return NextResponse.json({ projects: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't load projects.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!databaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL isn't set. See the README." },
      { status: 500 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  const name = (body.name || "").trim().slice(0, 120);
  if (!name) {
    return NextResponse.json({ error: "Give the project a name." }, { status: 400 });
  }

  try {
    const id = randomUUID();
    const rows = await query<ProjectRow>(
      "INSERT INTO projects (id, user_id, name) VALUES ($1, $2, $3) RETURNING id, name, created_at",
      [id, session.userId, name]
    );
    return NextResponse.json({ project: rows[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't save the project.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
