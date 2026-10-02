import React from 'react';

export default function DomainsDashboard() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white font-heading">N</div>
            <span className="font-bold text-lg tracking-wide font-heading">Domain Manager</span>
          </div>
          <nav className="space-y-2 text-sm">
            <a href="#" className="block px-4 py-2.5 rounded-lg bg-blue-600/10 text-blue-400 font-medium">EPP Registrar Search</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">DNS Zone Files</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Proxy Ingress Routes</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Auto SSL Certificates</a>
          </nav>
        </div>
        <div className="text-xs text-slate-500 font-mono">EPP TCP Socket • BIND DNS</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight font-heading">Domain Registration & Hosting Ingress</h1>
          <p className="text-slate-400 text-sm mt-1">Direct TCP socket queries to TLD registries and host reverse proxy management.</p>
        </header>

        {/* EPP Domain Search Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 mb-10">
          <h2 className="text-lg font-bold font-heading mb-3">Search Available Domains</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="e.g. mynewbrand.com"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition">
              Check EPP Availability
            </button>
          </div>
        </div>

        {/* Hosted Domains Table */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-heading font-semibold text-sm">
            Active DNS Zones & Proxy Target Bindings
          </div>
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Domain Name</th>
                <th className="p-3.5">Record Type</th>
                <th className="p-3.5">Internal Proxy Target</th>
                <th className="p-3.5">SSL Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3.5 font-semibold text-blue-400">foundrycloud.app</td>
                <td className="p-3.5">A Record</td>
                <td className="p-3.5 text-slate-400">http://127.0.0.1:3000</td>
                <td className="p-3.5"><span className="text-emerald-400">Active (Let's Encrypt)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}