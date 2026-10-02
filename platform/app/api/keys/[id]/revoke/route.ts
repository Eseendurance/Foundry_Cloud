import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revokeApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const { id } = await params;
  const ok = await revokeApiKey(session.userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Key not found, or already revoked." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
