export type WorkflowNode = {
  id: string;
  type: "trigger" | "transform" | "condition" | "delay" | "database" | "action";
  data: Record<string, unknown>;
};

export type WorkflowEdge = {
  source: string;
  target: string;
  condition?: "true" | "false";
};

export type WorkflowExecutionLog = {
  nodeId: string;
  type: WorkflowNode["type"];
  output: unknown;
  durationMs: number;
};

export type WorkflowExecutionResult = {
  success: boolean;
  logs: WorkflowExecutionLog[];
  error?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  if (nodes.length === 0 || nodes.length > 100) {
    return "A workflow must contain between 1 and 100 nodes.";
  }
  if (edges.length > 200) return "A workflow can contain at most 200 connections.";

  const ids = new Set<string>();
  const supportedTypes = new Set<WorkflowNode["type"]>([
    "trigger",
    "transform",
    "condition",
    "delay",
    "database",
    "action",
  ]);
  for (const node of nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      node.id.length < 1 ||
      node.id.length > 80 ||
      ids.has(node.id) ||
      !supportedTypes.has(node.type) ||
      !isObject(node.data)
    ) {
      return "Every workflow node needs a unique id and an object data value.";
    }
    ids.add(node.id);
  }

  const triggers = nodes.filter((node) => node.type === "trigger");
  if (triggers.length !== 1) return "A workflow must contain exactly one trigger node.";
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) {
      return "Every connection must link two different nodes in this workflow.";
    }
    if (edge.condition && edge.condition !== "true" && edge.condition !== "false") {
      return "Conditional connections must be labeled true or false.";
    }
  }
  const trigger = triggers[0];
  const reachable = new Set<string>([trigger.id]);
  const pending = [trigger.id];
  while (pending.length > 0) {
    const source = pending.pop();
    if (!source) continue;
    for (const edge of edges) {
      if (edge.source === source && !reachable.has(edge.target)) {
        reachable.add(edge.target);
        pending.push(edge.target);
      }
    }
  }
  if (reachable.size !== nodes.length) {
    return "Every workflow node must be connected to the trigger.";
  }
  return null;
}

export class RawWorkflowEngine {
  static async executeGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    triggerPayload: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    const invalid = validateWorkflowGraph(nodes, edges);
    if (invalid) return { success: false, logs: [], error: invalid };

    const byId = new Map(nodes.map((node) => [node.id, node]));
    const trigger = nodes.find((node) => node.type === "trigger");
    if (!trigger) return { success: false, logs: [], error: "Trigger node is missing." };

    const logs: WorkflowExecutionLog[] = [];
    const visited = new Set<string>();
    let currentNode: WorkflowNode | undefined = trigger;
    let payload = { ...triggerPayload };
    let delayBudgetMs = 0;

    while (currentNode) {
      if (visited.has(currentNode.id)) {
        return { success: false, logs, error: "Workflow loops are not supported by this runner." };
      }
      visited.add(currentNode.id);
      const startedAt = Date.now();
      let output: unknown;

      try {
        switch (currentNode.type) {
          case "trigger":
            output = { received: true };
            break;
          case "transform": {
            const updates = isObject(currentNode.data.values) ? currentNode.data.values : {};
            payload = { ...payload, ...updates };
            output = { transformed: true, keys: Object.keys(updates) };
            break;
          }
          case "condition": {
            const key = currentNode.data.key;
            if (typeof key !== "string" || key.length === 0) {
              throw new Error("Condition nodes require a data.key string.");
            }
            const conditionMet = payload[key] === currentNode.data.value;
            output = { conditionMet, checkedKey: key };
            break;
          }
          case "delay": {
            const durationMs = currentNode.data.durationMs;
            if (
              typeof durationMs !== "number" ||
              !Number.isInteger(durationMs) ||
              durationMs < 0 ||
              durationMs + delayBudgetMs > 30_000
            ) {
              throw new Error("Combined workflow delay must be an integer no greater than 30000 ms.");
            }
            delayBudgetMs += durationMs;
            await new Promise((resolve) => setTimeout(resolve, durationMs));
            output = { waitedMs: durationMs };
            break;
          }
          case "database":
            throw new Error("Database workflow actions are unavailable until scoped operations are configured.");
          case "action":
            throw new Error("This workflow action has no configured native handler.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Workflow step failed.";
        logs.push({
          nodeId: currentNode.id,
          type: currentNode.type,
          output: { error: message },
          durationMs: Date.now() - startedAt,
        });
        return { success: false, logs, error: message };
      }

      logs.push({
        nodeId: currentNode.id,
        type: currentNode.type,
        output,
        durationMs: Date.now() - startedAt,
      });

      const outgoing = edges.filter((edge) => edge.source === currentNode?.id);
      if (currentNode.type === "condition") {
        const result = output as { conditionMet: boolean };
        const branch = result.conditionMet ? "true" : "false";
        const selected = outgoing.filter((edge) => edge.condition === branch);
        if (selected.length > 1) {
          return { success: false, logs, error: "A condition branch can have at most one outgoing connection." };
        }
        currentNode = selected[0] ? byId.get(selected[0].target) : undefined;
      } else {
        if (outgoing.length > 1) {
          return { success: false, logs, error: "Only condition nodes can branch to multiple steps." };
        }
        currentNode = outgoing[0] ? byId.get(outgoing[0].target) : undefined;
      }
    }

    return { success: true, logs };
  }
}
