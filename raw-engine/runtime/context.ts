export interface PipelineContext {
  input: Record<string, any>;
  variables: Map<string, any>;
  logs: string[];
  errors: Error[];
}

export function createExecutionContext(inputData: Record<string, any>): PipelineContext {
  return {
    input: inputData,
    variables: new Map(),
    logs: [],
    errors: [],
  };
}