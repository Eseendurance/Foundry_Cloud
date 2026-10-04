import { NextResponse } from "next/server";
import { prisma } from '@/raw-engine/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const records = await prisma.ingestedRecord.findMany({
      where: search
        ? {
            entityKey: { contains: search, mode: "insensitive" },
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list records.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}