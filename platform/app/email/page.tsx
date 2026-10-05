"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Tab = "send" | "readiness" | "history";
type ReadinessCheck = { status: "pass" | "fail" | "unknown"; detail: string; fix: string };
type MailReadiness = {
  domain: string;
  checkedAt: string;
  checks: {
    outboundPort25: ReadinessCheck;
    reverseDns: ReadinessCheck;
    spf: ReadinessCheck;
    dkim: ReadinessCheck;
    dmarc: ReadinessCheck;
    blocklists: ReadinessCheck & { lists: Array<{ name: string; listed: boolean | null }> };
    warmup: ReadinessCheck & { dailyLimit: number; sentLast24Hours: number; remaining: number };
  };
};
type SentEmail = {
  id: string;
  to_email: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  click_count: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseError(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

export default function EmailStudioPage() {
  const [tab, setTab] = useState<Tab>("send");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Hello {{name}},</p>");
  const [variables, setVariables] = useState('{"name":"there"}');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [domain, setDomain] = useState("");
  const [selector, setSelector] = useState("");
  const [readiness, setReadiness] = useState<MailReadiness | null>(null);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);
    let parsedVariables: unknown;
    try {
      parsedVariables = JSON.parse(variables);
    } catch {
      setError("Template variables must be valid JSON.");
      setSending(false);
      return;
    }
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html, variables: parsedVariables }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(data, "SMTP delivery failed."));
      setResult(data);
      await loadHistory();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "SMTP delivery failed.");
    } finally {
      setSending(false);
    }
  }

  async function checkReadiness(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError(null);
    setReadiness(null);
    try {
      const params = new URLSearchParams({ domain, ...(selector ? { selector } : {}) });
      const response = await fetch(`/api/email/verify-domain?${params.toString()}`, { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Readiness checks failed."));
      setReadiness(data as MailReadiness);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "Readiness checks failed.");
    } finally {
      setChecking(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/email/sent", { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Could not load sent email history."));
      if (!isRecord(data) || !Array.isArray(data.emails)) {
        throw new Error("Email history response is malformed.");
      }
      setEmails(data.emails as SentEmail[]);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Could not load email history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  const readinessChecks = readiness
    ? [
        ["Outbound port 25", readiness.checks.outboundPort25],
        ["PTR and HELO", readiness.checks.reverseDns],
        ["SPF", readiness.checks.spf],
        ["DKIM", readiness.checks.dkim],
        ["DMARC", readiness.checks.dmarc],
        ["Blocklists", readiness.checks.blocklists],
        ["Warm-up limit", readiness.checks.warmup],
      ] as const
    : [];

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/dashboard" className="text-xs text-blue-700 hover:underline">← Workspace</Link>
            <h1 className="mt-1 text-xl font-semibold">Email delivery</h1>
          </div>
          <span className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600">
            Configured SMTP · Local sending
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Email tools">
          {([
            ["send", "Send"],
            ["readiness", "Server readiness"],
            ["history", "Sent history"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setTab(value);
                if (value === "history") void loadHistory();
              }}
              className={`rounded px-4 py-2 text-sm ${
                tab === value ? "bg-blue-700 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "send" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={send} className="space-y-4 rounded-lg border border-slate-200 p-5">
              <div>
                <h2 className="font-semibold">Transactional message</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Sends through your configured SMTP server. Daily warm-up caps are shared across web instances and enforced before each attempt.
                </p>
              </div>
              <label className="block text-xs font-medium text-slate-700">
                Recipient
                <input type="email" required value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Subject
                <input type="text" required maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                HTML content
                <textarea rows={7} required value={html} onChange={(event) => setHtml(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs" />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Template variables (JSON)
                <textarea rows={3} value={variables} onChange={(event) => setVariables(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs" />
              </label>
              <button disabled={sending} className="rounded bg-blue-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {sending ? "Sending…" : "Send email"}
              </button>
            </form>

            <div className="space-y-4">
              <section className="rounded-lg border border-slate-200 p-5">
                <h2 className="font-semibold">Sandboxed preview</h2>
                <iframe
                  title="Email HTML preview"
                  sandbox=""
                  srcDoc={html.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, "[$1]")}
                  className="mt-3 h-64 w-full rounded border border-slate-200 bg-white"
                />
              </section>
              {result !== null && (
                <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <h2 className="font-semibold text-blue-950">SMTP accepted the message</h2>
                  <pre className="mt-2 overflow-auto text-xs text-blue-950">{JSON.stringify(result, null, 2)}</pre>
                </section>
              )}
            </div>
          </section>
        )}

        {tab === "readiness" && (
          <section className="space-y-5">
            <form onSubmit={checkReadiness} className="grid gap-3 rounded-lg border border-slate-200 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-xs font-medium text-slate-700">
                Sending domain
                <input required value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="mail.example.com" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-700">
                DKIM selector
                <input value={selector} onChange={(event) => setSelector(event.target.value)} placeholder="default" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <button disabled={checking} className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {checking ? "Checking…" : "Run live checks"}
              </button>
            </form>
            <p className="text-sm text-slate-600">
              Checks make direct DNS lookups and a TCP connection to a public MX host. They do not change DNS. Blocklist resolvers may refuse queries; those results are shown as unknown rather than clean.
            </p>
            {readiness && (
              <>
                <h2 className="text-sm text-slate-600">
                  Checked {new Date(readiness.checkedAt).toLocaleString()} for <strong>{readiness.domain}</strong>
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {readinessChecks.map(([label, check]) => (
                    <article key={label} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold">{label}</h3>
                        <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${
                          check.status === "pass" ? "border-blue-300 text-blue-800" :
                            check.status === "fail" ? "border-slate-500 text-slate-900" :
                              "border-slate-300 text-slate-600"
                        }`}>{check.status}</span>
                      </div>
                      <p className="mt-2 break-words text-sm text-slate-700">{check.detail}</p>
                      <p className="mt-2 text-xs text-slate-500">Next step: {check.fix}</p>
                      {"lists" in check && check.lists.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-slate-600">
                          {check.lists.map((list) => (
                            <li key={list.name}>{list.name}: {list.listed === null ? "unknown" : list.listed ? "listed" : "not listed"}</li>
                          ))}
                        </ul>
                      )}
                      {"remaining" in check && (
                        <p className="mt-2 font-mono text-xs text-slate-600">{check.remaining} of {check.dailyLimit} send attempts remain in the 24-hour window.</p>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Recent sent messages</h2>
              <button onClick={() => void loadHistory()} disabled={historyLoading} className="text-xs text-blue-700 underline">
                {historyLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {emails.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Sent</th>
                      <th className="px-4 py-3">Opened</th>
                      <th className="px-4 py-3">Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {emails.map((email) => (
                      <tr key={email.id}>
                        <td className="px-4 py-3">{email.to_email}</td>
                        <td className="px-4 py-3">{email.subject}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(email.sent_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{email.opened_at ? new Date(email.opened_at).toLocaleString() : "—"}</td>
                        <td className="px-4 py-3">{email.click_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-slate-500">{historyLoading ? "Loading…" : "No messages have been sent from this workspace."}</p>
            )}
          </section>
        )}

        {error && (
          <div role="alert" className="rounded border border-slate-400 bg-slate-50 p-3 text-sm text-slate-900">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
