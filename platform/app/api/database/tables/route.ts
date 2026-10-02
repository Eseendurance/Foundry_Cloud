import { NextResponse } from "next/server";
import { RawDatabaseEngine } from '@/raw-engine/database/query';

export async function GET() {
  try {
    // Fetch all public table names in the current PostgreSQL database
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC;
    `;

    const tableList = tables.map((t) => t.table_name);

    return NextResponse.json({ tables: tableList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}