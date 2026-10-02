import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConnection, githubConfigured } from "@/lib/github";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  if (!githubConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  const conn = await getConnection(session.userId);
  return NextResponse.json({
    configured: true,
    connected: Boolean(conn),
    login: conn?.login || null,
  });
}
