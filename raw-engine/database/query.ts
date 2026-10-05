import { query } from "@/lib/db";

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

type ScopedTable = {
  source: string;
  organizationColumn: "org_id" | "organization_id";
  orderColumn: string;
  columns: Array<{ name: string; expression: string; type: string }>;
};

const SCOPED_TABLES: Record<string, ScopedTable> = {
  projects: {
    source: "projects",
    organizationColumn: "org_id",
    orderColumn: "created_at",
    columns: [
      { name: "id", expression: "id", type: "text" },
      { name: "name", expression: "name", type: "text" },
      { name: "created_at", expression: "created_at", type: "timestamp" },
    ],
  },
  api_keys: {
    source: "api_keys",
    organizationColumn: "org_id",
    orderColumn: "created_at",
    columns: [
      { name: "id", expression: "id", type: "uuid" },
      { name: "label", expression: "label", type: "text" },
      { name: "key_preview", expression: "key_preview", type: "text" },
      { name: "created_at", expression: "created_at", type: "timestamp" },
      { name: "last_used_at", expression: "last_used_at", type: "timestamp" },
      { name: "revoked_at", expression: "revoked_at", type: "timestamp" },
    ],
  },
  sent_emails: {
    source: "sent_emails",
    organizationColumn: "org_id",
    orderColumn: "sent_at",
    columns: [
      { name: "id", expression: "id", type: "text" },
      { name: "to_email", expression: "to_email", type: "text" },
      { name: "subject", expression: "subject", type: "text" },
      { name: "sent_at", expression: "sent_at", type: "timestamp" },
      { name: "opened_at", expression: "opened_at", type: "timestamp" },
      { name: "click_count", expression: "click_count", type: "integer" },
    ],
  },
  workflows: {
    source: "workflows",
    organizationColumn: "org_id",
    orderColumn: "updated_at",
    columns: [
      { name: "id", expression: "id", type: "uuid" },
      { name: "name", expression: "name", type: "text" },
      { name: "is_active", expression: "is_active", type: "boolean" },
      { name: "created_at", expression: "created_at", type: "timestamp" },
      { name: "updated_at", expression: "updated_at", type: "timestamp" },
    ],
  },
  workflow_execution_logs: {
    source: "workflow_execution_logs",
    organizationColumn: "organization_id",
    orderColumn: "created_at",
    columns: [
      { name: "id", expression: "id", type: "uuid" },
      { name: "succeeded", expression: "succeeded", type: "boolean" },
      { name: "steps", expression: "steps", type: "json" },
      { name: "created_at", expression: "created_at", type: "timestamp" },
    ],
  },
  payment_orders: {
    source: "payment_orders",
    organizationColumn: "organization_id",
    orderColumn: "created_at",
    columns: [
      { name: "id", expression: "id", type: "uuid" },
      { name: "amount_minor", expression: "amount_minor", type: "integer" },
      { name: "currency", expression: "currency", type: "char(3)" },
      { name: "description", expression: "description", type: "text" },
      { name: "method", expression: "method", type: "text" },
      { name: "status", expression: "status", type: "text" },
      { name: "reference", expression: "reference", type: "text" },
      { name: "created_at", expression: "created_at", type: "timestamp" },
      { name: "paid_at", expression: "paid_at", type: "timestamp" },
    ],
  },
};

export class RawDatabaseEngine {
  static async listTables(): Promise<string[]> {
    await query("SELECT 1");
    return Object.keys(SCOPED_TABLES);
  }

  static getTableSchema(tableName: string): TableColumn[] {
    const table = SCOPED_TABLES[tableName];
    if (!table) throw new Error("That table is not available in the workspace data explorer.");
    return table.columns.map((column) => ({
      column_name: column.name,
      data_type: column.type,
      is_nullable: "YES",
    }));
  }

  static async executeQuery(
    tableName: string,
    organizationId: string,
    limit = 100
  ): Promise<Record<string, unknown>[]> {
    const table = SCOPED_TABLES[tableName];
    if (!table) throw new Error("That table is not available in the workspace data explorer.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("Row limit must be an integer from 1 to 100.");
    }
    const columns = table.columns
      .map((column) => `${column.expression} AS "${column.name}"`)
      .join(", ");
    return query<Record<string, unknown>>(
      `SELECT ${columns} FROM ${table.source}
       WHERE ${table.organizationColumn} = $1
       ORDER BY ${table.orderColumn} DESC
       LIMIT $2`,
      [organizationId, limit]
    );
  }
}
