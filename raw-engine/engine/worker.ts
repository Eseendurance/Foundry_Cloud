import { SourceNode } from "./ast";
import { prisma } from '../lib/prisma';

export async function executeSourceIngestion(source: SourceNode) {
  console.log(`[WORKER] Registering data source: ${source.name}`);

  // 1. Ensure DataSource record exists in DB
  const dbSource = await prisma.dataSource.upsert({
    where: { id: source.name }, // or lookup by matching unique criteria
    create: {
      id: source.name,
      name: source.name,
      targetUrl: source.url,
      licenseType: source.license,
      refreshCron: source.cron,
    },
    update: {
      targetUrl: source.url,
      licenseType: source.license,
      refreshCron: source.cron,
    },
  });

  console.log(`[WORKER] Fetching dataset from: ${source.url}`);

  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "RawEngine/1.0 (+https://yourdomain.com)" },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();
    const dataArray = Array.isArray(payload) ? payload : [payload];

    let imported = 0;
    for (const item of dataArray) {
      const entityKey = String(item.id || item.node_id || Math.random().toString(36).substring(2));

      await prisma.ingestedRecord.upsert({
        where: {
          sourceId_entityKey: {
            sourceId: dbSource.id,
            entityKey,
          },
        },
        create: {
          sourceId: dbSource.id,
          entityKey,
          payload: item,
        },
        update: {
          payload: item,
        },
      });
      imported++;
    }

    console.log(`[WORKER] Successfully ingested ${imported} records for ${source.name}`);
  } catch (err: any) {
    console.error(`[WORKER ERROR] Failed to ingest ${source.name}: ${err.message}`);
  }
}