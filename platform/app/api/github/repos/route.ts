import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConnection, listRepos } from "@/lib/github";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const conn = await getConnection(session.userId);
  if (!conn) {
    return NextResponse.json({ error: "Not connected to GitHub yet." }, { status: 400 });
  }

  try {
    const repos = await listRepos(conn.token);
    return NextResponse.json({ repos });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't list repos.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
