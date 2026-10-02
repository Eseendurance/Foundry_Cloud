import { randomBytes, createHash, randomUUID } from "crypto";
import { query } from "@/lib/db";

const PREFIX = "fc_live_";

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
  name: string
): Promise<{ id: string; key: string; preview: string; created_at: string }> {
  const key = `${PREFIX}${randomBytes(24).toString("base64url")}`;
  const id = randomUUID();
  const rows = await query<{ created_at: string }>(
    `INSERT INTO api_keys (id, user_id, name, key_hash, key_preview)
     VALUES ($1, $2, $3, $4, $5) RETURNING created_at`,
    [id, userId, name, hashKey(key), preview(key)]
  );
  return { id, key, preview: preview(key), created_at: rows[0].created_at };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  return query<ApiKeyRecord>(
    `SELECT id, name, key_preview AS preview, created_at, last_used_at, revoked_at
     FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE api_keys SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id`,
    [keyId, userId]
  );
  return rows.length > 0;
}

/** Verifies a bearer token from a request and returns the owning user_id, or null. */
export async function verifyApiKey(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
  if (!rawKey.startsWith(PREFIX)) return null;
  const rows = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
    [hashKey(rawKey)]
  );
  if (rows.length === 0) return null;

  // Fire-and-forget usage tracking — don't block the request on it.
  query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [rows[0].id]).catch(() => {});

  return { userId: rows[0].user_id, keyId: rows[0].id };
}
