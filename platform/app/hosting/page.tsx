"use client";

import { useState, useEffect } from "react";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
}

interface Domain {
  id: string;
  domain: string;
  targetPipeline: string;
  status: string;
  sslStatus: string;
  dnsRecords: DnsRecord[];
}

export default function HostingPage() {
  const [activeTab, setActiveTab] = useState<"domains" | "dns" | "deployments">("domains");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);

  // New Domain Form State
  const [newDomainName, setNewDomainName] = useState("");
  const [targetPipeline, setTargetPipeline] = useState("SolarTelemetryPipeline");
  const [addingDomain, setAddingDomain] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  async function fetchDomains() {
    try {
      const res = await fetch("/api/hosting/domains");
      const data = await res.json();
      if (data.domains) {
        setDomains(data.domains);
        if (data.domains.length > 0) setSelectedDomain(data.domains[0]);
      }
    } catch (err) {
      console.error("Failed to load domains", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomainName.trim()) return;

    setAddingDomain(true);
    try {
      const res = await fetch("/api/hosting/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomainName, targetPipeline }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDomainName("");
        await fetchDomains();
      }
    } catch (err) {
      console.error("Failed to add domain", err);
    } finally {
      setAddingDomain(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header & Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hosting & Custom Domains</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Namecheap & Vercel-like control center for managing custom SSL domains, DNS zone records, and raw deployments.
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("domains")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "domains"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            🌐 Domains & SSL
          </button>
          <button
            onClick={() => setActiveTab("dns")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "dns"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            ⚡ DNS Zone Editor
          </button>
          <button
            onClick={() => setActiveTab("deployments")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "deployments"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            🚀 Engine Deployments
          </button>
        </div>
      </div>

      {/* TAB 1: Domains & Auto SSL */}
      {activeTab === "domains" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Domain Form */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Connect Custom Domain
            </h2>

            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Domain / Subdomain Name
                </label>
                <input
                  type="text"
                  placeholder="api.yourdomain.com"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  className="w-full p-2.5 border rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Target Raw Engine Pipeline
                </label>
                <select
                  value={targetPipeline}
                  onChange={(e) => setTargetPipeline(e.target.value)}
                  className="w-full p-2.5 border rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="SolarTelemetryPipeline">SolarTelemetryPipeline (.pipe)</option>
                  <option value="StripePaymentRelay">StripePaymentRelay (.pipe)</option>
                  <option value="UserAuditPipeline">UserAuditPipeline (.pipe)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={addingDomain}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm"
              >
                {addingDomain ? "Configuring SSL..." : "+ Attach Custom Domain"}
              </button>
            </form>
          </div>

          {/* Active Domains Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Active Custom Ingestion Domains
            </h2>

            {loading ? (
              <div className="text-center py-8 text-slate-400 text-xs">Loading domains...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Domain</th>
                      <th className="p-3">Routed Pipeline</th>
                      <th className="p-3">SSL Certificate</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {domains.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedDomain(d)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                      >
                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{d.domain}</td>
                        <td className="p-3">{d.targetPipeline}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px]">
                            🔒 Let's Encrypt (Auto-Renew)
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DNS Zone Editor */}
      {activeTab === "dns" && selectedDomain && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                DNS Records for <span className="text-emerald-600 dark:text-emerald-400">{selectedDomain.domain}</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Namecheap-style DNS zone management with 300s TTL propagation.
              </p>
            </div>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition">
              + Add Record
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">Type</th>
                  <th className="p-3">Host / Name</th>
                  <th className="p-3">Target Value</th>
                  <th className="p-3">TTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {selectedDomain.dnsRecords.map((r, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-bold text-amber-500">{r.type}</td>
                    <td className="p-3 font-semibold">{r.name}</td>
                    <td className="p-3 text-slate-400">{r.value}</td>
                    <td className="p-3 text-slate-500">{r.ttl}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Deployments */}
      {activeTab === "deployments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                ● Live Production
              </span>
              <span className="text-[11px] font-mono text-slate-500">Latency: 14ms</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Platform Gamma Production Edge</h3>
            <p className="text-xs font-mono text-slate-500">
              Target: <span className="text-emerald-600">platform.briefgroup.net</span>
            </p>
            <div className="pt-2 text-xs text-slate-600 dark:text-slate-400">
              Status: <span className="text-emerald-500 font-semibold">100% Uptime</span> (0 failed requests in 24h)
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                ● Live Production
              </span>
              <span className="text-[11px] font-mono text-slate-500">Latency: 28ms</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Brief OmniCore AI Gateway</h3>
            <p className="text-xs font-mono text-slate-500">
              Target: <span className="text-emerald-600">ese-omnicore-ai.vercel.app</span>
            </p>
            <div className="pt-2 text-xs text-slate-600 dark:text-slate-400">
              Status: <span className="text-emerald-500 font-semibold">100% Uptime</span> (0 failed requests in 24h)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}