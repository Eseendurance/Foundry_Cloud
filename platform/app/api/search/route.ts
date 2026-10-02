import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { searchProjects } from "@/lib/search";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

  const q = req.nextUrl.searchParams.get("q") || "";

  try {
    const hits = await searchProjects(session.userId, q);
    return NextResponse.json({ hits });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
