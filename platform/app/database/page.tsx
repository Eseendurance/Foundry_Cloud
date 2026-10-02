import React from 'react';

export default function DatabaseStudioDashboard() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white font-heading">D</div>
            <span className="font-bold text-lg tracking-wide font-heading">Database Studio</span>
          </div>
          <nav className="space-y-2 text-sm">
            <a href="#" className="block px-4 py-2.5 rounded-lg bg-emerald-600/10 text-emerald-400 font-medium">Table Editor</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">SQL Runner</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Schema Migrations</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Auto-REST APIs</a>
          </nav>
        </div>
        <div className="text-xs text-slate-500 font-mono">PostgreSQL • Native Schema</div>
      </aside>

      {/* Main Database Studio */}
      <main className="flex-1 overflow-y-auto p-10 flex flex-col">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">PostgreSQL Schema & Tables</h1>
            <p className="text-slate-400 text-sm mt-1">Self-hosted PostgreSQL manager with instant REST generation and migrations.</p>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-lg shadow-emerald-600/20">
            + Create Table
          </button>
        </header>

        {/* Data Grid Table */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center font-mono text-xs text-slate-400">
            <span>Table: <strong className="text-emerald-400">users_account</strong> (1,240 rows)</span>
            <span>Filter: None</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 border-r border-slate-800">id (uuid)</th>
                  <th className="p-3.5 border-r border-slate-800">email (varchar)</th>
                  <th className="p-3.5 border-r border-slate-800">full_name (text)</th>
                  <th className="p-3.5 border-r border-slate-800">created_at (timestamp)</th>
                  <th className="p-3.5">status (text)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 border-r border-slate-800 text-emerald-400">usr_94a028f{i}</td>
                    <td className="p-3.5 border-r border-slate-800">user_{i}@foundrycloud.local</td>
                    <td className="p-3.5 border-r border-slate-800">Tenant Account {i}</td>
                    <td className="p-3.5 border-r border-slate-800 text-slate-500">2026-09-30 18:22:01</td>
                    <td className="p-3.5"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}