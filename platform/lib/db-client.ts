export type ColumnDataType = "VARCHAR" | "INTEGER" | "TIMESTAMP" | "BOOLEAN";

export type ColumnSchema = {
  name: string;
  type: ColumnDataType;
  nullable: boolean;
  isPrimary?: boolean;
};

export type TableSchema = {
  tableName: string;
  columns: ColumnSchema[];
  createdAt: string;
};

const STORAGE_KEY = "foundry_db_schemas_v1";

const DEFAULT_SCHEMAS: TableSchema[] = [
  {
    tableName: "users",
    columns: [
      { name: "id", type: "INTEGER", nullable: false, isPrimary: true },
      { name: "email", type: "VARCHAR", nullable: false },
      { name: "created_at", type: "TIMESTAMP", nullable: false },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    tableName: "deployments",
    columns: [
      { name: "id", type: "INTEGER", nullable: false, isPrimary: true },
      { name: "status", type: "VARCHAR", nullable: false },
      { name: "commit_hash", type: "VARCHAR", nullable: false },
    ],
    createdAt: new Date().toISOString(),
  },
];

/**
 * Client-Side Database Manager
 * Handles local persistence of database schemas using localStorage with fallback in-memory state.
 */
export class DBClient {
  private static isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  /**
   * Fetch all registered table schemas.
   */
  static getTables(): TableSchema[] {
    if (!this.isBrowser()) return DEFAULT_SCHEMAS;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveTables(DEFAULT_SCHEMAS);
        return DEFAULT_SCHEMAS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_SCHEMAS;
    }
  }

  /**
   * Persist schema array to local storage.
   */
  static saveTables(tables: TableSchema[]): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    } catch (err) {
      console.error("Failed to save schema state to localStorage:", err);
    }
  }

  /**
   * Add a new table definition to the schema store.
   */
  static createTable(tableName: string, columns: ColumnSchema[]): TableSchema {
    const formattedName = tableName.trim().toLowerCase().replace(/\s+/g, "_");
    const tables = this.getTables();

    const existing = tables.find((t) => t.tableName === formattedName);
    if (existing) {
      return existing;
    }

    const newTable: TableSchema = {
      tableName: formattedName,
      columns: [
        { name: "id", type: "INTEGER", nullable: false, isPrimary: true },
        ...columns,
      ],
      createdAt: new Date().toISOString(),
    };

    const updated = [...tables, newTable];
    this.saveTables(updated);
    return newTable;
  }

  /**
   * Remove a table definition by name.
   */
  static dropTable(tableName: string): TableSchema[] {
    const tables = this.getTables();
    const updated = tables.filter((t) => t.tableName !== tableName);
    this.saveTables(updated);
    return updated;
  }

  /**
   * Reset schema store back to default initial state.
   */
  static resetToDefault(): TableSchema[] {
    this.saveTables(DEFAULT_SCHEMAS);
    return DEFAULT_SCHEMAS;
  }
}