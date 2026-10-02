import crypto from "crypto";
import { ASTProgram, TransformRuleNode, ValidationRuleNode } from "../engine/ast";

export interface ExecutionContext {
  logs: string[];
  errors: Error[];
  validationErrors: string[];
  webhooksTriggered: string[];
}

export async function executeAST(
  ast: ASTProgram,
  payload: Record<string, any>
): Promise<{ data: Record<string, any>; ctx: ExecutionContext }> {
  const ctx: ExecutionContext = {
    logs: [],
    errors: [],
    validationErrors: [],
    webhooksTriggered: [],
  };
  const output: Record<string, any> = { ...payload };

  for (const pipeline of ast.pipelines) {
    ctx.logs.push(`Executing pipeline '${pipeline.name}'`);

    // 1. Validation Block
    for (const validation of pipeline.validations || []) {
      validateField(validation, payload, ctx);
    }

    if (ctx.validationErrors.length > 0) {
      ctx.logs.push(`[VALIDATION FAILED] Halting pipeline execution due to ${ctx.validationErrors.length} error(s)`);
      return { data: output, ctx };
    }

    // 2. Unconditional Transforms
    for (const transform of pipeline.transforms || []) {
      applyTransform(transform, payload, output, ctx);
    }

    // 3. Conditional Logic
    for (const condNode of pipeline.conditions || []) {
      const conditionMet = evaluateCondition(condNode.condition, output, payload);
      ctx.logs.push(`Evaluating condition (${condNode.condition}) => ${conditionMet}`);

      const targetBranch = conditionMet ? condNode.thenBranch : condNode.elseBranch || [];
      for (const transform of targetBranch) {
        applyTransform(transform, payload, output, ctx);
      }
    }

    // 4. Webhook Notifications
    for (const webhook of pipeline.webhooks || []) {
      try {
        ctx.logs.push(`Dispatching webhook to: ${webhook.url}`);
        fetch(webhook.url, {
          method: webhook.method || "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(output),
        }).catch((err) => {
          ctx.logs.push(`Webhook warning (${webhook.url}): ${err.message}`);
        });
        ctx.webhooksTriggered.push(webhook.url);
      } catch (err: any) {
        ctx.errors.push(new Error(`Webhook dispatch failed: ${err.message}`));
      }
    }
  }

  return { data: output, ctx };
}

function validateField(rule: ValidationRuleNode, data: Record<string, any>, ctx: ExecutionContext) {
  const value = getFieldValue(rule.field, data);

  if (rule.ruleType === "require") {
    if (value === undefined || value === null || value === "") {
      const msg = `Field '${rule.field}' is required but was missing or empty`;
      ctx.validationErrors.push(msg);
      ctx.logs.push(`[VALIDATION ERROR] ${msg}`);
    }
  } else if (rule.ruleType === "type" && rule.expectedType) {
    if (value !== undefined && value !== null) {
      const actualType = typeof value;
      if (actualType !== rule.expectedType) {
        const msg = `Field '${rule.field}' expected type '${rule.expectedType}', got '${actualType}'`;
        ctx.validationErrors.push(msg);
        ctx.logs.push(`[VALIDATION ERROR] ${msg}`);
      }
    }
  } else if (rule.ruleType === "email") {
    if (value && typeof value === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        const msg = `Field '${rule.field}' value '${value}' is not a valid email address`;
        ctx.validationErrors.push(msg);
        ctx.logs.push(`[VALIDATION ERROR] ${msg}`);
      }
    }
  }
}

function applyTransform(
  transform: TransformRuleNode,
  payload: Record<string, any>,
  output: Record<string, any>,
  ctx: ExecutionContext
) {
  try {
    output[transform.targetField] = evaluateExpression(transform.expression, payload, output);
    ctx.logs.push(`Set '${transform.targetField}' = ${JSON.stringify(output[transform.targetField])}`);
  } catch (err: any) {
    ctx.errors.push(new Error(`Transform failed for field '${transform.targetField}': ${err.message}`));
  }
}

