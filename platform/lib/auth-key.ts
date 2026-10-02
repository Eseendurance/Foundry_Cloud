import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { organization: true },
  });

  if (!apiKeyRecord) {
    return { valid: false, reason: "Key not found." };
  }

  if (apiKeyRecord.status !== "ACTIVE") {
    return { valid: false, reason: "Key is revoked." };
  }

  if (apiKeyRecord.currentUsage >= apiKeyRecord.monthlyQuota) {
    return { valid: false, reason: "Monthly usage quota exceeded." };
  }

  // Atomically increment quota counter
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { currentUsage: { increment: 1 } },
  });

  return { valid: true, apiKeyRecord };
}