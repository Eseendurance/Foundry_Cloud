"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Column = { column_name: string; data_type: string; is_nullable: string };
type Table = { name: string; columns: Column[] };
type Row = Record<string, unknown>;

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DatabaseDashboard() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/database/tables", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load workspace tables.");
        const available = data.tables as Table[];
        setTables(available);
        if (available.length > 0) {
          setSelectedTable(available[0].name);
          await loadRows(available[0].name);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load workspace tables.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadRows(table: string) {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/database/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, limit: 100 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load table rows.");
      setRows(data.rows || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load table rows.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const activeTable = tables.find((table) => table.name === selectedTable);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <Link href="/dashboard" className="text-xs text-blue-700 hover:underline">← Workspace</Link>
            <h1 className="mt-1 text-xl font-semibold">Database explorer</h1>
          </div>
          <span className="rounded border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-xs text-blue-900">
            READ ONLY · WORKSPACE SCOPED
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-5 py-7">
        <section className="rounded-lg border border-slate-200 p-5">
          <h2 className="font-semibold">Workspace data</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Browse approved workspace tables using fixed, parameterized queries. Raw SQL, schema changes, and arbitrary table access are disabled until isolated database provisioning and least-privilege database roles are deployed.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 text-xs font-medium text-slate-600">
              Table
              <select
                value={selectedTable}
                onChange={(event) => {
                  const nextTable = event.target.value;
                  setSelectedTable(nextTable);
                  void loadRows(nextTable);
                }}
                disabled={loading || tables.length === 0}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              >
                {tables.map((table) => <option key={table.name} value={table.name}>{table.name}</option>)}
              </select>
            </label>
            <button
              onClick={() => selectedTable && void loadRows(selectedTable)}
              disabled={loading || !selectedTable}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Refresh
            </button>
            <span className="text-xs text-slate-500">Maximum 100 rows per view</span>
          </div>
          {activeTable && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {activeTable.columns.map((column) => (
                <li key={column.column_name} className="rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
                  {column.column_name} <span className="text-slate-400">{column.data_type}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <div role="alert" className="rounded border border-slate-400 bg-slate-50 p-3 text-sm text-slate-900">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold">{selectedTable || "Workspace tables"}</h2>
            <span className="text-xs text-slate-500">{loading ? "Loading…" : `${rows.length} rows`}</span>
          </div>
          {rows.length > 0 && activeTable ? (
            <div className="max-h-[65vh] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {activeTable.columns.map((column) => (
                      <th key={column.column_name} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700">
                        {column.column_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={String(row.id ?? index)} className="hover:bg-blue-50/40">
                      {activeTable.columns.map((column) => (
                        <td key={column.column_name} className="max-w-sm break-all px-3 py-2 font-mono text-slate-700">
                          {displayValue(row[column.column_name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-sm text-slate-500">
              {loading ? "Loading workspace data…" : tables.length ? "This workspace table has no records." : "No workspace data tables are available."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
