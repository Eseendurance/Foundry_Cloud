import nodemailer, { type Transporter } from "nodemailer";
import { randomUUID } from "crypto";
import { isIP } from "node:net";
import { query } from "@/lib/db";
import { rateLimitedPersistently } from "@/lib/rate-limit";

export function smtpConfigured(): boolean {
  const port = Number(process.env.SMTP_PORT || 587);
  const sender = process.env.EMAIL_FROM || "";
  const mailbox = sender.match(/<([^<>]+)>/)?.[1] || sender;
  const validSender = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailbox);
  const warmupLimit = Number(process.env.SMTP_WARMUP_DAILY_LIMIT || 50);
  const heloHost = process.env.SMTP_HELO_HOST || "";
  return Boolean(
    process.env.SMTP_HOST &&
      validSender &&
      /^[A-Za-z0-9.-]+$/.test(heloHost) &&
      isIP(process.env.SMTP_PUBLIC_IP || "") &&
      Number.isInteger(port) &&
      port >= 1 &&
      port <= 65_535 &&
      Number.isInteger(warmupLimit) &&
      warmupLimit >= 1 &&
      warmupLimit <= 100_000 &&
      Boolean(process.env.SMTP_USER) === Boolean(process.env.SMTP_PASS)
  );
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      name: process.env.SMTP_HELO_HOST,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }
  return transporter;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl(): string | null {
  return process.env.SITE_URL?.replace(/\/+$/, "") || null;
}

async function enforceSendingWarmupLimit(): Promise<void> {
  const sender = process.env.EMAIL_FROM || "";
  const mailbox = sender.match(/<([^<>]+)>/)?.[1] || sender;
  const domain = mailbox.match(/^[^\s@]+@([^\s@]+)$/)?.[1]?.toLowerCase();
  const publicIp = process.env.SMTP_PUBLIC_IP;
  const dailyLimit = Number(process.env.SMTP_WARMUP_DAILY_LIMIT || 50);
  if (!domain || !publicIp || !isIP(publicIp)) {
    throw new Error("Set EMAIL_FROM to a valid sender and SMTP_PUBLIC_IP to the server's public IP before sending.");
  }
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 100_000) {
    throw new Error("SMTP_WARMUP_DAILY_LIMIT must be an integer from 1 to 100000.");
  }
  if (
    await rateLimitedPersistently(`smtp-domain:${domain}`, dailyLimit, 24 * 60 * 60_000)
  ) {
    throw new Error(`The 24-hour warm-up limit for sending domain ${domain} has been reached.`);
  }
  if (
    await rateLimitedPersistently(`smtp-ip:${publicIp}`, dailyLimit, 24 * 60 * 60_000)
  ) {
    throw new Error("The 24-hour warm-up limit for this sending IP has been reached.");
  }
}

/**
 * Builds the tracked HTML version: paragraphs, an optional tracked
 * button, and an invisible open-tracking pixel — same pattern Resend,
 * Mailchimp, etc. all use. The click link points at our own redirect
 * endpoint keyed only by the tracking id — the actual destination is
 * looked up server-side from what was stored at send time, never taken
 * from the request, so this can't be turned into an open redirect by
 * someone crafting their own URL to our domain.
 */
function buildTrackedHtml(id: string, text: string, linkLabel?: string): string {
  const baseUrl = siteUrl();
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const button = linkLabel && baseUrl
    ? `<p style="margin:24px 0;"><a href="${baseUrl}/api/email/track/click/${id}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;text-decoration:none;font-family:sans-serif;font-size:14px;">${escapeHtml(linkLabel)}</a></p>`
    : "";

  const pixel = baseUrl
    ? `<img src="${baseUrl}/api/email/track/open/${id}" width="1" height="1" alt="" style="display:block;" />`
    : "";

  return `<div style="font-family:sans-serif;color:#202b24;max-width:480px;">${paragraphs}${button}${pixel}</div>`;
}

export async function sendEmail(opts: {
  userId: string;
  organizationId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  link?: { url: string; label: string };
}): Promise<{ messageId: string; trackingId: string }> {
  if (!smtpConfigured()) {
    throw new Error("The local SMTP server is not configured.");
  }
  await enforceSendingWarmupLimit();
  const from = process.env.EMAIL_FROM!;
  const trackingId = randomUUID();
  const trackingPixel = siteUrl()
    ? `<img src="${siteUrl()}/api/email/track/open/${trackingId}" width="1" height="1" alt="" style="display:block" />`
    : "";
  const html = opts.html
    ? `${opts.html}${trackingPixel}`
    : buildTrackedHtml(trackingId, opts.text, opts.link?.label);

  const info = await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html,
  });

  await query(
    "INSERT INTO sent_emails (id, user_id, org_id, to_email, subject, link_url) VALUES ($1, $2, $3, $4, $5, $6)",
    [trackingId, opts.userId, opts.organizationId, opts.to, opts.subject, opts.link?.url || null]
  );

  return { messageId: info.messageId, trackingId };
}

export type SentEmail = {
  id: string;
  to_email: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  click_count: number;
};

export async function listSentEmails(organizationId: string): Promise<SentEmail[]> {
  return query<SentEmail>(
    "SELECT id, to_email, subject, sent_at, opened_at, click_count FROM sent_emails WHERE org_id = $1 ORDER BY sent_at DESC LIMIT 50",
    [organizationId]
  );
}

export async function recordOpen(id: string): Promise<void> {
  await query(
    "UPDATE sent_emails SET opened_at = COALESCE(opened_at, now()) WHERE id = $1",
    [id]
  );
}

/** Records the click and returns the real destination URL stored at
 * send time — the ONLY source of truth for where this redirects to. */
export async function recordClickAndGetDestination(id: string): Promise<string | null> {
  const rows = await query<{ link_url: string | null }>(
    "UPDATE sent_emails SET click_count = click_count + 1, opened_at = COALESCE(opened_at, now()) WHERE id = $1 RETURNING link_url",
    [id]
  );
  return rows[0]?.link_url || null;
}
