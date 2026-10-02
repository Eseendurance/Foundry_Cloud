import nodemailer, { type Transporter } from "nodemailer";
import { randomUUID } from "crypto";
import { query } from "@/lib/db";

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
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

function siteUrl(): string {
  return process.env.SITE_URL || "https://example.com";
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
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const button = linkLabel
    ? `<p style="margin:24px 0;"><a href="${siteUrl()}/api/email/track/click/${id}" style="display:inline-block;padding:10px 20px;background:#33513c;color:#faf7f1;text-decoration:none;border-radius:999px;font-family:sans-serif;font-size:14px;">${escapeHtml(linkLabel)}</a></p>`
    : "";

  const pixel = `<img src="${siteUrl()}/api/email/track/open/${id}" width="1" height="1" alt="" style="display:block;" />`;

  return `<div style="font-family:sans-serif;color:#202b24;max-width:480px;">${paragraphs}${button}${pixel}</div>`;
}

export async function sendEmail(opts: {
  userId: string;
  to: string;
  subject: string;
  text: string;
  link?: { url: string; label: string };
}): Promise<{ messageId: string; trackingId: string }> {
  const from = process.env.EMAIL_FROM!;
  const trackingId = randomUUID();

  await query(
    "INSERT INTO sent_emails (id, user_id, to_email, subject, link_url) VALUES ($1, $2, $3, $4, $5)",
    [trackingId, opts.userId, opts.to, opts.subject, opts.link?.url || null]
  );

  const html = buildTrackedHtml(trackingId, opts.text, opts.link?.label);

  const info = await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html,
  });

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

export async function listSentEmails(userId: string): Promise<SentEmail[]> {
  return query<SentEmail>(
    "SELECT id, to_email, subject, sent_at, opened_at, click_count FROM sent_emails WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50",
    [userId]
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
