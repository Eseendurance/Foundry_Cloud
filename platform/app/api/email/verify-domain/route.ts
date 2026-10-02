import { NextRequest, NextResponse } from "next/server";
import { checkDomainAuth, isValidDomain } from "@/lib/dns";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const domain = (req.nextUrl.searchParams.get("domain") || "")
    .trim()
    .toLowerCase();

  if (!isValidDomain(domain)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid domain." },
      { status: 400 }
    );
  }

  try {
    const result = await checkDomainAuth(domain);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DNS lookup failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
