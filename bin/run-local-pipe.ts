import fs from 'fs';
import path from 'path';
import { parsePipeDSL } from '../raw-engine/dsl'; 
import { executeAST } from '../raw-engine/runtime/evaluator';

async function runLocalPipeline() {
  const args = process.argv.slice(2);
  const pipeFileName = args[0] || 'sample.pipe';
  const dataFileName = args[1] || 'sample-data.json';

  const pipelinesDir = path.join(process.cwd(), 'pipelines');
  const pipePath = path.join(pipelinesDir, pipeFileName);
  const dataPath = path.join(pipelinesDir, dataFileName);

  if (!fs.existsSync(pipePath)) {
    console.error(`[Error] Pipeline DSL file not found at: ${pipePath}`);
    process.exit(1);
  }

  const dslSource = fs.readFileSync(pipePath, 'utf-8');
  let inputData: Record<string, any> = {};

  if (fs.existsSync(dataPath)) {
    try {
      inputData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    } catch (e) {
      console.error(`[Error] Failed to parse input JSON at ${dataPath}:`, e);
      process.exit(1);
    }
  } else {
    console.log(`[Info] No input data file found at ${dataPath}. Using default mock payload.`);
    inputData = { id: "usr_101", name: "Ese", role: "admin", status: "active" };
  }

  console.log("=== 1. PARSING DSL ===");
  const ast = parsePipeDSL(dslSource);
  console.dir(ast, { depth: null });

  console.log("\n=== 2. EXECUTING AST LOCALLY ===");
  const startTime = performance.now();
  const { data, ctx } = await executeAST(ast, inputData);
  const executionTime = (performance.now() - startTime).toFixed(2);

  console.log("\n=== 3. RUNTIME LOGS ===");
  ctx.logs.forEach((log) => console.log(`[LOG] ${log}`));

  if (ctx.errors.length > 0) {
    console.log("\n=== ERRORS ===");
    ctx.errors.forEach((err) => console.error(`[ERR] ${err.message}`));
  }

  console.log(`\n=== 4. EXECUTION OUTPUT (${executionTime}ms) ===`);
  console.dir(data, { depth: null });
}

runLocalPipeline().catch((err) => {
  console.error("Unhandled execution error:", err);
  process.exit(1);
});