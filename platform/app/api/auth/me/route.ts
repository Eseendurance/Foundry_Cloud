import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listUserOrganizations } from "@/lib/organizations";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  const organizations = await listUserOrganizations(session.userId);
  return NextResponse.json({
    user: { email: session.email },
    activeOrganizationId: session.organizationId,
    role: session.role,
    organizations,
  });
}
