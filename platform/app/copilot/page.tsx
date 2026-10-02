"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Terminal, Send } from "lucide-react";

type LogEntry = {
  id: string;
  timestamp: string;
  author: "User" | "System";
  text: string;
};

export default function CopilotPage() {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString(),
      author: "System",
      text: "Code generation engine initialized. Connected to keyless proxy /api/generate.",
    },
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input;
    const now = new Date().toLocaleTimeString();
    setInput("");

    setLogs((prev) => [
      ...prev,
      { id: String(Date.now()), timestamp: now, author: "User", text: userText },
    ]);

    setIsProcessing(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, type: "code" }),
      });

      const data = await res.json();

      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          timestamp: new Date().toLocaleTimeString(),
          author: "System",
          text: data.output || data.error || "No response received.",
        },
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          timestamp: new Date().toLocaleTimeString(),
          author: "System",
          text: `Execution Error: ${err.message}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="border-b border-black pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Development Assistant</h1>
          <p className="mt-1 text-xs text-black/70">
            Automated code generator for frontend components, API route handlers, and database structures.
          </p>
        </div>

        <div className="mt-8 border border-black bg-white">
          <div className="flex items-center justify-between border-b border-black px-4 py-3 bg-white">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
              <Terminal size={14} /> Workspace Log
            </div>
            <span className="text-[11px] font-mono">Status: Active</span>
          </div>

          <div className="flex h-[400px] flex-col gap-3 overflow-y-auto p-4 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 border ${
                  log.author === "User"
                    ? "border-black bg-white"
                    : "border-black/20 bg-white"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-black/60 mb-1">
                  <span>{log.author}</span>
                  <span>{log.timestamp}</span>
                </div>
                <p className="text-black leading-relaxed font-sans text-xs whitespace-pre-wrap">{log.text}</p>
              </div>
            ))}
            {isProcessing && (
              <div className="p-2 text-xs text-black/50 font-mono italic">
                Executing request via /api/generate...
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-black p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Specify file changes, route creation, or data structures..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full border border-black bg-white px-3 py-2 text-xs text-black placeholder:text-black/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing || !input.trim()}
                className="border border-black bg-black px-4 py-2 text-xs font-medium text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
              >
                Execute
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}