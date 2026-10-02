import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from '@/raw-engine/lib/prisma';

export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, keyPrefix: true, status: true, createdAt: true },
    });
    return NextResponse.json({ keys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const rawKey = `fg_live_${crypto.randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.substring(0, 14);

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name || "Production Platform Key",
        keyHash: rawKey,
        keyPrefix: keyPrefix,
        orgId: "org_local_dev",
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      rawKey,
      id: apiKey.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}