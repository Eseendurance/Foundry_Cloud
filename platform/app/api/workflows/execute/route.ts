import { NextResponse } from 'next/server';
import { RawWorkflowEngine } from '@/raw-engine/workflows/engine';

export async function POST(req: Request) {
  try {
    const { nodes, edges, triggerPayload } = await req.json();

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { error: 'Workflow node configuration is missing or invalid' },
        { status: 400 }
      );
    }

    const executionResult = await RawWorkflowEngine.executeGraph(
      nodes,
      edges || [],
      triggerPayload || {}
    );

    return NextResponse.json(executionResult);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Workflow execution error' },
      { status: 500 }
    );
  }
}