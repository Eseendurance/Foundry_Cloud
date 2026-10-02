import { prisma } from '../lib/prisma';

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

export class RawDatabaseEngine {
  /**
   * Fetches all user tables from the public schema in Neon PostgreSQL.
   */
  static async listTables(): Promise<string[]> {
    const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `;
    return tables.map((t) => t.table_name);
  }

  /**
   * Retrieves column metadata for a given table.
   */
  static async getTableSchema(tableName: string): Promise<TableColumn[]> {
    const columns: TableColumn[] = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName};
    `;
    return columns;
  }

  /**
   * Safely executes read queries for data management.
   */
  static async executeQuery(queryText: string): Promise<any> {
    // Restrict execution to safe SELECT queries
    if (!queryText.trim().toLowerCase().startsWith('select')) {
      throw new Error('Only SELECT statements are allowed in the query editor.');
    }
    return await prisma.$queryRawUnsafe(queryText);
  }
}