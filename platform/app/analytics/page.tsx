import React from 'react';

export default function AnalyticsDashboard() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white font-heading">T</div>
            <span className="font-bold text-lg tracking-wide font-heading">Telemetry</span>
          </div>
          <nav className="space-y-2 text-sm">
            <a href="#" className="block px-4 py-2.5 rounded-lg bg-emerald-600/10 text-emerald-400 font-medium">System Metrics</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Socket Activity</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Render Queue</a>
          </nav>
        </div>
        <div className="text-xs text-slate-500 font-mono">Raw Metrics • Prom-Engine</div>
      </aside>

      {/* Main Monitoring Board */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">System Telemetry & Engine Health</h1>
            <p className="text-slate-400 text-sm mt-1">Real-time socket throughput, FFmpeg avatar render load, and PostgreSQL pool status.</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">● All Systems Nominal</span>
        </header>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-slate-400 text-xs uppercase font-mono">Direct SMTP Outflow</div>
            <div className="text-3xl font-bold font-heading text-white mt-2">1,280 req/s</div>
            <div className="text-emerald-400 text-xs mt-2">Socket latency: 12ms</div>
          </div>
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-slate-400 text-xs uppercase font-mono">Avatar FFmpeg Pipeline</div>
            <div className="text-3xl font-bold font-heading text-white mt-2">4 Active Jobs</div>
            <div className="text-purple-400 text-xs mt-2">eSpeak synthesis queue: 0</div>
          </div>
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-slate-400 text-xs uppercase font-mono">DB Connection Pool</div>
            <div className="text-3xl font-bold font-heading text-white mt-2">18 / 100</div>
            <div className="text-blue-400 text-xs mt-2">PostgreSQL Local Socket</div>
          </div>
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-slate-400 text-xs uppercase font-mono">Storage Bandwidth</div>
            <div className="text-3xl font-bold font-heading text-white mt-2">48.2 MB/s</div>
            <div className="text-teal-400 text-xs mt-2">Local CDN chunk stream</div>
          </div>
        </div>

        {/* Live Event Stream Table */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/30 overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-mono text-xs text-slate-400">Live Engine Event Stream</div>
          <div className="divide-y divide-slate-800/60 font-mono text-xs text-slate-300">
            <div className="p-3.5 flex justify-between items-center hover:bg-slate-800/40">
              <span className="text-emerald-400">[SMTP Socket] DKIM Signed & Sent to recipient MX</span>
              <span className="text-slate-500">Just now</span>
            </div>
            <div className="p-3.5 flex justify-between items-center hover:bg-slate-800/40">
              <span className="text-purple-400">[Avatar Engine] FFmpeg video rendering completed (avatar_render_093.mp4)</span>
              <span className="text-slate-500">2 mins ago</span>
            </div>
            <div className="p-3.5 flex justify-between items-center hover:bg-slate-800/40">
              <span className="text-blue-400">[Ingress Proxy] SSL Handshake succeeded for domain query</span>
              <span className="text-slate-500">5 mins ago</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}