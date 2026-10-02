import {
  ASTProgram,
  EndpointNode,
  PipelineNode,
  TransformRuleNode,
  ConditionNode,
  WebhookNode,
  ValidationRuleNode,
} from "./ast";

export function parsePipeDSL(source: string): ASTProgram {
  const ast: ASTProgram = {
    endpoints: [],
    pipelines: [],
  };

  const lines = source.split("\n");
  let currentPipeline: PipelineNode | null = null;
  let currentCondition: ConditionNode | null = null;

  // States: "NONE" | "VALIDATE" | "TRANSFORM" | "IF" | "ELSE"
  let blockState: "NONE" | "VALIDATE" | "TRANSFORM" | "IF" | "ELSE" = "NONE";

  for (let rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // 1. Endpoint declaration
    if (line.startsWith("endpoint")) {
      const match = line.match(/endpoint\s+(GET|POST|PUT|DELETE)\s+"([^"]+)"/i);
      if (match) {
        ast.endpoints.push({
          type: "EndpointNode",
          method: match[1].toUpperCase(),
          path: match[2],
          requiresKey: line.includes("requiresKey: true"),
        });
      }
      continue;
    }

    // 2. Pipeline declaration
    if (line.startsWith("pipeline")) {
      const match = line.match(/pipeline\s+"([^"]+)"/);
      if (match) {
        currentPipeline = {
          type: "PipelineNode",
          name: match[1],
          validations: [],
          transforms: [],
          conditions: [],
          webhooks: [],
        };
        ast.pipelines.push(currentPipeline);
      }
      continue;
    }

    // 3. Webhook definition
    if (line.startsWith("webhook")) {
      const match = line.match(/webhook\s+"([^"]+)"/);
      if (match && currentPipeline) {
        currentPipeline.webhooks.push({
          type: "WebhookNode",
          url: match[1],
          method: "POST",
        });
      }
      continue;
    }

    // 4. Block Entries
    if (line.startsWith("validate {")) {
      blockState = "VALIDATE";
      continue;
    }

    if (line.startsWith("transform {")) {
      blockState = "TRANSFORM";
      continue;
    }

    if (line.startsWith("if ") && line.endsWith("{")) {
      const match = line.match(/^if\s+(.+)\s+\{$/);
      if (match && currentPipeline) {
        currentCondition = {
          type: "ConditionNode",
          condition: match[1].trim(),
          thenBranch: [],
          elseBranch: [],
        };
        currentPipeline.conditions.push(currentCondition);
        blockState = "IF";
      }
      continue;
    }

    if (line.startsWith("else {")) {
      blockState = "ELSE";
      continue;
    }

    // Block Exit
    if (line === "}") {
      if (blockState === "ELSE") {
        currentCondition = null;
      }
      blockState = "NONE";
      continue;
    }

    // 5. Parse Rules inside Validate Block
    if (blockState === "VALIDATE" && currentPipeline) {
      if (line.startsWith("require ")) {
        const field = line.replace("require ", "").trim();
        currentPipeline.validations.push({
          type: "ValidationRuleNode",
          ruleType: "require",
          field,
        });
      } else if (line.startsWith("type ")) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          currentPipeline.validations.push({
            type: "ValidationRuleNode",
            ruleType: "type",
            field: parts[1].trim(),
            expectedType: parts[2].trim().toLowerCase(),
          });
        }
      } else if (line.startsWith("email ")) {
        const field = line.replace("email ", "").trim();
        currentPipeline.validations.push({
          type: "ValidationRuleNode",
          ruleType: "email",
          field,
        });
      }
      continue;
    }

    // 6. Parse Field Assignments inside Transform/If/Else Blocks
    if (line.includes("=")) {
      const parts = line.split("=");
      const targetField = parts[0].trim();
      const expression = parts.slice(1).join("=").trim().replace(/;$/, "");

      const rule: TransformRuleNode = {
        type: "TransformRuleNode",
        targetField,
        expression,
      };

      if (blockState === "TRANSFORM" && currentPipeline) {
        currentPipeline.transforms.push(rule);
      } else if (blockState === "IF" && currentCondition) {
        currentCondition.thenBranch.push(rule);
      } else if (blockState === "ELSE" && currentCondition) {
        currentCondition.elseBranch?.push(rule);
      }
    }
  }

  return ast;
}

export const parse = parsePipeDSL;
export default parsePipeDSL;