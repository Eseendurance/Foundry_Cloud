import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { from, to, subject, html, variables } = await req.json();

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Recipient 'to' and 'subject' are required." },
        { status: 400 }
      );
    }

    // Process dynamic template variables (SendPulse / Resend style interpolation)
    let processedHtml = html || "<p>No content provided</p>";
    if (variables && typeof variables === "object") {
      Object.entries(variables).forEach(([key, val]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        processedHtml = processedHtml.replace(regex, String(val));
      });
    }

    // Generate mock dispatch metadata linking directly to the Raw Engine trace
    const deliveryId = `msg_${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = new Date().toISOString();

    return NextResponse.json({
      success: true,
      id: deliveryId,
      status: "queued",
      from: from || "noreply@briefgroup.net",
      to,
      subject,
      renderedHtml: processedHtml,
      timestamp,
      rawEngineTraceId: `raw_tr_${Math.random().toString(36).substring(2, 8)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Email dispatch failed" }, { status: 500 });
  }
}