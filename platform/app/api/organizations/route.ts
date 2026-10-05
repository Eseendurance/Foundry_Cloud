import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createOrganizationInvitation,
  getOrganizationMembers,
} from "@/lib/organizations";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const members = await getOrganizationMembers(session.organizationId);
    return NextResponse.json({ organizationId: session.organizationId, role: session.role, members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load workspace members.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.role === "member") {
    return NextResponse.json({ error: "Only workspace admins can invite members." }, { status: 403 });
  }
  if (
    await rateLimitedPersistently(
      `organization-invite:${session.organizationId}:${clientKey(request)}`,
      10,
      60 * 60_000
    )
  ) {
    return NextResponse.json({ error: "Invitation creation limit exceeded." }, { status: 429 });
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "admin" ? "admin" : body.role === "member" ? "member" : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid member email address." }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "Role must be admin or member." }, { status: 400 });
  }

  try {
    const invitation = await createOrganizationInvitation({
      organizationId: session.organizationId,
      userId: session.userId,
      email,
      role,
    });
    const baseUrl = process.env.SITE_URL?.replace(/\/+$/, "");
    const inviteUrl = baseUrl
      ? `${baseUrl}/account#invite=${encodeURIComponent(invitation.token)}`
      : null;
    return NextResponse.json(
      {
        invitationUrl: inviteUrl,
        token: inviteUrl ? undefined : invitation.token,
        expiresAt: invitation.expiresAt,
        delivery: "manual",
        message: "Share this one-time link with the invited address. The recipient must sign in with that email before accepting.",
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the invitation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
