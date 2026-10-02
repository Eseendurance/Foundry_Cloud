"use client";

import { useState } from "react";
import { Bot, Send, Check, AlertCircle } from "lucide-react";
import { lineDiff } from "@/lib/diff";

type Edit = { path: string; content: string };
type Turn = {
  role: "user" | "agent" | "error";
  text: string;
  edits?: Edit[];
  appliedPaths?: string[];
};

export default function AgentPanel({
  files,
  onApply,
}: {
  files: Record<string, string>;
  onApply: (path: string, content: string) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    const text = instruction.trim();
    if (!text || loading) return;

    setTurns((t) => [...t, { role: "user", text }]);
    setInstruction("");
    setLoading(true);

    try {
      const res = await fetch("/api/ide/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, files }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTurns((t) => [...t, { role: "error", text: data.error || `Request failed (${res.status}).` }]);
      } else {
        setTurns((t) => [
          ...t,
          { role: "agent", text: data.message || "(no explanation given)", edits: data.edits || [] },
        ]);
      }
    } catch {
      setTurns((t) => [...t, { role: "error", text: "Couldn't reach the server." }]);
    } finally {
      setLoading(false);
    }
  }

  function applyEdit(turnIndex: number, edit: Edit) {
    onApply(edit.path, edit.content);
    setTurns((t) =>
      t.map((turn, i) =>
        i === turnIndex
          ? { ...turn, appliedPaths: [...(turn.appliedPaths || []), edit.path] }
          : turn
      )
    );
  }

  return (
    <div className="flex h-full flex-col border-l border-line bg-paper-dim/30">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Bot size={14} className="text-moss" />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          Agent
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-3">
        {turns.length === 0 && (
          <p className="text-xs text-ink-soft">
            Ask it to change something — e.g. &quot;add a dark mode toggle&quot;
            or &quot;why isn&apos;t the button working?&quot;. It sees your
            current files and proposes edits you approve before anything
            changes.
          </p>
        )}

        {turns.map((turn, i) => (
          <div key={i}>
            {turn.role === "user" && (
              <p className="rounded-lg bg-ink/5 px-2.5 py-1.5 text-xs text-ink">{turn.text}</p>
            )}

            {turn.role === "error" && (
              <p className="flex items-start gap-1.5 rounded-lg bg-rust/10 px-2.5 py-1.5 text-xs text-rust">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {turn.text}
              </p>
            )}

            {turn.role === "agent" && (
              <div className="space-y-2">
                <p className="text-xs text-ink-soft">{turn.text}</p>
                {(turn.edits || []).map((edit) => {
                  const applied = turn.appliedPaths?.includes(edit.path);
                  const diff = lineDiff(files[edit.path] || "", edit.content);
                  return (
                    <div key={edit.path} className="overflow-hidden rounded-lg border border-line">
                      <div className="flex items-center justify-between bg-paper-dim/60 px-2 py-1">
                        <span className="font-mono text-[11px] text-ink">{edit.path}</span>
                        {applied ? (
                          <span className="flex items-center gap-1 text-[11px] text-moss">
                            <Check size={11} />
                            Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => applyEdit(i, edit)}
                            className="flex items-center gap-1 rounded-full bg-moss px-2 py-0.5 text-[11px] font-medium text-paper hover:bg-moss-deep"
                          >
                            <Check size={11} />
                            Apply
                          </button>
                        )}
                      </div>
                      <div className="max-h-40 overflow-auto bg-ink px-2 py-1 font-mono text-[11px] leading-relaxed">
                        {diff.map((line, li) => (
                          <div
                            key={li}
                            className={
                              line.type === "add"
                                ? "bg-moss/20 text-moss"
                                : line.type === "remove"
                                ? "bg-rust/20 text-rust/90 line-through decoration-1"
                                : "text-paper/50"
                            }
                          >
                            {line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  "}
                            {line.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {loading && <p className="text-xs text-ink-soft">Thinking…</p>}
      </div>

      <div className="border-t border-line p-2">
        <div className="flex gap-1.5">
          <textarea
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Ask the agent…"
            className="w-full resize-none rounded-lg border border-line bg-paper px-2 py-1.5 text-xs focus:border-moss focus:outline-none"
          />
          <button
            onClick={ask}
            disabled={loading || !instruction.trim()}
            className="shrink-0 self-end rounded-lg bg-moss p-2 text-paper hover:bg-moss-deep disabled:opacity-50"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
