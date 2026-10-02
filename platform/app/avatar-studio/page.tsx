import React from 'react';

export default function AvatarStudioDashboard() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-heading">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white">A</div>
            <span className="font-bold text-lg tracking-wide">Avatar Studio</span>
          </div>
          <nav className="space-y-2 font-sans text-sm">
            <a href="#" className="block px-4 py-2.5 rounded-lg bg-purple-600/10 text-purple-400 font-medium">Studio Canvas</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Avatars & Presets</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Local Voice Synthesis</a>
            <a href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition">Render Pipeline Queue</a>
          </nav>
        </div>
        <div className="text-xs text-slate-500 font-mono">FFmpeg • Native Lip-Sync</div>
      </aside>

      {/* Main Studio Area */}
      <main className="flex-1 overflow-y-auto p-10 flex flex-col">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Video & Avatar Studio</h1>
            <p className="text-slate-400 font-sans text-sm mt-1">Native motion synthesis and local eSpeak/FFmpeg audio-visual composition.</p>
          </div>
          <button className="bg-purple-600 hover:bg-purple-500 text-white font-sans text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-lg shadow-purple-600/20">
            Render Video Project
          </button>
        </header>

        {/* Video Editor Workbench */}
        <div className="grid grid-cols-3 gap-8 flex-1">
          {/* Preview Viewport */}
          <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col">
            <div className="flex-1 bg-black rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="text-center text-slate-600">
                <div className="text-6xl mb-3">👤</div>
                <p className="font-mono text-xs">Live Canvas Viewport (Native OpenCV / Mesh Sync)</p>
              </div>
            </div>

            {/* Timeline Scrubbing Bar */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-4 font-mono text-xs text-slate-400">
              <button className="px-3 py-1.5 rounded bg-slate-800 text-white font-sans font-medium">▶ Play</button>
              <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-1/3"></div>
              </div>
              <span>00:14 / 00:45</span>
            </div>
          </div>

          {/* Controls & Script Input */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col font-sans">
            <h3 className="font-semibold text-slate-200 mb-4">Script & Audio Synthesizer</h3>
            <textarea
              className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-200 font-sans text-sm focus:outline-none focus:border-purple-500 resize-none mb-4"
              placeholder="Enter the speech script for the avatar to pronounce..."
              defaultValue="Welcome to Foundry Cloud. Our native pipeline handles domain registration, custom email dispatches, and avatar generation directly from our core raw engine."
            ></textarea>
            <div className="space-y-3 font-sans text-xs">
              <label className="block text-slate-400">Voice Pitch Model</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300">
                <option>eSpeak-NG Standard Male (en-us)</option>
                <option>eSpeak-NG Soft Female (en-gb)</option>
              </select>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}