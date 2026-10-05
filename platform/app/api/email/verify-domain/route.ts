import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkMailReadiness } from "@/lib/mail-readiness";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `mail-readiness:${session.organizationId}:${clientKey(req)}`,
      5,
      60_000
    )
  ) {
    return NextResponse.json({ error: "Readiness check limit exceeded." }, { status: 429 });
  }
  const domain = (req.nextUrl.searchParams.get("domain") || "")
    .trim()
    .toLowerCase();
  const selector =
    req.nextUrl.searchParams.get("selector") || process.env.DKIM_SELECTOR || null;
  if (!domain) {
    return NextResponse.json(
      { error: "A sending domain is required." },
      { status: 400 }
    );
  }

  try {
    const result = await checkMailReadiness(domain, selector);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DNS lookup failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
