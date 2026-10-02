import { NextRequest, NextResponse } from "next/server";
import { recordClickAndGetDestination } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let destination: string | null = null;
  try {
    destination = await recordClickAndGetDestination(id);
  } catch {
    // fall through — show a plain landing page below rather than a raw error
  }

  if (!destination) {
    // No link was attached to this email, the id is unknown, or the DB
    // had an issue — land somewhere real instead of a broken redirect.
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const url = new URL(destination);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.redirect(destination);
}
