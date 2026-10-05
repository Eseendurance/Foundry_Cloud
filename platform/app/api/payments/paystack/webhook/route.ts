import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { completePaystackOrder } from "@/lib/payment-orders";
import { PaystackPaymentProvider, verifyPaystackSignature } from "@/lib/payments";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Webhook body is not valid JSON." }, { status: 400 });
  }
  if (!isRecord(event) || typeof event.event !== "string" || !isRecord(event.data)) {
    return NextResponse.json({ error: "Webhook event payload is malformed." }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const reference = event.data.reference;
    if (typeof reference !== "string") {
      return NextResponse.json({ error: "Successful charge has no reference." }, { status: 400 });
    }
    try {
      const payment = await new PaystackPaymentProvider().verify(reference);
      if (!payment) {
        return NextResponse.json({ error: "Provider verification has not confirmed the charge." }, { status: 409 });
      }
      const completion = await completePaystackOrder(payment);
      if (completion.result === "not_found" || completion.result === "mismatch") {
        return NextResponse.json({ error: "Charge does not match a pending Foundry order." }, { status: 409 });
      }
      return NextResponse.json({ received: true, status: completion.result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Charge verification failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (event.event === "refund.processed") {
    const reference = event.data.transaction_reference;
    const amountMinor = event.data.amount;
    const currency = event.data.currency;
    if (
      typeof reference !== "string" ||
      typeof amountMinor !== "number" ||
      typeof currency !== "string"
    ) {
      return NextResponse.json({ error: "Refund confirmation is missing transaction details." }, { status: 400 });
    }
    const updated = await query<{ id: string }>(
      `UPDATE payment_orders
       SET status = 'REFUNDED', updated_at = now()
       WHERE reference = $1 AND status = 'REFUND_PENDING'
         AND amount_minor = $2 AND upper(currency) = upper($3)
       RETURNING id`,
      [reference, amountMinor, currency]
    );
    if (!updated[0]) {
      return NextResponse.json({ error: "Refund event does not match a pending full refund." }, { status: 409 });
    }
    return NextResponse.json({ received: true, status: "REFUNDED" });
  }

  return NextResponse.json({ received: true, ignored: true });
}
