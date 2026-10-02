import { NextResponse } from "next/server";
import { prisma } from '@/raw-engine/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const records = await prisma.ingestedRecord.findMany({
      where: search
        ? {
            OR: [
              { sourceId: { contains: search, mode: "insensitive" } },
              { entityKey: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ records });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}