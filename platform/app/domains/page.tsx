"use client";

import { FormEvent, useState } from "react";

type DnsSnapshot = {
  domain: string;
  a: string[];
  mx: { priority: number; exchange: string }[];
  ns: string[];
  txt: string[];
};

export default function DomainsDashboard() {
  const [domain, setDomain] = useState("");
  const [snapshot, setSnapshot] = useState<DnsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function inspectDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSnapshot(null);
    setError(null);
    try {
      const response = await fetch(`/api/domains/dns?domain=${encodeURIComponent(domain)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `DNS lookup failed (${response.status}).`);
      setSnapshot(result as DnsSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DNS lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  const recordGroups = snapshot
    ? [
        { type: "A", values: snapshot.a },
        { type: "MX", values: snapshot.mx.map((record) => `${record.priority} ${record.exchange}`) },
        { type: "NS", values: snapshot.ns },
        { type: "TXT", values: snapshot.txt },
      ]
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 px-4 py-8 text-slate-950 sm:px-8">
      <header className="border-b border-slate-300 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-blue-700">Native DNS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Domains</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Inspect live DNS records using system DNS resolution. Foundry does not register domains or claim
          ownership without a configured registrar adapter.
        </p>
      </header>

      <section className="rounded-lg border border-slate-300 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Domain registrar</h2>
            <p className="mt-1 text-sm text-slate-600">
              Connect a registrar adapter to enable search, registration, renewal, or transfer.
            </p>
          </div>
          <span className="rounded border border-slate-300 px-3 py-1 font-mono text-xs text-slate-700">
            Not configured
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 p-5 sm:p-7">
        <h2 className="font-semibold">DNS health inspector</h2>
        <form onSubmit={inspectDomain} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="domain-name">Domain name</label>
          <input
            id="domain-name"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            autoComplete="url"
            placeholder="example.com"
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
          <button
            type="submit"
            disabled={loading || !domain.trim()}
            className="rounded bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Checking DNS…" : "Inspect records"}
          </button>
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-slate-800">{error}</p>}

        {snapshot && (
          <div className="mt-6 overflow-hidden rounded border border-slate-300">
            <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 font-mono text-sm">
              {snapshot.domain}
            </div>
            <div className="divide-y divide-slate-200">
              {recordGroups.map((group) => (
                <div key={group.type} className="grid gap-2 px-4 py-3 sm:grid-cols-[5rem_1fr]">
                  <span className="font-mono text-xs font-semibold text-blue-700">{group.type}</span>
                  <div className="space-y-1 break-all font-mono text-xs text-slate-800">
                    {group.values.length
                      ? group.values.map((value, index) => <p key={`${group.type}-${index}`}>{value}</p>)
                      : <p className="text-slate-500">No records returned</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
