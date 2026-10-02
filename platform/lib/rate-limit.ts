const hits = new Map<string, number[]>();

/**
 * Simple sliding-window rate limiter, per key, in memory. Good enough to
 * stop casual abuse of routes that call paid third-party APIs (the app
 * builder, voice synthesis). Resets on cold start — swap for a
 * Redis-backed limiter (e.g. Upstash) if you need it to hold across
 * instances or survive restarts.
 */
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
