import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { PaystackPaymentProvider } from "@/lib/payments";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

type PaymentOrder = {
  id: string;
  amount_minor: number;
  currency: string;
  description: string;
  method: string;
  status: string;
  reference: string;
  proof_mime: string | null;
  created_at: string;
  paid_at: string | null;
  created_by: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trustedSiteUrl(): string {
  const value = process.env.SITE_URL;
  if (!value) throw new Error("SITE_URL is not configured.");
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("SITE_URL must use HTTPS outside local development.");
  }
  return url.toString().replace(/\/+$/, "");
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const orders = await query<PaymentOrder>(
      `SELECT id, amount_minor, currency, description, method, status, reference,
              proof_mime, created_at, paid_at, created_by
       FROM payment_orders
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [session.organizationId]
    );
    return NextResponse.json({
      orders: orders.map(({ created_by, ...order }) => ({
        ...order,
        canUploadProof:
          order.method === "BANK_TRANSFER" &&
          order.status === "AWAITING_TRANSFER" &&
          created_by === session.userId,
        canConfirm:
          session.role !== "member" &&
          created_by !== session.userId &&
          order.method === "BANK_TRANSFER" &&
          order.status === "PROOF_SUBMITTED",
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list payments.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `payment-create:${session.organizationId}:${clientKey(request)}`,
      10,
      60 * 60_000
    )
  ) {
    return NextResponse.json({ error: "Payment order creation limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Payment details must be an object." }, { status: 400 });
  }
  const amountMinor = body.amountMinor;
  const currency = typeof body.currency === "string"
    ? body.currency.trim().toUpperCase()
    : (process.env.PAYSTACK_CURRENCY || "NGN").toUpperCase();
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const method = body.method;
  if (
    typeof amountMinor !== "number" ||
    !Number.isInteger(amountMinor) ||
    amountMinor < 100 ||
    amountMinor > 1_000_000_000
  ) {
    return NextResponse.json({ error: "Amount must be between 100 and 1000000000 minor currency units." }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Currency must be a three-letter ISO code." }, { status: 400 });
  }
  if (!description || description.length > 160) {
    return NextResponse.json({ error: "Description must be between 1 and 160 characters." }, { status: 400 });
  }
  if (method !== "PAYSTACK" && method !== "BANK_TRANSFER") {
    return NextResponse.json({ error: "Choose PAYSTACK or BANK_TRANSFER." }, { status: 400 });
  }
  if (method === "BANK_TRANSFER" && process.env.VERCEL === "1") {
    return NextResponse.json(
      { error: "Bank-transfer proof storage requires a self-hosted persistent volume." },
      { status: 503 }
    );
  }

  const id = randomUUID();
  const reference = `FC-${randomBytes(16).toString("hex").toUpperCase()}`;
  const orderStatus = method === "PAYSTACK" ? "PENDING" : "AWAITING_TRANSFER";
  let checkout: { checkoutUrl: string; accessCode: string } | null = null;

  if (method === "PAYSTACK") {
    try {
      const siteUrl = trustedSiteUrl();
      checkout = await new PaystackPaymentProvider().initialize({
        email: session.email,
        reference,
        amountMinor,
        currency,
        callbackUrl: `${siteUrl}/account?payment_id=${encodeURIComponent(id)}`,
        metadata: { orderId: id, organizationId: session.organizationId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not initialize Paystack checkout.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  } else if (
    !process.env.BANK_TRANSFER_BANK_NAME ||
    !process.env.BANK_TRANSFER_ACCOUNT_NAME ||
    !process.env.BANK_TRANSFER_ACCOUNT_NUMBER
  ) {
    return NextResponse.json(
      { error: "Bank transfer instructions are not configured by the platform operator." },
      { status: 503 }
    );
  }

  try {
    await query(
      `INSERT INTO payment_orders
         (id, organization_id, created_by, amount_minor, currency, description,
          method, status, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        session.organizationId,
        session.userId,
        amountMinor,
        currency,
        description,
        method,
        orderStatus,
        reference,
      ]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the payment order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(
    {
      order: { id, amountMinor, currency, description, method, status: orderStatus, reference },
      checkout,
      bankTransfer:
        method === "BANK_TRANSFER"
          ? {
              bankName: process.env.BANK_TRANSFER_BANK_NAME,
              accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME,
              accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER,
              reference,
            }
          : null,
    },
    { status: 201 }
  );
}
