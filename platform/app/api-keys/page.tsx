"use client";

import { useState, useEffect } from "react";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  status: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [keyName, setKeyName] = useState("");
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch (err) {
      console.error("Failed to load API keys", err);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const data = await res.json();

      if (data.rawKey) {
        setNewlyGeneratedKey(data.rawKey);
        setKeyName("");
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to generate API key", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">API Key Management</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Generate bearer API keys to authenticate direct requests to the Raw Engine Ingestion Gateway.
        </p>
      </div>

      {/* API Key Generation Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Generate New Production Key</h2>
        <form onSubmit={handleCreateKey} className="flex gap-4">
          <input
            type="text"
            placeholder="Key Name (e.g. Production Webhook Relay)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
          >
            {loading ? "Generating..." : "Generate Key"}
          </button>
        </form>

        {newlyGeneratedKey && (
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
              Secret API Key Generated! Copy it now, as it won't be shown again:
            </p>
            <div className="mt-2 p-3 bg-white dark:bg-slate-900 font-mono text-emerald-600 dark:text-emerald-400 border rounded flex justify-between items-center select-all">
              <span>{newlyGeneratedKey}</span>
              <button
                onClick={() => navigator.clipboard.writeText(newlyGeneratedKey)}
                className="text-xs bg-emerald-100 dark:bg-emerald-900 px-3 py-1 rounded text-emerald-800 dark:text-emerald-200 font-sans"
              >
                Copy Key
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keys Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Platform Credentials</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-medium">
              <th className="p-4">Key Name</th>
              <th className="p-4">Prefix</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="p-4 font-medium text-slate-900 dark:text-white">{k.name}</td>
                <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{k.keyPrefix}...</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                    {k.status}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{new Date(k.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No active keys found. Generate your first API key above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}