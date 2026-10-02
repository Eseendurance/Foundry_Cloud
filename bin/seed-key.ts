import { prisma } from "../raw-engine/lib/prisma";
import { generatePlatformKey } from "../raw-engine/lib/auth-key";

async function main() {
  console.log("=== SEEDING TEST ORGANIZATION & API KEY ===");

  // Create workspace
  const org = await prisma.organization.create({
    data: {
      name: "Engineering Test Corp",
      planTier: "PRO",
    },
  });

  // Generate self-issued key
  const { rawKey, keyHash, keyPrefix } = generatePlatformKey();

  await prisma.apiKey.create({
    data: {
      orgId: org.id,
      keyHash,
      keyPrefix,
      label: "Engine Test Key",
      monthlyQuota: 5000,
    },
  });

  console.log("\nSuccess!");
  console.log(`Organization ID: ${org.id}`);
  console.log(`--------------------------------------------------`);
  console.log(`YOUR RAW API KEY (Save this now):`);
  console.log(`Bearer ${rawKey}`);
  console.log(`--------------------------------------------------`);
}

main().catch(console.error);