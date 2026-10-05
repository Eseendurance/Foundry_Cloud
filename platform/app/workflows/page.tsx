"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowExecutionResult,
} from "@/raw-engine/workflows/engine";

type SavedWorkflow = {
  id: string;
  name: string;
  nodes_json: WorkflowNode[];
  edges_json: WorkflowEdge[];
  updated_at: string;
};

type ExecutionRecord = {
  id: string;
  succeeded: boolean;
  steps: { nodeId: string; type: string; durationMs: number; failed: boolean }[];
  created_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeType(value: unknown): value is WorkflowNode["type"] {
  return (
    value === "trigger" ||
    value === "transform" ||
    value === "condition" ||
    value === "delay" ||
    value === "database" ||
    value === "action"
  );
}

export default function WorkflowsDashboard() {
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState("New workflow");
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: "trigger", type: "trigger", data: {} },
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [latestResult, setLatestResult] = useState<WorkflowExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidTransformIds, setInvalidTransformIds] = useState<string[]>([]);

  useEffect(() => {
    void refreshData();
  }, []);

  async function refreshData() {
    setLoading(true);
    setError(null);
    try {
      const [workflowResponse, executionResponse] = await Promise.all([
        fetch("/api/workflows", { cache: "no-store" }),
        fetch("/api/workflows/execute", { cache: "no-store" }),
      ]);
      const workflowData = await workflowResponse.json();
      const executionData = await executionResponse.json();
      if (!workflowResponse.ok) throw new Error(workflowData.error || "Could not load workflows.");
      if (!executionResponse.ok) throw new Error(executionData.error || "Could not load execution history.");
      setWorkflows(workflowData.workflows || []);
      setExecutions(executionData.executions || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load workflows.");
    } finally {
      setLoading(false);
    }
  }

  function setNodeData(id: string, data: Record<string, unknown>) {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, data } : node)));
  }

  function addNode(type: "transform" | "delay") {
    const previous = nodes[nodes.length - 1];
    const node: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      data: type === "transform" ? { values: {} } : { durationMs: 250 },
    };
    setNodes((current) => [...current, node]);
    setEdges((current) => [...current, { source: previous.id, target: node.id }]);
    setWorkflowId(null);
  }

  function newWorkflow() {
    setWorkflowId(null);
    setName("New workflow");
    setNodes([{ id: "trigger", type: "trigger", data: {} }]);
    setEdges([]);
    setLatestResult(null);
    setInvalidTransformIds([]);
  }

  function loadWorkflow(workflow: SavedWorkflow) {
    setWorkflowId(workflow.id);
    setName(workflow.name);
    setNodes(workflow.nodes_json);
    setEdges(workflow.edges_json);
    setLatestResult(null);
  }

  async function saveWorkflow() {
    if (invalidTransformIds.length > 0) {
      setError("Fix invalid transform JSON before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(workflowId ? { id: workflowId } : {}),
          name,
          nodes,
          edges,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save workflow.");
      setWorkflowId(data.id);
      await refreshData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save workflow.");
    } finally {
      setBusy(false);
    }
  }

  async function executeWorkflow() {
    if (invalidTransformIds.length > 0) {
      setError("Fix invalid transform JSON before running.");
      return;
    }
    setBusy(true);
    setError(null);
    setLatestResult(null);
    try {
      const response = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, triggerPayload: {} }),
      });
      const data: unknown = await response.json();
      if (!isRecord(data)) throw new Error("Workflow runner returned an invalid response.");
      if (Array.isArray(data.logs)) {
        const logs = data.logs.flatMap((entry) => {
          if (
            !isRecord(entry) ||
            typeof entry.nodeId !== "string" ||
            !isNodeType(entry.type) ||
            typeof entry.durationMs !== "number" ||
            !("output" in entry)
          ) {
            return [];
          }
          return [{
            nodeId: entry.nodeId,
            type: entry.type,
            durationMs: entry.durationMs,
            output: entry.output,
          }];
        });
        setLatestResult({
          success: data.success === true,
          logs,
          ...(typeof data.error === "string" ? { error: data.error } : {}),
        });
      }
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Workflow execution failed.");
      await refreshData();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Workflow execution failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/dashboard" className="text-xs text-blue-700 hover:underline">← Workspace</Link>
            <h1 className="mt-1 text-xl font-semibold">Workflows</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={newWorkflow} className="rounded border border-slate-300 px-3 py-2 text-sm">New</button>
            <button onClick={() => void saveWorkflow()} disabled={busy} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Save</button>
            <button onClick={() => void executeWorkflow()} disabled={busy} className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Working…" : "Run"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold">Saved workflows</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : workflows.length ? (
            <ul className="mt-3 space-y-1">
              {workflows.map((workflow) => (
                <li key={workflow.id}>
                  <button
                    onClick={() => loadWorkflow(workflow)}
                    className={`w-full rounded px-3 py-2 text-left text-sm ${
                      workflowId === workflow.id ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="block truncate font-medium">{workflow.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {new Date(workflow.updated_at).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No saved workflows in this workspace yet.</p>
          )}
          <h2 className="mt-8 border-t border-slate-200 pt-4 text-sm font-semibold">Execution history</h2>
          <ul className="mt-3 space-y-2">
            {executions.slice(0, 10).map((execution) => (
              <li key={execution.id} className="text-xs">
                <span className={execution.succeeded ? "text-blue-800" : "text-slate-700"}>
                  {execution.succeeded ? "Succeeded" : "Failed"}
                </span>
                <span className="ml-2 text-slate-500">{new Date(execution.created_at).toLocaleString()}</span>
              </li>
            ))}
            {!executions.length && <li className="text-xs text-slate-500">No recorded runs.</li>}
          </ul>
        </aside>

        <section className="min-w-0 rounded-lg border border-slate-200 p-4 sm:p-6">
          <label htmlFor="workflow-name" className="text-xs font-medium uppercase tracking-wide text-slate-600">Workflow name</label>
          <input
            id="workflow-name"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full border-b border-slate-300 py-2 text-lg font-semibold outline-none focus:border-blue-700"
          />
          <p className="mt-3 text-sm text-slate-600">
            The local runner currently executes triggers, JSON transforms, conditions, and bounded delays. Database and external action nodes remain disabled until their scoped handlers are configured.
          </p>

          <div className="mt-6 space-y-3">
            {nodes.map((node, index) => (
              <article key={node.id} className="rounded border border-slate-300 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs uppercase text-blue-700">{node.type}</span>
                    <h3 className="mt-1 text-sm font-semibold">{index === 0 ? "Workflow trigger" : `${node.type} step ${index}`}</h3>
                  </div>
                  {index > 0 && (
                    <button
                      onClick={() => {
                        const remaining = nodes.filter((item) => item.id !== node.id);
                        setNodes(remaining);
                        setEdges(
                          remaining.slice(1).map((item, position) => ({
                            source: remaining[position].id,
                            target: item.id,
                          }))
                        );
                        setWorkflowId(null);
                        setInvalidTransformIds((current) => current.filter((invalidId) => invalidId !== node.id));
                      }}
                      className="text-xs text-slate-600 underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {node.type === "transform" && (
                  <label className="mt-3 block text-xs text-slate-600">
                    JSON values to merge into the current payload
                    <textarea
                      value={JSON.stringify(node.data.values || {}, null, 2)}
                      onChange={(event) => {
                        try {
                          const values: unknown = JSON.parse(event.target.value);
                          if (!isRecord(values)) throw new Error("Values must be a JSON object.");
                          setNodeData(node.id, { values });
                          setInvalidTransformIds((current) => current.filter((invalidId) => invalidId !== node.id));
                          setError(null);
                        } catch (parseError) {
                          setInvalidTransformIds((current) =>
                            current.includes(node.id) ? current : [...current, node.id]
                          );
                          setError(parseError instanceof Error ? parseError.message : "Enter valid JSON.");
                        }
                      }}
                      rows={4}
                      className="mt-1 w-full rounded border border-slate-300 p-2 font-mono text-xs text-slate-900"
                    />
                  </label>
                )}
                {node.type === "delay" && (
                  <label className="mt-3 block text-xs text-slate-600">
                    Delay (milliseconds, total run limit 30 seconds)
                    <input
                      type="number"
                      min={0}
                      max={30000}
                      step={50}
                      value={Number(node.data.durationMs || 0)}
                      onChange={(event) => setNodeData(node.id, { durationMs: Number(event.target.value) })}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                )}
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => addNode("transform")} className="rounded border border-slate-300 px-3 py-2 text-sm">Add transform</button>
            <button onClick={() => addNode("delay")} className="rounded border border-slate-300 px-3 py-2 text-sm">Add delay</button>
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold">Latest run</h2>
          {latestResult ? (
            <>
              <p className="mt-2 text-sm">{latestResult.success ? "Completed" : "Failed"}</p>
              {latestResult.error && <p className="mt-2 text-xs text-slate-700">{latestResult.error}</p>}
              <ul className="mt-4 space-y-2">
                {latestResult.logs.map((log) => (
                  <li key={log.nodeId} className="rounded bg-slate-50 p-2 text-xs">
                    <span className="font-medium">{log.type}</span>
                    <span className="float-right text-slate-500">{log.durationMs} ms</span>
                    {isRecord(log.output) && typeof log.output.error === "string" && (
                      <p className="mt-1 text-slate-700">{log.output.error}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Run a workflow to see step-by-step execution results.</p>
          )}
        </aside>
      </div>

      {error && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded border border-slate-400 bg-white p-3 text-sm shadow-lg">
          {error}
        </div>
      )}
    </main>
  );
}
