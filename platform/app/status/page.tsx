import { getPlatformHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const health = await getPlatformHealth();
  const services = [
    ["PostgreSQL database", health.services.database],
    ["Raw engine", health.services.engine],
    ["SMTP server", health.services.smtp],
    ["Persistent storage", health.services.storage],
  ] as const;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 text-slate-950 sm:px-8">
      <header className="border-b border-slate-300 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-blue-700">Foundry Cloud</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">System status</h1>
        <p className="mt-2 text-sm text-slate-600">
          Live connection checks for the configured database, engine, mail server, and storage.
        </p>
      </header>

      <section className="mt-8 rounded-lg border border-slate-300 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <h2 className="font-semibold">Current status</h2>
          <span
            className={`rounded border px-3 py-1 font-mono text-xs ${
              health.status === "healthy"
                ? "border-blue-300 text-blue-800"
                : health.status === "degraded"
                  ? "border-slate-400 text-slate-700"
                  : "border-slate-500 text-slate-900"
            }`}
          >
            {health.status.toUpperCase()}
          </span>
        </div>

        <ul className="divide-y divide-slate-200">
          {services.map(([name, service]) => (
            <li key={name} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-medium">{name}</h3>
                <p className="mt-1 text-xs text-slate-600">{service.detail}</p>
              </div>
              <span className="font-mono text-xs text-slate-700">
                {service.status.toUpperCase()}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-slate-500">
          Checked at {new Date(health.checkedAt).toLocaleString()} ·{" "}
          <a className="text-blue-700 underline" href="/api/health">JSON health response</a>
        </p>
      </section>
    </main>
  );
}
