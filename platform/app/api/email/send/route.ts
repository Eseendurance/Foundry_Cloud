import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendEmail, smtpConfigured } from "@/lib/email";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `email-send:${session.organizationId}:${clientKey(request)}`,
      10,
      60_000
    )
  ) {
    return NextResponse.json({ error: "Too many messages. Try again shortly." }, { status: 429 });
  }
  if (!smtpConfigured()) {
    return NextResponse.json({ error: "The local SMTP server is not configured." }, { status: 503 });
  }

  let body: {
    to?: unknown;
    subject?: unknown;
    html?: unknown;
    variables?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  if (typeof body.to !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.to)) {
    return NextResponse.json({ error: "Enter a valid recipient email address." }, { status: 400 });
  }
  if (
    typeof body.subject !== "string" ||
    !body.subject.trim() ||
    body.subject.length > 200 ||
    /[\r\n]/.test(body.subject)
  ) {
    return NextResponse.json({ error: "Enter a valid subject of at most 200 characters." }, { status: 400 });
  }
  if (typeof body.html !== "string" || !body.html.trim() || body.html.length > 200_000) {
    return NextResponse.json({ error: "HTML content is required and must be under 200 KB." }, { status: 400 });
  }

  let variables: Record<string, unknown> = {};
  if (body.variables !== undefined) {
    if (!body.variables || typeof body.variables !== "object" || Array.isArray(body.variables)) {
      return NextResponse.json({ error: "Template variables must be a JSON object." }, { status: 400 });
    }
    variables = body.variables as Record<string, unknown>;
  }

  const html = body.html.replace(
    /{{\s*([A-Za-z0-9_]+)\s*}}/g,
    (token, key: string) => {
      const value = variables[key];
      return value === undefined || value === null ? token : escapeHtml(String(value));
    }
  );

  try {
    const result = await sendEmail({
      userId: session.userId,
      organizationId: session.organizationId,
      to: body.to.trim(),
      subject: body.subject.trim(),
      html,
      text: plainTextFromHtml(html),
    });
    return NextResponse.json({ success: true, ...result }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP delivery failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
