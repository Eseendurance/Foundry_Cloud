import { query } from "@/lib/db";

let lastPersistentCleanup = 0;

export async function rateLimitedPersistently(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (!key || key.length > 250 || !Number.isInteger(limit) || limit < 1 || windowMs < 1) {
    throw new Error("Persistent rate-limit configuration is invalid.");
  }
  const rows = await query<{ allowed: boolean }>(
    `INSERT INTO rate_limit_buckets (bucket_key, window_started_at, request_count)
     VALUES ($1, now(), 1)
     ON CONFLICT (bucket_key) DO UPDATE SET
       request_count = CASE
         WHEN rate_limit_buckets.window_started_at <=
              now() - ($2::double precision * INTERVAL '1 millisecond')
           THEN 1
         ELSE rate_limit_buckets.request_count + 1
       END,
       window_started_at = CASE
         WHEN rate_limit_buckets.window_started_at <=
              now() - ($2::double precision * INTERVAL '1 millisecond')
           THEN now()
         ELSE rate_limit_buckets.window_started_at
       END,
       updated_at = now()
     RETURNING request_count <= $3 AS allowed`,
    [key, windowMs, limit]
  );

  const now = Date.now();
  if (now - lastPersistentCleanup > 6 * 60 * 60_000) {
    await query(
      `DELETE FROM rate_limit_buckets
       WHERE window_started_at < now() - INTERVAL '1 day'`
    );
    lastPersistentCleanup = now;
  }
  return !rows[0]?.allowed;
}

export function clientKey(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  const trustedHop = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).pop();
  return trustedHop || "unknown";
}
