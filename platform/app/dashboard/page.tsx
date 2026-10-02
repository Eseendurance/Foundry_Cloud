'use client';

import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  const studios = [
    {
      title: 'App Builder Studio',
      description: 'In-browser WebContainer sandbox with real-time React preview and direct export.',
      route: '/builder',
      tag: 'Bolt / v0 Engine',
      color: 'bg-sky-50 border-sky-200 text-sky-800',
      btnColor: 'bg-sky-600 hover:bg-sky-500',
    },
    {
      title: 'AI Avatar Studio',
      description: 'Watermark-free, self-hosted canvas rendering and lip-sync video generator.',
      route: '/avatar',
      tag: 'Zero-API Engine',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      btnColor: 'bg-emerald-600 hover:bg-emerald-500',
    },
    {
      title: 'Neon Database Studio',
      description: 'Prisma-powered SQL editor and dynamic table schema inspector.',
      route: '/database',
      tag: 'Neon PostgreSQL',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      btnColor: 'bg-indigo-600 hover:bg-indigo-500',
    },
    {
      title: 'Workflow Execution Engine',
      description: 'Stateful node graph executor for serverless pipelines and database syncs.',
      route: '/workflows',
      tag: 'Native Graph Engine',
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      btnColor: 'bg-purple-600 hover:bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Navbar */}
      <header className="flex justify-between items-center px-8 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg">
            Γ
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">
            Platform Gamma Neon
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded-full border border-emerald-200">
            System Operational • Raw Engine Active
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Workspace Launchpad</h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your self-contained AI infrastructure studios and backend compilation engines.
          </p>
        </div>

        {/* Studio Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studios.map((studio) => (
            <div
              key={studio.title}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-bold text-slate-900">{studio.title}</h2>
                  <span className={`text-xs px-2.5 py-0.5 font-medium rounded-full border ${studio.color}`}>
                    {studio.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  {studio.description}
                </p>
              </div>

              <button
                onClick={() => router.push(studio.route)}
                className={`w-full py-2.5 text-white font-semibold text-xs rounded-lg transition shadow ${studio.btnColor}`}
              >
                Launch Studio →
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}