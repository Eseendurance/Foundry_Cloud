"use client";

import { useState, useEffect } from "react";
import { GitBranch, Check, AlertCircle, X } from "lucide-react";

type Status = { configured: boolean; connected: boolean; login: string | null };
type Repo = { full_name: string; private: boolean; default_branch: string };

export default function GitHubConnect({ files }: { files: Record<string, string> }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [existingRepo, setExistingRepo] = useState("");
  const [existingBranch, setExistingBranch] = useState("main");
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [message, setMessage] = useState("Update from Groundwork IDE");
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<{ repoUrl: string; commitUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/github/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, connected: false, login: null }));
  }, []);

  useEffect(() => {
    if (open && status?.connected && repos.length === 0) {
      fetch("/api/github/repos")
        .then((r) => r.json())
        .then((data) => {
          if (data.repos) setRepos(data.repos);
        });
    }
  }, [open, status, repos.length]);

  async function disconnect() {
    await fetch("/api/github/disconnect", { method: "POST" });
    setStatus({ configured: true, connected: false, login: null });
    setRepos([]);
  }

  async function push() {
    setPushing(true);
    setError(null);
    setResult(null);

    const body =
      mode === "existing"
        ? { files, message, existingRepo, branch: existingBranch }
        : { files, message, newRepoName, newRepoPrivate };

    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Push failed.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setPushing(false);
    }
  }

  if (!status) return null;

  if (!status.configured) {
    return (
      <span
        title="GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set"
        className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft opacity-60"
      >
        <GitBranch size={13} />
        GitHub not configured
      </span>
    );
  }

  if (!status.connected) {
    return (
      <a
        href="/api/github/authorize"
        className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-ink hover:text-ink"
      >
        <GitBranch size={13} />
        Connect to GitHub
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-moss/40 bg-moss/5 px-3 py-1.5 text-xs text-moss"
      >
        <GitBranch size={13} />
        {status.login} · Push
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 rounded-2xl border border-line bg-paper p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink">Push to GitHub</span>
            <div className="flex items-center gap-2">
              <button onClick={disconnect} className="text-[11px] text-ink-soft hover:text-rust">
                Disconnect
              </button>
              <button onClick={() => setOpen(false)}>
                <X size={14} className="text-ink-soft" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-1 rounded-full border border-line bg-paper-dim/40 p-0.5 text-xs">
            <button
              onClick={() => setMode("new")}
              className={`flex-1 rounded-full py-1 ${mode === "new" ? "bg-ink text-paper" : "text-ink-soft"}`}
            >
              New repo
            </button>
            <button
              onClick={() => setMode("existing")}
              className={`flex-1 rounded-full py-1 ${mode === "existing" ? "bg-ink text-paper" : "text-ink-soft"}`}
            >
              Existing repo
            </button>
          </div>

          {mode === "new" ? (
            <div className="mt-3 space-y-2">
              <input
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="repo-name"
                className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs focus:border-moss focus:outline-none"
              />
              <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={newRepoPrivate}
                  onChange={(e) => setNewRepoPrivate(e.target.checked)}
                />
                Private repo
              </label>
            </div>
          ) : (
            <select
              value={existingRepo}
              onChange={(e) => {
                setExistingRepo(e.target.value);
                const r = repos.find((r) => r.full_name === e.target.value);
                if (r) setExistingBranch(r.default_branch);
              }}
              className="mt-3 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs focus:border-moss focus:outline-none"
            >
              <option value="">Select a repo…</option>
              {repos.map((r) => (
                <option key={r.full_name} value={r.full_name}>
                  {r.full_name}
                  {r.private ? " (private)" : ""}
                </option>
              ))}
            </select>
          )}

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Commit message"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs focus:border-moss focus:outline-none"
          />

          <button
            onClick={push}
            disabled={pushing || (mode === "new" ? !newRepoName.trim() : !existingRepo)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-moss py-2 text-xs font-medium text-paper hover:bg-moss-deep disabled:opacity-50"
          >
            {pushing ? "Pushing…" : "Push"}
          </button>

          {error && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-rust">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          {result && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-moss">
              <Check size={12} className="mt-0.5 shrink-0" />
              Pushed —{" "}
              <a href={result.commitUrl} target="_blank" rel="noreferrer" className="underline">
                view commit
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
