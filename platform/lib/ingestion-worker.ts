import { prisma } from "@/lib/prisma";

export async function runDataIngestionJob(sourceId: string) {
  const source = await prisma.dataSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Data source non-existent");

  // Create new versioned snapshot
  const latestSnapshot = await prisma.dataSnapshot.findFirst({
    where: { sourceId },
    orderBy: { version: "desc" },
  });
  const newVersion = (latestSnapshot?.version || 0) + 1;

  const snapshot = await prisma.dataSnapshot.create({
    data: {
      sourceId,
      version: newVersion,
      status: "IN_PROGRESS",
    },
  });

  try {
    // 1. Fetch from Open Dataset (Decoupled from third-party key)
    const res = await fetch(source.targetUrl, {
      headers: { "User-Agent": "PlatformDataIngestor/1.0 (+https://yourplatform.com/bot)" },
    });

    if (!res.ok) throw new Error(`Fetch failed with HTTP status ${res.status}`);

    const rawDataArray = await res.json();
    let importedCount = 0;

    // 2. Normalize and upsert into self-hosted database
    for (const item of rawDataArray) {
      const entityKey = String(item.id || item.code || Math.random().toString(36).substring(2));

      await prisma.ingestedRecord.upsert({
        where: {
          sourceId_entityKey: { sourceId, entityKey },
        },
        create: {
          sourceId,
          entityKey,
          payload: item,
          version: newVersion,
        },
        update: {
          payload: item,
          version: newVersion,
        },
      });
      importedCount++;
    }

    // 3. Mark Snapshot Complete & Update Source Sync Time
    await prisma.dataSnapshot.update({
      where: { id: snapshot.id },
      data: { status: "SUCCESS", recordCount: importedCount },
    });

    await prisma.dataSource.update({
      where: { id: sourceId },
      data: { lastSyncedAt: new Date() },
    });

    return { success: true, version: newVersion, records: importedCount };
  } catch (err: any) {
    // Graceful degradation / Fallback logging
    await prisma.dataSnapshot.update({
      where: { id: snapshot.id },
      data: { status: "FAILED", errorMessage: err.message },
    });
    return { success: false, error: err.message };
  }
}