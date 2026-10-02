"use client";

import { useState } from "react";

interface VerifiedDomain {
  domain: string;
  status: "verified" | "pending" | "failed";
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
}

const INITIAL_DOMAINS: VerifiedDomain[] = [
  { domain: "briefgroup.net", status: "verified", spf: true, dkim: true, dmarc: true },
  { domain: "mail.omnicore.ai", status: "pending", spf: true, dkim: false, dmarc: false },
];

export default function EmailStudioPage() {
  const [activeTab, setActiveTab] = useState<"send" | "domains" | "templates">("send");

  // Send Tab State
  const [fromAddress, setFromAddress] = useState("notifications@briefgroup.net");
  const [toAddress, setToAddress] = useState("client@example.com");
  const [subject, setSubject] = useState("Your Order {{order_id}} is Confirmed!");
  const [htmlTemplate, setHtmlTemplate] = useState(
    `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #059669;">Hello {{user_name}},</h2>
  <p>Thank you for your business. Your order <strong>{{order_id}}</strong> has been processed successfully.</p>
  <p>Total Paid: <strong>\${{amount}}</strong></p>
</div>`
  );
  const [variablesJson, setVariablesJson] = useState(
    JSON.stringify({ user_name: "Ese", order_id: "ORD-9942", amount: "120.50" }, null, 2)
  );
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [sending, setSending] = useState(false);

  async function handleSendEmail() {
    setSending(true);
    setDispatchResult(null);

    let parsedVars = {};
    try {
      if (variablesJson.trim()) parsedVars = JSON.parse(variablesJson);
    } catch (e) {
      alert("Invalid JSON format in template variables.");
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddress,
          to: toAddress,
          subject,
          html: htmlTemplate,
          variables: parsedVars,
        }),
      });
      const data = await res.json();
      setDispatchResult(data);
    } catch (err) {
      console.error("Email dispatch failed", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Email Infrastructure Studio</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Resend & SendPulse-like delivery engine with transactional APIs, domain DKIM verification, and HTML templates.
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("send")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "send"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            ✉️ API Dispatch
          </button>
          <button
            onClick={() => setActiveTab("domains")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "domains"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            🌐 Domains & DKIM
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "templates"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            📄 Template Gallery
          </button>
        </div>
      </div>

      {/* TAB 1: API Dispatch Studio */}
      {activeTab === "send" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Dispatch Payload Configuration
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">From Sender</label>
                <input
                  type="text"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  className="w-full p-2.5 border rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">To Recipient</label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="w-full p-2.5 border rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 border rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">HTML Template Body</label>
              <textarea
                rows={6}
                value={htmlTemplate}
                onChange={(e) => setHtmlTemplate(e.target.value)}
                className="w-full p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg border border-slate-800 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Variables (JSON)</label>
              <textarea
                rows={3}
                value={variablesJson}
                onChange={(e) => setVariablesJson(e.target.value)}
                className="w-full p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-800 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>

            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm"
            >
              {sending ? "Dispatching Message..." : "🚀 Send Transactional Email"}
            </button>
          </div>

          {/* Render Preview & Dispatch Trace Output */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm min-h-[300px]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Live Render Preview</h3>
              <div
                className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs"
                dangerouslySetInnerHTML={{
                  __html: dispatchResult?.renderedHtml || htmlTemplate.replace(/\{\{\s*(\w+)\s*\}\}/g, "[$1]"),
                }}
              />
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 shadow-sm font-mono text-xs text-slate-300">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Raw Gateway Trace</h3>
              {dispatchResult ? (
                <pre className="overflow-auto max-h-48 text-emerald-300">
                  {JSON.stringify(dispatchResult, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 py-6 text-center">
                  Trigger a test dispatch to view the HTTP response payload.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Domains & Authentication */}
      {activeTab === "domains" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sending Domains & DNS Health</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Configure SPF, DKIM, and DMARC records to maximize delivery to inbox over spam filters.
              </p>
            </div>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition">
              + Add Sending Domain
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">Domain</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">SPF Record</th>
                  <th className="p-3">DKIM Key</th>
                  <th className="p-3">DMARC Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {INITIAL_DOMAINS.map((d) => (
                  <tr key={d.domain}>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{d.domain}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          d.status === "verified"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3">{d.spf ? "✓ Valid" : "✗ Missing"}</td>
                    <td className="p-3">{d.dkim ? "✓ Verified" : "⏳ Pending DNS"}</td>
                    <td className="p-3">{d.dmarc ? "✓ Configured" : "⏳ Pending DNS"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Templates */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 uppercase">
              Transactional
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Order Receipt & Payment Alert</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Standard customer payment confirmation email supporting custom item details and total receipt figures.
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 uppercase">
              Authentication
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Magic Link Login & OTP Security</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              High-deliverability authentication code email template designed to pass strict spam rules.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}