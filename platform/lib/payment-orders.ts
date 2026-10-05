import { query } from "@/lib/db";
import type { VerifiedPayment } from "@/lib/payments";

export type PaymentCompletion =
  | { result: "paid"; orderId: string }
  | { result: "already_paid"; orderId: string }
  | { result: "not_found" | "mismatch" | "invalid_state" };

export async function completePaystackOrder(
  payment: VerifiedPayment
): Promise<PaymentCompletion> {
  const orders = await query<{
    id: string;
    amount_minor: number;
    currency: string;
    status: string;
    email: string;
    provider_transaction_id: string | null;
  }>(
    `SELECT p.id, p.amount_minor, p.currency, p.status,
            u.email, p.provider_transaction_id
     FROM payment_orders p
     JOIN users u ON u.id = p.created_by
     WHERE p.reference = $1 AND p.method = 'PAYSTACK'`,
    [payment.reference]
  );
  const order = orders[0];
  if (!order) return { result: "not_found" };
  if (
    payment.amountMinor !== order.amount_minor ||
    payment.currency.toUpperCase() !== order.currency.toUpperCase() ||
    payment.email.toLowerCase() !== order.email.toLowerCase()
  ) {
    return { result: "mismatch" };
  }
  if (order.status === "PAID") {
    return order.provider_transaction_id === payment.transactionId
      ? { result: "already_paid", orderId: order.id }
      : { result: "mismatch" };
  }
  if (order.status !== "PENDING") return { result: "invalid_state" };

  const updated = await query<{ id: string }>(
    `UPDATE payment_orders
     SET status = 'PAID', provider_transaction_id = $1, paid_at = now(), updated_at = now()
     WHERE id = $2 AND status = 'PENDING'
     RETURNING id`,
    [payment.transactionId, order.id]
  );
  if (updated[0]) return { result: "paid", orderId: updated[0].id };

  const latest = await query<{ status: string; provider_transaction_id: string | null }>(
    `SELECT status, provider_transaction_id FROM payment_orders WHERE id = $1`,
    [order.id]
  );
  return latest[0]?.status === "PAID" &&
    latest[0].provider_transaction_id === payment.transactionId
    ? { result: "already_paid", orderId: order.id }
    : { result: "invalid_state" };
}
