import { NextResponse } from "next/server";
import { validatePlatformKey } from "@/lib/auth-key";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const startTime = Date.now();
  const authHeader = req.headers.get("Authorization");
  const rawKey = authHeader?.replace("Bearer ", "").trim() || "";

  // 1. Validate Self-Issued Platform Key
  const authResult = await validatePlatformKey(rawKey);
  if (!authResult.valid || !authResult.apiKeyRecord) {
    return NextResponse.json({ error: authResult.reason }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sourceName = searchParams.get("source") || "default";

  try {
    // 2. Query Self-Hosted Ingested Data Layer (Zero 3rd-Party Dependencies)
    const records = await prisma.ingestedRecord.findMany({
      where: {
        source: { name: sourceName },
      },
      take: 100,
      orderBy: { updatedAt: "desc" },
    });

    const latencyMs = Date.now() - startTime;

    // 3. Audit Log Request Performance
    await prisma.apiRequestLog.create({
      data: {
        keyId: authResult.apiKeyRecord.id,
        endpoint: "/api/v1/data",
        action: "QUERY_INGESTED_DATA",
        statusCode: 200,
        latencyMs,
      },
    });

    return NextResponse.json({
      success: true,
      source: sourceName,
      count: records.length,
      data: records.map((r) => r.payload),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Execution error" }, { status: 500 });
  }
}