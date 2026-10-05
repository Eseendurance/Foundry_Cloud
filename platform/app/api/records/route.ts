import { NextResponse } from "next/server";
import { prisma } from '@/raw-engine/lib/prisma';
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    if (search.length > 100) {
      return NextResponse.json({ error: "Search text must be 100 characters or fewer." }, { status: 400 });
    }

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