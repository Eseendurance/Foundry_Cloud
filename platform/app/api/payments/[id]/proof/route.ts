import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const PAYMENT_PROOFS_DIR = "payment-proofs";
const SIGNATURES: Record<string, { extension: string; bytes: number[] }> = {
  "image/png": { extension: ".png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { extension: ".jpg", bytes: [0xff, 0xd8, 0xff] },
  "application/pdf": { extension: ".pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
};

function storageRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/
    process.env.FOUNDRY_STORAGE_DIR || path.join(process.cwd(), "raw-engine", "storage", "data")
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      { error: "Bank-transfer proof uploads require a self-hosted persistent volume." },
      { status: 503 }
    );
  }
  if (
    await rateLimitedPersistently(
      `payment-proof:${session.organizationId}:${clientKey(request)}`,
      10,
      60 * 60_000
    )
  ) {
    return NextResponse.json({ error: "Proof upload limit exceeded." }, { status: 429 });
  }
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (contentLengthHeader && !Number.isFinite(contentLength)) {
    return NextResponse.json({ error: "Content-Length header is invalid." }, { status: 400 });
  }
  if (contentLength > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Proof uploads must be under 3 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send a multipart form with a proof file." }, { status: 400 });
  }
  const file = form.get("proof");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A proof file is required." }, { status: 400 });
  }
  const signature = SIGNATURES[file.type];
  if (!signature || file.size < signature.bytes.length || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Upload a PNG, JPEG, or PDF smaller than 3 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!signature.bytes.every((byte, index) => bytes[index] === byte)) {
    return NextResponse.json({ error: "File contents do not match the declared media type." }, { status: 400 });
  }
  const { id } = await params;
  const order = await query<{ id: string }>(
    `SELECT id FROM payment_orders
     WHERE id = $1 AND organization_id = $2 AND created_by = $3
       AND method = 'BANK_TRANSFER' AND status = 'AWAITING_TRANSFER'`,
    [id, session.organizationId, session.userId]
  );
  if (!order[0]) {
    return NextResponse.json({ error: "Transfer order not found or it is no longer awaiting proof." }, { status: 404 });
  }

  const directory = path.join(storageRoot(), PAYMENT_PROOFS_DIR);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = `${randomBytes(24).toString("hex")}${signature.extension}`;
  const absolutePath = path.join(directory, filename);
  const relativePath = path.join(PAYMENT_PROOFS_DIR, filename);
  try {
    await writeFile(absolutePath, bytes, { flag: "wx", mode: 0o600 });
    const updated = await query<{ id: string }>(
      `UPDATE payment_orders SET proof_file = $1, proof_mime = $2, status = 'PROOF_SUBMITTED',
                               updated_at = now()
       WHERE id = $3 AND organization_id = $4 AND created_by = $5
         AND method = 'BANK_TRANSFER' AND status = 'AWAITING_TRANSFER'
       RETURNING id`,
      [relativePath, file.type, id, session.organizationId, session.userId]
    );
    if (!updated[0]) {
      await rm(absolutePath, { force: true });
      return NextResponse.json({ error: "Transfer order changed while the proof was uploaded." }, { status: 409 });
    }
  } catch (error) {
    await rm(absolutePath, { force: true });
    const message = error instanceof Error ? error.message : "Could not save transfer proof.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ submitted: true, status: "PROOF_SUBMITTED" });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const orders = await query<{
    proof_file: string | null;
    proof_mime: string | null;
    created_by: string;
  }>(
    `SELECT proof_file, proof_mime, created_by FROM payment_orders
     WHERE id = $1 AND organization_id = $2`,
    [id, session.organizationId]
  );
  const order = orders[0];
  if (!order?.proof_file || !order.proof_mime) {
    return NextResponse.json({ error: "Payment proof was not found." }, { status: 404 });
  }
  if (session.role === "member" && order.created_by !== session.userId) {
    return NextResponse.json({ error: "You cannot view another member's payment proof." }, { status: 403 });
  }

  const root = storageRoot();
  const filePath = path.resolve(root, order.proof_file);
  if (!filePath.startsWith(`${path.join(root, PAYMENT_PROOFS_DIR)}${path.sep}`)) {
    return NextResponse.json({ error: "Stored proof path is invalid." }, { status: 500 });
  }
  try {
    const file = await readFile(/*turbopackIgnore: true*/ filePath);
    const body = new Uint8Array(file.byteLength);
    body.set(file);
    return new Response(body, {
      headers: {
        "Content-Type": order.proof_mime,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": order.proof_mime === "application/pdf" ? "attachment" : "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "The stored proof file is missing." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Could not read the proof file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
