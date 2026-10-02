import { parse } from "url";

export function evaluateSourceCompliance(targetUrl: string, rawPayload: any) {
  const parsed = parse(targetUrl);

  // 1. Ensure target URL is public (HTTP/HTTPS) and unauthenticated
  if (!parsed.protocol || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Compliance Error: Only public web endpoints allowed.");
  }

  // 2. Check stringified payload for personal emails (PII Filter)
  const payloadStr = JSON.stringify(rawPayload);
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  if (emailRegex.test(payloadStr)) {
    // Scrub or reject payloads containing unconsented PII
    return {
      safePayload: JSON.parse(payloadStr.replace(emailRegex, "[REDACTED_PII]")),
      warning: "PII Detected and Scrubbed",
    };
  }

  return { safePayload: rawPayload, warning: null };
}