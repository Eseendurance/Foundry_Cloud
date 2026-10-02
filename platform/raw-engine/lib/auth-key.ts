import crypto from "crypto";
import { prisma } from "./prisma";

/**
 * Generates a new platform API key with a raw token, SHA-256 hash, and readable prefix.
 * Format: fg_live_<random_hex>
 */
export function generatePlatformKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `fg_live_${randomBytes}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Validates a raw platform key against stored SHA-256 hashes in PostgreSQL.
 * Verifies key existence, active status, and monthly usage limits.
 */
export async function validatePlatformKey(rawKey: string) {
  if (!rawKey || !rawKey.startsWith("fg_live_")) {
    return { valid: false, reason: "Invalid key format. Key must start with 'fg_live_'." };
  }

  // Hash the incoming key to match stored database hash
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  try {
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    });

    if (!apiKeyRecord) {
      return { valid: false, reason: "Unauthorized key. Key not found." };
    }

    if (apiKeyRecord.status !== "ACTIVE") {
      return { valid: false, reason: "Key is revoked." };
    }

    if (apiKeyRecord.currentUsage >= apiKeyRecord.monthlyQuota) {
      return { valid: false, reason: "Monthly usage quota exceeded." };
    }

    // Atomically increment the key's usage counter
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { currentUsage: { increment: 1 } },
    });

    return { valid: true, apiKeyRecord };
  } catch (error: any) {
    return { valid: false, reason: `Database authentication error: ${error.message}` };
  }
}