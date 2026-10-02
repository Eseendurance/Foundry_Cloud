"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Key, Copy, Check, Trash2, AlertCircle, Terminal } from "lucide-react";

type ApiKeyRecord = {
  id: string;
  name: string;
  preview: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export default function DeveloperSettings() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((data) => {
        if (data.keys) setKeys(data.keys);
        else if (data.error) setError(data.error);
      })
      .catch(() => setError("Couldn't reach the server."))
      .finally(() => setLoading(false));
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create the key.");
      } else {
        setFreshKey(data.key);
        setName("");
        load();
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this key? Anything using it will stop working immediately.")) return;
    await fetch(`/api/keys/${id}/revoke`, { method: "POST" });
    load();
  }

  function copyKey() {
    if (!freshKey) return;
    navigator.clipboard.writeText(freshKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <ArrowLeft size={16} />
            Workspace
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-moss/30 bg-moss/5 px-3 py-1 text-xs text-moss">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            Developer API — live
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-2xl text-ink sm:text-3xl">API keys</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Keys for calling this platform&apos;s own API from your own apps —
          separate from the AI provider/database keys that power the platform
          itself. No external service, hashed at rest, shown to you exactly
          once.
        </p>

        {freshKey && (
          <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4">
            <p className="text-sm font-medium text-ink">
              Copy this now — you won&apos;t see it again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg bg-ink px-3 py-2 font-mono text-xs text-paper">
                {freshKey}
              </code>
              <button
                onClick={copyKey}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-moss px-3 py-2 text-xs font-medium text-paper hover:bg-moss-deep"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setFreshKey(null)}
              className="mt-2 text-xs text-ink-soft hover:text-ink"
            >
              Done, I&apos;ve saved it
            </button>
          </div>
        )}

        <form onSubmit={create} className="mt-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name, e.g. Production, Local dev"
            className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex shrink-0 items-center gap-2 rounded-full bg-moss px-5 py-3 text-sm font-medium text-paper hover:bg-moss-deep disabled:opacity-50"
          >
            <Key size={14} />
            {creating ? "Creating…" : "Create key"}
          </button>
        </form>

        {error && (
          <p className="mt-4 flex items-start gap-2 text-sm text-rust">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-ink-soft">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-ink-soft">No keys yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {k.name}
                      {k.revoked_at && (
                        <span className="ml-2 text-xs text-rust">revoked</span>
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-soft">{k.preview}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at &&
                        ` · last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!k.revoked_at && (
                    <button
                      onClick={() => revoke(k.id)}
                      className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-rust hover:text-rust"
                    >
                      <Trash2 size={12} />
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-paper-dim/40 p-5">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-moss" />
            <p className="text-sm font-medium text-ink">Using a key</p>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-3 font-mono text-xs text-paper/90">
{`curl -X POST https://<your-domain>/api/v1/generate \\
  -H "Authorization: Bearer fc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "a tip calculator"}'`}
          </pre>
          <p className="mt-2 text-xs text-ink-soft">
            Returns real generated HTML — the same engine behind the app
            builder, callable from your own code. Rate limited to 20
            requests/hour per key.
          </p>
        </div>
      </main>
    </div>
  );
}
