import { NextRequest } from "next/server";
import { recordOpen } from "@/lib/email";

export const runtime = "nodejs";

// A real, verified 1x1 transparent GIF — decoded and visually confirmed
// before shipping, not typed from memory.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Best-effort — an email client's image proxy shouldn't see an error
  // page just because the DB had a hiccup; the pixel must always render.
  try {
    await recordOpen(id);
  } catch {
    // swallow — tracking is not allowed to break email rendering
  }

  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
