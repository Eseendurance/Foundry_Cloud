import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { databaseConfigured, withTransaction } from "@/lib/db";
import { hashPassword, createSession, authConfigured } from "@/lib/auth";
import { rateLimitedPersistently, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  if (!databaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "This module needs a DATABASE_URL set in your Vercel project's environment variables. Nothing is created until it's connected — see the README.",
      },
      { status: 500 }
    );
  }
  if (await rateLimitedPersistently(`signup:${clientKey(req)}`, 8, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Wait a bit and try again." },
      { status: 429 }
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
  if (body.organizationName !== undefined && typeof body.organizationName !== "string") {
    return NextResponse.json({ error: "Workspace name must be text." }, { status: 400 });
  }
  const organizationName =
    (typeof body.organizationName === "string" && body.organizationName.trim()) ||
    `${email.split("@")[0] || "Personal"}'s workspace`;

  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid email address." },
      { status: 400 }
    );
  }
  if (password.length < 8 || password.length > 128 || Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json(
      { error: "Use a password with 8 to 128 characters and no more than 72 UTF-8 bytes." },
      { status: 400 }
    );
  }
  if (!organizationName || organizationName.length > 100) {
    return NextResponse.json(
      { error: "Workspace name must be between 1 and 100 characters." },
      { status: 400 }
    );
  }

  try {
    const id = randomUUID();
    const organizationId = randomUUID();
    const passwordHash = await hashPassword(password);
    await withTransaction(async (client) => {
      await client.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)",
        [id, email, passwordHash]
      );
      await client.query(
        "INSERT INTO organizations (id, name) VALUES ($1, $2)",
        [organizationId, organizationName]
      );
      await client.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [organizationId, id]
      );
    });
    await createSession(id, email, organizationId, "owner");

    return NextResponse.json({ email, organization: { id: organizationId, name: organizationName } });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "23505"
    ) {
      return NextResponse.json(
        { error: "An account with that email already exists. Log in instead." },
        { status: 409 }
      );
    }
    const msg = err instanceof Error ? err.message : "Signup failed.";
    return NextResponse.json(
      { error: `Couldn't reach the database: ${msg}` },
      { status: 500 }
    );
  }
}
