import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const keys = await listApiKeys(session.organizationId);
    return NextResponse.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list API keys.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "A key name is required." }, { status: 400 });
    }
    if (body.name.trim().length > 80) {
      return NextResponse.json({ error: "Key name must be 80 characters or fewer." }, { status: 400 });
    }
    if (session.role === "member") {
      return NextResponse.json({ error: "Only workspace admins can create API keys." }, { status: 403 });
    }
    if (
      await rateLimitedPersistently(
        `api-key-create:${session.organizationId}:${clientKey(request)}`,
        10,
        60 * 60_000
      )
    ) {
      return NextResponse.json({ error: "API key creation limit exceeded." }, { status: 429 });
    }
    const key = await createApiKey(session.userId, session.organizationId, body.name.trim());
    return NextResponse.json({ success: true, ...key }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create API key.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}