function evaluateCondition(
  conditionStr: string,
  currentOutput: Record<string, any>,
  rawInput: Record<string, any>
): boolean {
  try {
    let op = "";
    if (conditionStr.includes("==")) op = "==";
    else if (conditionStr.includes("!=")) op = "!=";

    if (op) {
      const parts = conditionStr.split(op).map((s) => s.trim());
      const leftKey = parts[0];
      const rightVal = cleanQuotes(parts[1]).toLowerCase();

      const leftVal = String(
        getFieldValue(leftKey, currentOutput) ?? getFieldValue(leftKey, rawInput) ?? ""
      ).toLowerCase();

      if (op === "==") return leftVal === rightVal;
      if (op === "!=") return leftVal !== rightVal;
    }

    const val = getFieldValue(conditionStr, currentOutput) ?? getFieldValue(conditionStr, rawInput);
    return Boolean(val);
  } catch {
    return false;
  }
}

function evaluateExpression(
  expr: string,
  rawInput: Record<string, any>,
  currentOutput: Record<string, any>
): any {
  expr = expr.trim();

  // Simple Built-in Functions
  if (expr === "now()") return new Date().toISOString();
  if (expr === "uuid()") return crypto.randomUUID();

  // Helper: uppercase(...)
  if (expr.startsWith("uppercase(")) {
    const inner = expr.match(/uppercase\(([^)]+)\)/)?.[1]?.trim();
    const val = getFieldValue(inner, currentOutput) ?? getFieldValue(inner, rawInput);
    return typeof val === "string" ? val.toUpperCase() : val;
  }

  // Helper: lowercase(...)
  if (expr.startsWith("lowercase(")) {
    const inner = expr.match(/lowercase\(([^)]+)\)/)?.[1]?.trim();
    const val = getFieldValue(inner, currentOutput) ?? getFieldValue(inner, rawInput);
    return typeof val === "string" ? val.toLowerCase() : val;
  }

  // Helper: hash(...) - SHA256 Hashing
  if (expr.startsWith("hash(")) {
    const inner = expr.match(/hash\(([^)]+)\)/)?.[1]?.trim();
    const val = String(getFieldValue(inner, currentOutput) ?? getFieldValue(inner, rawInput) ?? "");
    return crypto.createHash("sha256").update(val).digest("hex");
  }

  // Helper: default(field, fallbackValue)
  if (expr.startsWith("default(")) {
    const match = expr.match(/default\(([^,]+),\s*(.+)\)/);
    if (match) {
      const fieldName = match[1].trim();
      const fallbackVal = cleanQuotes(match[2].trim());
      const existingVal = getFieldValue(fieldName, currentOutput) ?? getFieldValue(fieldName, rawInput);
      return existingVal !== undefined && existingVal !== null && existingVal !== "" ? existingVal : fallbackVal;
    }
  }

  // Helper: concat(...)
  if (expr.startsWith("concat(")) {
    const match = expr.match(/concat\((.+)\)/);
    if (match) {
      const args = match[1].split(",").map((s) => s.trim());
      return args
        .map((arg) => {
          if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
            return cleanQuotes(arg);
          }
          return String(getFieldValue(arg, currentOutput) ?? getFieldValue(arg, rawInput) ?? "");
        })
        .join("");
    }
  }

  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return cleanQuotes(expr);
  }

  if (!isNaN(Number(expr))) return Number(expr);

  return getFieldValue(expr, currentOutput) ?? getFieldValue(expr, rawInput) ?? expr;
}

function cleanQuotes(str: string): string {
  return str.replace(/^['"]|['"]$/g, "");
}

function getFieldValue(fieldName: string | undefined, data: Record<string, any>): any {
  if (!fieldName || !data) return undefined;
  if (fieldName.startsWith("payload.")) {
    return data[fieldName.replace("payload.", "")];
  }
  return data[fieldName];
}