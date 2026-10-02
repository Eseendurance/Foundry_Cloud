import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { removeConnection } from "@/lib/github";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }
  await removeConnection(session.userId);
  return NextResponse.json({ ok: true });
}
