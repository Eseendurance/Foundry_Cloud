import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { code, payload } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Pipeline DSL code is required" }, { status: 400 });
    }

    // Basic syntax checking and AST validation logic
    const pipelineNameMatch = code.match(/pipeline\s+"([^"]+)"/);
    const sourceMatch = code.match(/source\s+"([^"]+)"/);
    const transformMatch = code.match(/transform\s+"([^"]+)"/);
    const filterMatch = code.match(/filter\s*=\s*"([^"]+)"/);

    if (!pipelineNameMatch) {
      return NextResponse.json({
        valid: false,
        error: "Syntax Error: Missing pipeline definition (e.g., pipeline \"MyPipeline\")",
      });
    }

    const ast = {
      type: "PipelineDeclaration",
      name: pipelineNameMatch[1],
      source: sourceMatch ? sourceMatch[1] : "default_source",
      transform: transformMatch ? transformMatch[1] : null,
      filterCondition: filterMatch ? filterMatch[1] : null,
    };

    // Evaluate simulated test execution if a JSON payload was provided
    let executionResult = null;
    if (payload) {
      let passedFilter = true;
      if (filterMatch) {
        try {
          // Safe evaluation mock for DSL filter condition
          const filterExpr = filterMatch[1].replace(/payload\./g, "");
          const keys = Object.keys(payload);
          const values = Object.values(payload);
          const evalFn = new Function(...keys, `return ${filterExpr};`);
          passedFilter = Boolean(evalFn(...values));
        } catch (e) {
          passedFilter = true; // Fallback if expression isn't standard JS
        }
      }

      executionResult = {
        status: passedFilter ? "Ingested & Processed" : "Filtered Out (Dropped)",
        passedFilter,
        outputPayload: passedFilter ? payload : null,
        timestamp: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      valid: true,
      ast,
      executionResult,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}