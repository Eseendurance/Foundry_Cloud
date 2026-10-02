import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory rate limiter (per server instance). Good enough to stop basic
// abuse; swap for a Redis-backed limiter (e.g. Upstash) once traffic
// justifies it.
const recent = new Map<string, number>();
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  let body: { email?: string; what?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Send this as JSON with an email field." },
      { status: 400 }
    );
  }

  const email = (body.email || "").trim().toLowerCase();
  const what = (body.what || "").trim().slice(0, 500);

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid email address." },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const key = `${ip}:${email}`;
  const last = recent.get(key);
  const now = Date.now();

  if (last && now - last < WINDOW_MS) {
    return NextResponse.json(
      { error: "You already submitted that. Give it a minute." },
      { status: 429 }
    );
  }
  recent.set(key, now);

  // Persist the signup. This logs to the platform's function logs today —
  // visible in `vercel logs` or the Vercel dashboard — which is real and
  // inspectable. Point this at a database (Postgres, Supabase, etc.) as
  // soon as Module B (BaaS) ships, without changing the form or this
  // route's contract.
  console.log(
    JSON.stringify({
      event: "waitlist_signup",
      email,
      interest: what || null,
      at: new Date().toISOString(),
    })
  );

  return NextResponse.json({
    message:
      "We log every signup and read them in order. If you told us what you're building, that's what we'll prioritize.",
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "This endpoint only accepts POST requests." },
    { status: 405 }
  );
}
