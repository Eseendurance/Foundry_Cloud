import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listSentEmails } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  try {
    const emails = await listSentEmails(session.userId);
    return NextResponse.json({ emails });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't load sent emails.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
