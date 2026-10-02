import React from 'react';

export default function BuilderDashboard() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar - Workspace & File Explorer */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white font-heading">B</div>
            <span className="font-bold text-lg tracking-wide font-heading">App Builder</span>
          </div>
          <div className="text-xs font-mono uppercase text-slate-500 mb-3 tracking-wider">File System</div>
          <nav className="space-y-1 font-mono text-xs">
            <a href="#" className="block px-3 py-2 rounded bg-indigo-600/10 text-indigo-400 font-medium">src/index.tsx</a>
            <a href="#" className="block px-3 py-2 rounded hover:bg-slate-900 text-slate-400 transition">src/components/Card.tsx</a>
            <a href="#" className="block px-3 py-2 rounded hover:bg-slate-900 text-slate-400 transition">src/styles.css</a>
            <a href="#" className="block px-3 py-2 rounded hover:bg-slate-900 text-slate-400 transition">package.json</a>
          </nav>
        </div>
        <div className="text-xs text-slate-500 font-mono">WebContainer Engine • Hot Reload</div>
      </aside>

      {/* Main Studio Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between font-mono text-xs bg-slate-900/40">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Local Dev Server: http://localhost:3001</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded transition">Restart Sandbox</button>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold px-4 py-1.5 rounded transition">Publish Ingress</button>
          </div>
        </header>

        {/* Code Editor & Live Preview Split Canvas */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800 overflow-hidden">
          {/* Monaco-Style Code Editor */}
          <div className="bg-slate-950 p-6 font-mono text-xs flex flex-col">
            <div className="text-slate-500 mb-4 font-sans text-xs">Editing: <span className="text-slate-200 font-mono">src/index.tsx</span></div>
            <textarea
              className="flex-1 bg-transparent text-slate-200 resize-none focus:outline-none font-mono leading-relaxed"
              spellCheck={false}
              defaultValue={`import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-slate-900 text-white p-10 font-sans">\n      <h1 className="text-3xl font-bold text-indigo-400">Foundry Native Web Container</h1>\n      <p className="mt-2 text-slate-400">Zero third-party cloud runtime. Local hot-reloading active.</p>\n    </div>\n  );\n}`}
            />
          </div>

          {/* Real-time WebContainer Iframe Preview */}
          <div className="bg-white flex flex-col">
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center gap-2 text-xs font-mono text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-green-400"></span>
              <span className="ml-2 flex-1 bg-white px-3 py-1 rounded border border-slate-300 text-slate-500">http://localhost:3001</span>
            </div>
            <div className="flex-1 p-8 bg-slate-900 text-white font-sans">
              <h1 className="text-3xl font-bold text-indigo-400">Foundry Native Web Container</h1>
              <p className="mt-2 text-slate-400">Zero third-party cloud runtime. Local hot-reloading active.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}