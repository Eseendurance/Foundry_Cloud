"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";

type ApiKey = {
  id: string;
  name: string;
  preview: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export default function APIKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/keys", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load API keys.");
      setKeys(data.keys);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refreshKeys);
  }, [refreshKeys]);

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setIssuedKey(null);
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: label }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create API key.");
      setIssuedKey(data.key);
      setLabel("");
      await refreshKeys();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create API key.");
    } finally {
      setSaving(false);
    }
  }

  async function revokeKey(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/keys/${encodeURIComponent(id)}/revoke`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke API key.");
      await refreshKeys();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke API key.");
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Header />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <header className="border-b border-slate-300 pb-5">
          <p className="font-mono text-xs uppercase tracking-widest text-blue-700">Developer access</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">API keys</h1>
          <p className="mt-1 text-sm text-slate-600">
            Keys are generated cryptographically, stored as SHA-256 hashes, and shown only once.
          </p>
        </header>

        <section className="rounded border border-slate-300 p-5">
          <h2 className="font-medium">Issue a key</h2>
          <form onSubmit={createKey} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="key-label">Key label</label>
            <input
              id="key-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
              required
              placeholder="Production integration"
              className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
            <button
              type="submit"
              disabled={saving || !label.trim()}
              className="rounded bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Issuing…" : "Generate key"}
            </button>
          </form>
          {issuedKey && (
            <div className="mt-4 rounded border border-blue-300 bg-slate-50 p-4">
              <p className="text-sm font-medium">Copy this key now; it will not be shown again.</p>
              <code className="mt-2 block break-all font-mono text-xs">{issuedKey}</code>
            </div>
          )}
        </section>

        {error && <p role="alert" className="text-sm text-slate-800">{error}</p>}

        <section className="overflow-hidden rounded border border-slate-300">
          <div className="border-b border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium">
            Issued keys
          </div>
          {loading ? (
            <p className="px-4 py-6 text-sm text-slate-600">Loading keys…</p>
          ) : keys.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-600">No API keys have been issued.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {keys.map((key) => (
                <li key={key.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{key.name}</p>
                    <code className="mt-1 block break-all font-mono text-xs text-slate-600">{key.preview}</code>
                    <p className="mt-1 text-xs text-slate-500">
                      Created {new Date(key.created_at).toLocaleString()}
                      {key.last_used_at ? ` · Last used ${new Date(key.last_used_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  {key.revoked_at ? (
                    <span className="font-mono text-xs text-slate-600">REVOKED</span>
                  ) : (
                    <button
                      onClick={() => void revokeKey(key.id)}
                      className="self-start rounded border border-slate-300 px-3 py-1.5 text-xs hover:border-blue-600 hover:text-blue-700 sm:self-auto"
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
