import fs from "fs";
import path from "path";
import { tokenize } from "../raw-engine/engine/lexer";
import { parse, parsePipeDSL } from "../raw-engine/engine/parser";
import { executeSourceIngestion } from "../raw-engine/engine/worker";
import { startGatewayServer } from "../raw-engine/engine/gateway";

async function main() {
  const scriptPath = path.join(process.cwd(), "pipelines", "open_data.pipe");
  
  let code = "";
  if (fs.existsSync(scriptPath)) {
    code = fs.readFileSync(scriptPath, "utf-8");
  } else {
    // Fallback to sample.pipe if open_data.pipe is missing
    const fallbackPath = path.join(process.cwd(), "pipelines", "sample.pipe");
    if (fs.existsSync(fallbackPath)) {
      code = fs.readFileSync(fallbackPath, "utf-8");
    }
  }

  console.log("=== RAW ENGINE: Tokenizing & Parsing ===");
  
  let ast: any;
  const parserFn = parse || parsePipeDSL;

  try {
    // Try tokenizing first if lexer function exists
    if (typeof tokenize === "function") {
      const tokens = tokenize(code);
      ast = parserFn(tokens as any);
    } else {
      ast = parserFn(code);
    }
  } catch {
    // Fallback directly to parsing raw string code
    ast = parserFn(code);
  }

  // 1. Run Data Pipeline Ingestion Workers
  if (ast && Array.isArray(ast.sources) && ast.sources.length > 0) {
    console.log("\n=== RAW ENGINE: Executing Ingestion Workers ===");
    for (const source of ast.sources) {
      if (typeof executeSourceIngestion === "function") {
        await executeSourceIngestion(source);
      }
    }
  }

  // 2. Start Gateway Server
  startGatewayServer(ast, 4000);
}

main().catch((err) => {
  console.error("Fatal Engine Error:", err);
  process.exit(1);
});