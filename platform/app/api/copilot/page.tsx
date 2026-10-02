"use client";

import { useState } from "react";

export default function CopilotPage() {
  const [prompt, setPrompt] = useState("");
  const [dslOutput, setDslOutput] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setDslOutput(null);
    setExplanation(null);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (data.dsl) {
        setDslOutput(data.dsl);
        setExplanation(data.explanation);
      } else if (data.error) {
        alert(`Copilot Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Copilot Generation Failed", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (dslOutput) {
      navigator.clipboard.writeText(dslOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AI Pipeline Copilot</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Describe your data ingestion workflow in plain English, and Copilot will author production-ready DSL pipeline configs.
        </p>
      </div>

      {/* Prompt Input Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-900 dark:text-white">
            What pipeline would you like to build?
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Ingest payment webhooks from Stripe, drop transactions under $10, and map customer ID to neon_payments table."
            className="w-full p-4 border rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {["Stripe Webhook Relay", "IoT Sensor Data Filter", "User Activity Ingestion"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPrompt(preset)}
                  className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition text-sm"
            >
              {loading ? "Generating Pipeline..." : "Generate DSL"}
            </button>
          </div>
        </form>
      </div>

      {/* Result Output */}
      {dslOutput && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Generated Pipeline DSL</h2>
              {explanation && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{explanation}</p>}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              {copied ? "Copied!" : "Copy .pipe File"}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg font-mono text-sm overflow-x-auto border border-slate-800">
            {dslOutput}
          </pre>
        </div>
      )}
    </div>
  );
}