import { randomBytes, createHash, randomUUID } from "crypto";
import { query } from "@/lib/db";

const PREFIX = "fg_live_";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function preview(key: string): string {
  return `${key.slice(0, PREFIX.length + 6)}…${key.slice(-4)}`;
}

export type ApiKeyRecord = {
  id: string;
  name: string;
  preview: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

/** Creates a new key. Returns the full plaintext key — this is the only time it's ever available. */
export async function createApiKey(
  userId: string,
  organizationId: string,
  name: string
): Promise<{ id: string; key: string; preview: string; created_at: string }> {
  const key = `${PREFIX}${randomBytes(24).toString("base64url")}`;
  const id = randomUUID();
  const rows = await query<{ created_at: string }>(
    `INSERT INTO api_keys
       (id, user_id, org_id, name, key_prefix, label, key_hash, key_preview)
     VALUES ($1, $2, $3, $4, $5, $4, $6, $7) RETURNING created_at`,
    [id, userId, organizationId, name, key.slice(0, 12), hashKey(key), preview(key)]
  );
  return { id, key, preview: preview(key), created_at: rows[0].created_at };
}

export async function listApiKeys(organizationId: string): Promise<ApiKeyRecord[]> {
  return query<ApiKeyRecord>(
    `SELECT id, label AS name, key_preview AS preview, created_at, last_used_at, revoked_at
     FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC`,
    [organizationId]
  );
}

export async function revokeApiKey(organizationId: string, keyId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE api_keys SET revoked_at = now(), status = 'REVOKED'
     WHERE id = $1 AND org_id = $2 AND revoked_at IS NULL RETURNING id`,
    [keyId, organizationId]
  );
  return rows.length > 0;
}

/** Verifies a bearer token from a request and returns the owning user_id, or null. */
export async function verifyApiKey(rawKey: string): Promise<{
  userId: string;
  organizationId: string;
  keyId: string;
  quotaExceeded?: true;
} | null> {
  if (!rawKey.startsWith(PREFIX)) return null;
  const rows = await query<{ id: string; user_id: string; org_id: string }>(
    `UPDATE api_keys
     SET last_used_at = now(),
         current_usage = CASE
           WHEN usage_month < date_trunc('month', now())::date THEN 1
           ELSE current_usage + 1
         END,
         usage_month = date_trunc('month', now())::date
     WHERE key_hash = $1 AND revoked_at IS NULL AND status = 'ACTIVE'
       AND CASE
         WHEN usage_month < date_trunc('month', now())::date THEN 0
         ELSE current_usage
       END < monthly_quota
     RETURNING id, user_id, org_id`,
    [hashKey(rawKey)]
  );
  if (rows.length === 0) {
    const exhausted = await query<{ id: string; org_id: string }>(
      `SELECT id, org_id FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL AND status = 'ACTIVE' AND current_usage >= monthly_quota
         AND usage_month >= date_trunc('month', now())::date`,
      [hashKey(rawKey)]
    );
    if (exhausted[0]) {
      return {
        userId: "",
        organizationId: exhausted[0].org_id,
        keyId: exhausted[0].id,
        quotaExceeded: true,
      };
    }
    return null;
  }

  return {
    userId: rows[0].user_id,
    organizationId: rows[0].org_id,
    keyId: rows[0].id,
  };
}
