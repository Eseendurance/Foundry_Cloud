import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query, databaseConfigured } from "@/lib/db";
import { hashPassword, createSession, authConfigured } from "@/lib/auth";
import { rateLimited, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (rateLimited(`signup:${clientKey(req)}`, 8, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Wait a bit and try again." },
      { status: 429 }
    );
  }

  if (!databaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "This module needs a DATABASE_URL set in your Vercel project's environment variables. Nothing is created until it's connected — see the README.",
      },
      { status: 500 }
    );
  }
  if (!authConfigured()) {
    return NextResponse.json(
      {
        error:
          "This module needs a JWT_SECRET set in your Vercel project's environment variables. See the README.",
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

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid email address." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Use a password with at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with that email already exists. Log in instead." },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    await query(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)",
      [id, email, passwordHash]
    );
    await createSession(id, email);

    return NextResponse.json({ email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signup failed.";
    return NextResponse.json(
      { error: `Couldn't reach the database: ${msg}` },
      { status: 500 }
    );
  }
}
