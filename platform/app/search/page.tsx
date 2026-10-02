"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Search as SearchIcon, AlertCircle } from "lucide-react";

type Hit = { id: string; name: string; created_at: string };

export default function SearchModule() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runSearch(query: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed.");
        setHits([]);
      } else {
        setHits(data.hits);
        setSearched(true);
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(q);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <ArrowLeft size={16} />
            Workspace
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-moss/30 bg-moss/5 px-3 py-1 text-xs text-moss">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            Search — live
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-2xl text-ink sm:text-3xl">Search your projects</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Built into your own database — real full-text and typo-tolerant
          matching, no extra service, no extra bill.
        </p>

        <div className="relative mt-6">
          <SearchIcon
            size={16}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by project name…"
            className="w-full rounded-full border border-line bg-paper py-3 pl-11 pr-5 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          />
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 text-sm text-rust">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <ul className="mt-6 space-y-2">
          {hits.map((h) => (
            <li key={h.id} className="rounded-xl border border-line bg-paper-dim/40 p-4">
              <p className="text-sm font-medium text-ink">{h.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {new Date(h.created_at).toLocaleString()}
              </p>
            </li>
          ))}
          {!loading && !error && searched && hits.length === 0 && (
            <p className="text-sm text-ink-soft">
              {q ? "No matches." : "No projects yet — create one from the workspace."}
            </p>
          )}
        </ul>
      </main>
    </div>
  );
}
