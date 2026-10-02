"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/templates");
        const data = await res.json();
        if (data.templates) setTemplates(data.templates);
      } catch (err) {
        console.error("Failed to load templates", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  function handleUseTemplate(dsl: string) {
    // Copy template DSL to clipboard or navigate to editor
    navigator.clipboard.writeText(dsl);
    alert("Template DSL copied to clipboard! Redirecting to AST Code Editor...");
    router.push("/editor");
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pipeline Blueprints & Templates</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Jumpstart your raw engine integration with battle-tested DSL blueprints for IoT, Webhooks, and Event Streams.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-500 py-12 text-center">Loading template library...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition group"
            >
              <div className="space-y-3">
                <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  {tmpl.category}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition">
                  {tmpl.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {tmpl.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => handleUseTemplate(tmpl.dsl)}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
                >
                  Use Template →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}