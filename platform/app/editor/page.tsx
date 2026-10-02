"use client";

import { useState } from "react";

const INITIAL_DSL = `pipeline "OrderProcessingPipeline" {
  version = "1.0"
  
  source "webhook_orders" {
    type = "http_endpoint"
    path = "/v1/ingest/orders"
  }

  transform "FilterHighValue" {
    filter = "payload.amount >= 50"
    map = {
      order_id = "payload.id"
      customer = "payload.user_email"
      processed_amount = "payload.amount"
    }
  }

  destination "neon_db" {
    target = "orders_table"
  }
}`;

const INITIAL_PAYLOAD = `{
  "id": "ord_9942",
  "user_email": "client@example.com",
  "amount": 120.50
}`;

export default function EditorPage() {
  const [code, setCode] = useState(INITIAL_DSL);
  const [payloadText, setPayloadText] = useState(INITIAL_PAYLOAD);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleValidateAndRun() {
    setLoading(true);
    setValidationResult(null);

    let parsedPayload = null;
    try {
      if (payloadText.trim()) {
        parsedPayload = JSON.parse(payloadText);
      }
    } catch (e) {
      alert("Invalid test JSON payload. Please fix payload formatting.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/editor/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, payload: parsedPayload }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch (err) {
      console.error("Validation request failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AST Pipeline Editor</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Author and debug `.pipe` DSL configurations with real-time AST syntax validation and payload testing.
          </p>
        </div>
        <button
          onClick={handleValidateAndRun}
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-2 text-sm"
        >
          {loading ? "Validating..." : "▶ Run AST Test"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* DSL Code Editor */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col h-[520px]">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
            <span>pipeline.pipe</span>
            <span>DSL v1.0</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-4 bg-slate-900 text-emerald-300 font-mono text-sm focus:outline-none resize-none leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Payload & Validation Panel */}
        <div className="space-y-6 flex flex-col h-[520px]">
          {/* Test JSON Input */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 text-xs font-mono text-slate-400">
              Test Event Payload (JSON)
            </div>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className="flex-1 w-full p-4 bg-slate-900 text-slate-200 font-mono text-xs focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>

          {/* Execution Output */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 h-[220px] overflow-auto shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              AST AST & Execution Output
            </h3>
            {validationResult ? (
              validationResult.valid ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>✓ AST Syntax Valid</span>
                  </div>
                  {validationResult.executionResult && (
                    <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-slate-300">
                      <div><strong className="text-emerald-400">Status:</strong> {validationResult.executionResult.status}</div>
                      <div><strong className="text-emerald-400">Pipeline Target:</strong> {validationResult.ast.name}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 font-mono text-xs rounded">
                  {validationResult.error}
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400">Click "Run AST Test" above to validate syntax and execute the test payload.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}