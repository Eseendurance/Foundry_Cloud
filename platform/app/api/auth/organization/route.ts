import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/auth";
import { listUserOrganizations } from "@/lib/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { organizationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  if (typeof body.organizationId !== "string") {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  try {
    const organizations = await listUserOrganizations(session.userId);
    const organization = organizations.find((item) => item.id === body.organizationId);
    if (!organization) {
      return NextResponse.json({ error: "You are not a member of that workspace." }, { status: 403 });
    }
    await createSession(session.userId, session.email, organization.id, organization.role);
    return NextResponse.json({ organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not switch workspace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
