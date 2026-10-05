import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { PaystackPaymentProvider } from "@/lib/payments";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.role === "member") {
    return NextResponse.json({ error: "Only workspace admins can issue refunds." }, { status: 403 });
  }
  if (
    await rateLimitedPersistently(
      `payment-refund:${session.organizationId}:${clientKey(request)}`,
      5,
      60 * 60_000
    )
  ) {
    return NextResponse.json({ error: "Refund request limit exceeded." }, { status: 429 });
  }
  const { id } = await params;
  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON refund reason." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > 160) {
    return NextResponse.json({ error: "Refund reason must be between 1 and 160 characters." }, { status: 400 });
  }
  let provider: PaystackPaymentProvider;
  try {
    provider = new PaystackPaymentProvider();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment provider is not configured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const orders = await query<{ reference: string; amount_minor: number }>(
    `UPDATE payment_orders
     SET status = 'REFUND_PENDING', updated_at = now()
     WHERE id = $1 AND organization_id = $2 AND method = 'PAYSTACK' AND status = 'PAID'
     RETURNING reference, amount_minor`,
    [id, session.organizationId]
  );
  if (!orders[0]) {
    return NextResponse.json({ error: "Only paid Paystack orders can be refunded." }, { status: 409 });
  }
  try {
    await provider.refund(orders[0].reference, orders[0].amount_minor, reason);
    return NextResponse.json({
      status: "REFUND_PENDING",
      message: "Paystack accepted the refund request. The order remains pending until a signed refund confirmation is received.",
    }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund request failed.";
    return NextResponse.json(
      { error: `${message} The order remains REFUND_PENDING for operator reconciliation; do not retry blindly.` },
      { status: 502 }
    );
  }
}
