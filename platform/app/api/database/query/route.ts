import { NextResponse } from 'next/server';
import { RawDatabaseEngine } from '@/raw-engine/database/query';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    const results = await RawDatabaseEngine.executeQuery(query);
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}