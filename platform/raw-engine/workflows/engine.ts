export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'transform' | 'condition' | 'database' | 'action';
  data: Record<string, any>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowExecutionResult {
  nodeId: string;
  type: string;
  output: any;
  durationMs: number;
}

export class RawWorkflowEngine {
  /**
   * Runs node graphs sequentially and records step execution logs.
   */
  static async executeGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    triggerPayload: Record<string, any>
  ): Promise<{ success: boolean; logs: WorkflowExecutionResult[] }> {
    const logs: WorkflowExecutionResult[] = [];
    let currentPayload = { ...triggerPayload };

    for (const node of nodes) {
      const startTime = Date.now();
      let nodeOutput: any = {};

      try {
        switch (node.type) {
          case 'trigger':
            nodeOutput = { status: 'triggered', payload: currentPayload };
            break;

          case 'transform':
            // Simple key-value mapping transform
            nodeOutput = {
              transformed: true,
              data: { ...currentPayload, ...node.data },
            };
            currentPayload = nodeOutput.data;
            break;

          case 'condition':
            const checkKey = node.data.key || 'status';
            const expectedValue = node.data.value || 'ok';
            const conditionMet = currentPayload[checkKey] === expectedValue;
            nodeOutput = { conditionMet, checkedKey: checkKey };
            break;

          case 'database':
            nodeOutput = {
              status: 'query_executed',
              recordsAffected: 1,
              data: currentPayload,
            };
            break;

          default:
            nodeOutput = { executed: true, data: currentPayload };
            break;
        }

        logs.push({
          nodeId: node.id,
          type: node.type,
          output: nodeOutput,
          durationMs: Date.now() - startTime,
        });
      } catch (err: any) {
        logs.push({
          nodeId: node.id,
          type: node.type,
          output: { error: err.message || 'Execution failed' },
          durationMs: Date.now() - startTime,
        });
        return { success: false, logs };
      }
    }

    return { success: true, logs };
  }
}