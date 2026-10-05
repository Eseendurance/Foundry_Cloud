import crypto from "crypto";
import { verifyApiKey } from "@/lib/api-keys";

export function generatePlatformKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `fg_live_${randomBytes}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  return { rawKey, keyHash, keyPrefix };
}

export async function validatePlatformKey(rawKey: string) {
  if (!rawKey || !rawKey.startsWith("fg_live_")) {
    return { valid: false, reason: "Invalid key format." };
  }

  const identity = await verifyApiKey(rawKey);
  if (!identity) {
    return { valid: false, reason: "Key not found." };
  }
  if (identity.quotaExceeded) {
    return { valid: false, reason: "Monthly usage quota exceeded." };
  }
  return {
    valid: true,
    apiKeyRecord: { id: identity.keyId, organizationId: identity.organizationId },
  };
}