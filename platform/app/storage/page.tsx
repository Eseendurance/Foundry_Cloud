import React from 'react';

export default function StorageDashboard() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white font-heading">S</div>
            <span className="font-bold text-lg tracking-wide font-heading">Storage CDN</span>
          </div>
          <nav className="space-y-2 text-sm">
            <a href="#" className="block px-4 py-2.5 rounded-lg bg-teal-600/10 text-teal-400 font-medium">Bucket Explorer</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Access Keys & S3 API</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Media CDN Routes</a>
          </nav>
        </div>
        <div className="text-xs text-slate-500 font-mono">Local Stream Store • Zero S3 Costs</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">Self-Hosted Object Storage</h1>
            <p className="text-slate-400 text-sm mt-1">Chunked file streams, native CDN routing, and local video asset distribution.</p>
          </div>
          <button className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition shadow-lg shadow-teal-600/20">
            + Upload Object
          </button>
        </header>

        {/* Bucket Files Table */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-mono text-xs text-slate-400 flex justify-between">
            <span>Bucket: <strong className="text-teal-400">media-assets-primary</strong></span>
            <span>Used: 14.2 GB / Storage Path: <code className="text-slate-300">/raw-engine/storage/data</code></span>
          </div>
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Key / Filename</th>
                <th className="p-3.5">MIME Type</th>
                <th className="p-3.5">Size</th>
                <th className="p-3.5">Public CDN URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3.5 font-semibold text-teal-400">avatar_render_093.mp4</td>
                <td className="p-3.5 text-slate-400">video/mp4</td>
                <td className="p-3.5">18.4 MB</td>
                <td className="p-3.5 text-slate-400">https://cdn.foundrycloud.app/media-assets-primary/avatar_render_093.mp4</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3.5 font-semibold text-teal-400">email_header_banner.png</td>
                <td className="p-3.5 text-slate-400">image/png</td>
                <td className="p-3.5">1.2 MB</td>
                <td className="p-3.5 text-slate-400">https://cdn.foundrycloud.app/media-assets-primary/email_header_banner.png</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}