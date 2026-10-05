import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/auth";
import { acceptOrganizationInvitation } from "@/lib/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in before accepting a workspace invitation." }, { status: 401 });
  }

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  if (typeof body.token !== "string" || body.token.length < 32 || body.token.length > 128) {
    return NextResponse.json({ error: "A valid invitation token is required." }, { status: 400 });
  }

  try {
    const organization = await acceptOrganizationInvitation(
      body.token,
      session.userId,
      session.email
    );
    if (!organization) {
      return NextResponse.json(
        { error: "The invitation is invalid, expired, already used, or addressed to another email." },
        { status: 404 }
      );
    }
    await createSession(session.userId, session.email, organization.id, organization.role);
    return NextResponse.json({ organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not accept the invitation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
