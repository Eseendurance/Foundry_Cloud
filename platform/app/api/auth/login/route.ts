import { NextRequest, NextResponse } from "next/server";
import { query, databaseConfigured } from "@/lib/db";
import { verifyPassword, createSession, authConfigured } from "@/lib/auth";
import { rateLimitedPersistently, clientKey } from "@/lib/rate-limit";
import { ensureUserOrganization } from "@/lib/organizations";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  if (!databaseConfigured() || !authConfigured()) {
    return NextResponse.json(
      {
        error:
          "This module needs DATABASE_URL and JWT_SECRET set in your Vercel project's environment variables. See the README.",
      },
      { status: 500 }
    );
  }
  if (await rateLimitedPersistently(`login:${clientKey(req)}`, 15, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many login attempts. Wait a bit and try again." },
      { status: 429 }
    );
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Send this as JSON with email and password." },
      { status: 400 }
    );
  }
  if (!isRecord(parsed)) {
    return NextResponse.json({ error: "Send this as a JSON object." }, { status: 400 });
  }
  const body = parsed;

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email.length > 254 || password.length > 128) {
    return NextResponse.json({ error: "Email or password is too long." }, { status: 400 });
  }

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

    const organization = await ensureUserOrganization(rows[0].id, email);
    await createSession(rows[0].id, email, organization.id, organization.role);
    return NextResponse.json({ email, organization });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed.";
    return NextResponse.json(
      { error: `Couldn't reach the database: ${msg}` },
      { status: 500 }
    );
  }
}
