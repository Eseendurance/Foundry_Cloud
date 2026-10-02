import { NextRequest, NextResponse } from "next/server";
import { query, databaseConfigured } from "@/lib/db";
import { verifyPassword, createSession, authConfigured } from "@/lib/auth";
import { rateLimited, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (rateLimited(`login:${clientKey(req)}`, 15, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many login attempts. Wait a bit and try again." },
      { status: 429 }
    );
  }

  if (!databaseConfigured() || !authConfigured()) {
    return NextResponse.json(
      {
        error:
          "This module needs DATABASE_URL and JWT_SECRET set in your Vercel project's environment variables. See the README.",
      },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Send this as JSON with email and password." },
      { status: 400 }
    );
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  try {
    const rows = await query<{ id: string; password_hash: string }>(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No account with that email. Sign up instead." },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, rows[0].password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Wrong password." },
        { status: 401 }
      );
    }

    await createSession(rows[0].id, email);
    return NextResponse.json({ email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed.";
    return NextResponse.json(
      { error: `Couldn't reach the database: ${msg}` },
      { status: 500 }
    );
  }
}
