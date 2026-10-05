import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifiedPayment = {
  reference: string;
  transactionId: string;
  amountMinor: number;
  currency: string;
  email: string;
};

export interface PaymentProvider {
  initialize(input: {
    email: string;
    reference: string;
    amountMinor: number;
    currency: string;
    callbackUrl: string;
    metadata: Record<string, string>;
  }): Promise<{ checkoutUrl: string; accessCode: string }>;
  verify(reference: string): Promise<VerifiedPayment | null>;
  refund(reference: string, amountMinor: number, reason: string): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class PaystackPaymentProvider implements PaymentProvider {
  private readonly secretKey: string;
  private readonly apiBase = "https://api.paystack.co";

  constructor(secretKey = process.env.PAYSTACK_SECRET_KEY || "") {
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured.");
    this.secretKey = secretKey;
  }

  private async call(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`Paystack returned a non-JSON response (${response.status}).`);
    }
    if (
      !response.ok ||
      !isRecord(body) ||
      !("status" in body) ||
      body.status !== true ||
      !isRecord(body.data)
    ) {
      const message =
        typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
          ? body.message
          : `Paystack request failed (${response.status}).`;
      throw new Error(message);
    }
    return body.data;
  }

  async initialize(input: {
    email: string;
    reference: string;
    amountMinor: number;
    currency: string;
    callbackUrl: string;
    metadata: Record<string, string>;
  }): Promise<{ checkoutUrl: string; accessCode: string }> {
    const data = await this.call("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        reference: input.reference,
        amount: input.amountMinor,
        currency: input.currency,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });
    if (
      typeof data.authorization_url !== "string" ||
      typeof data.access_code !== "string"
    ) {
      throw new Error("Paystack response did not include a checkout URL.");
    }
    const url = new URL(data.authorization_url);
    if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com") {
      throw new Error("Paystack returned an unexpected checkout URL.");
    }
    return { checkoutUrl: url.toString(), accessCode: data.access_code };
  }

  async verify(reference: string): Promise<VerifiedPayment | null> {
    const data = await this.call(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET" }
    );
    if (data.status !== "success") return null;
    const customer =
      typeof data.customer === "object" && data.customer !== null ? data.customer : null;
    const email =
      customer && "email" in customer && typeof customer.email === "string"
        ? customer.email.toLowerCase()
        : "";
    if (
      typeof data.reference !== "string" ||
      typeof data.id !== "number" ||
      typeof data.amount !== "number" ||
      typeof data.currency !== "string" ||
      !email
    ) {
      throw new Error("Paystack verification response is missing required payment details.");
    }
    return {
      reference: data.reference,
      transactionId: String(data.id),
      amountMinor: data.amount,
      currency: data.currency,
      email,
    };
  }

  async refund(reference: string, amountMinor: number, reason: string): Promise<void> {
    await this.call("/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction: reference,
        amount: amountMinor,
        customer_note: reason.slice(0, 160),
      }),
    });
  }
}

export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature || !/^[a-fA-F0-9]{128}$/.test(signature)) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
