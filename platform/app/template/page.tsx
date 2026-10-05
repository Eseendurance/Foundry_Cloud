"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  dsl: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/templates", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data: { templates?: Template[]; error?: string } = await response.json();
        if (!response.ok || !Array.isArray(data.templates)) {
          throw new Error(data.error || "Could not load workflow blueprints.");
        }
        setTemplates(data.templates);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Could not load workflow blueprints.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function copyBlueprint(template: Template) {
    setError(null);
    try {
      await navigator.clipboard.writeText(template.dsl);
      setCopiedId(template.id);
    } catch {
      setError("Clipboard access was denied. Check your browser permission and try again.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 px-5 py-10 sm:px-8">
      <header className="border-b border-slate-200 pb-6">
        <Link href="/dashboard" className="text-sm font-medium text-blue-700 hover:text-blue-900">
          ← Workspace
        </Link>
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-blue-700">
          Foundry Cloud
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Workflow blueprints
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          These are editable DSL starting points, not ready-to-run integrations.
          Review the source, configure the database and endpoints, then test
          changes in the editor.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-slate-900">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-600">Loading workflow blueprints…</p>
      ) : templates.length === 0 && !error ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No workflow blueprints are available.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
            >
              <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-blue-800">
                {template.category}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{template.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {template.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => void copyBlueprint(template)}
                  className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
                >
                  {copiedId === template.id ? "Copied definition" : "Copy definition"}
                </button>
                <Link
                  href="/editor"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-blue-400 hover:text-blue-800"
                >
                  Open editor
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
