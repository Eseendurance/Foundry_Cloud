import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { completePaystackOrder } from "@/lib/payment-orders";
import { PaystackPaymentProvider } from "@/lib/payments";
import { clientKey, rateLimitedPersistently } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (
    await rateLimitedPersistently(
      `payment-verify:${session.organizationId}:${clientKey(_request)}`,
      20,
      60 * 60_000
    )
  ) {
    return NextResponse.json({ error: "Payment verification limit exceeded." }, { status: 429 });
  }
  const { id } = await params;
  const orders = await query<{ reference: string; created_by: string }>(
    `SELECT reference, created_by FROM payment_orders
     WHERE id = $1 AND organization_id = $2 AND method = 'PAYSTACK'`,
    [id, session.organizationId]
  );
  const order = orders[0];
  if (!order) {
    return NextResponse.json({ error: "Payment order was not found." }, { status: 404 });
  }
  if (session.role === "member" && order.created_by !== session.userId) {
    return NextResponse.json({ error: "You cannot verify another member's payment." }, { status: 403 });
  }

  try {
    const payment = await new PaystackPaymentProvider().verify(order.reference);
    if (!payment) {
      return NextResponse.json({ error: "Paystack has not confirmed a successful payment." }, { status: 409 });
    }
    const completion = await completePaystackOrder(payment);
    if (completion.result === "paid" || completion.result === "already_paid") {
      return NextResponse.json({ status: "PAID", orderId: completion.orderId });
    }
    const message =
      completion.result === "mismatch"
        ? "Verified payment details do not match this order."
        : completion.result === "not_found"
          ? "No matching local payment order was found."
          : "This payment order is not eligible for verification.";
    return NextResponse.json({ error: message }, { status: 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
