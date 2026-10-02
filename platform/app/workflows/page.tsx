import React from 'react';

export default function WorkflowsDashboard() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white font-heading">W</div>
            <span className="font-bold text-lg tracking-wide font-heading">Workflows</span>
          </div>
          <nav className="space-y-2 text-sm">
            <a href="#" className="block px-4 py-2.5 rounded-lg bg-orange-600/10 text-orange-400 font-medium">Node Canvas</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Socket Triggers</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Execution Logs</a>
          </nav>
        </div>
        <div className="text-xs text-slate-500 font-mono">Raw Event Bus • Async Scheduler</div>
      </aside>

      {/* Canvas Area */}
      <main className="flex-1 overflow-hidden p-10 flex flex-col">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">Automation Node Graph</h1>
            <p className="text-slate-400 text-sm mt-1">Connect native SMTP triggers, SQL inserts, and video synthesis actions visually.</p>
          </div>
          <button className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition shadow-lg shadow-orange-600/20">
            + Add Node Action
          </button>
        </header>

        {/* Visual Node Workspace */}
        <div className="flex-1 border border-slate-800 rounded-xl bg-slate-900/30 p-10 flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="flex items-center gap-12 font-mono text-xs">
            {/* Trigger Node */}
            <div className="p-5 bg-slate-900 border border-orange-500/50 rounded-xl w-56 shadow-xl shadow-orange-500/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-orange-400 font-bold uppercase tracking-wider text-[10px]">Trigger</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>
              <h4 className="font-sans font-bold text-slate-200 text-sm">SMTP Dispatch Sent</h4>
              <p className="text-slate-500 text-[11px] mt-1 font-sans">Listens on raw port 25 socket</p>
            </div>

            <div className="h-0.5 w-16 bg-gradient-to-r from-orange-500 to-indigo-500"></div>

            {/* Processing Node */}
            <div className="p-5 bg-slate-900 border border-indigo-500/50 rounded-xl w-56 shadow-xl shadow-indigo-500/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Action</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>
              <h4 className="font-sans font-bold text-slate-200 text-sm">Synthesize Avatar Video</h4>
              <p className="text-slate-500 text-[11px] mt-1 font-sans">Triggers local FFmpeg render</p>
            </div>

            <div className="h-0.5 w-16 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>

            {/* Output Node */}
            <div className="p-5 bg-slate-900 border border-emerald-500/50 rounded-xl w-56 shadow-xl shadow-emerald-500/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Database</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>
              <h4 className="font-sans font-bold text-slate-200 text-sm">Store Asset Metadata</h4>
              <p className="text-slate-500 text-[11px] mt-1 font-sans">Writes record to PostgreSQL</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}