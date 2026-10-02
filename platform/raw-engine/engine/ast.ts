export interface ASTNode {
  type: string;
}

export interface EndpointNode extends ASTNode {
  type: "EndpointNode";
  method: string;
  path: string;
  requiresKey: boolean;
}

export interface TransformRuleNode extends ASTNode {
  type: "TransformRuleNode";
  targetField: string;
  expression: string;
}

export interface ValidationRuleNode extends ASTNode {
  type: "ValidationRuleNode";
  ruleType: "require" | "type" | "email";
  field: string;
  expectedType?: string; // e.g. "string", "number", "boolean", "object"
}

export interface ConditionNode extends ASTNode {
  type: "ConditionNode";
  condition: string;
  thenBranch: TransformRuleNode[];
  elseBranch?: TransformRuleNode[];
}

export interface WebhookNode extends ASTNode {
  type: "WebhookNode";
  url: string;
  method?: string;
}

export interface PipelineNode extends ASTNode {
  type: "PipelineNode";
  name: string;
  validations: ValidationRuleNode[];
  transforms: TransformRuleNode[];
  conditions: ConditionNode[];
  webhooks: WebhookNode[];
}

export interface ASTProgram {
  endpoints: EndpointNode[];
  pipelines: PipelineNode[];
}