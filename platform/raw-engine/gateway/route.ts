import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateApiKey } from './auth';
import { parsePipeDSL } from '../dsl';
import { executeAST } from '../runtime/evaluator';

const router = Router();

// 1. Healthcheck Endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', engine: 'Raw Engine Core v1.0' });
});

// 2. Data Ingestion Endpoint (/v1/ingest)
router.post('/v1/ingest', authenticateApiKey, async (req: Request, res: Response) => {
  const { pipeline = 'sample.pipe', payload } = req.body;

  if (!payload) {
    return res.status(400).json({ error: 'Missing payload object in request body' });
  }

  // Find the requested .pipe file inside the pipelines directory
  const pipePath = path.join(process.cwd(), 'pipelines', pipeline);
  if (!fs.existsSync(pipePath)) {
    return res.status(404).json({ error: `Pipeline script '${pipeline}' not found` });
  }

  try {
    const startTime = performance.now();

    // Read and parse .pipe DSL
    const dslSource = fs.readFileSync(pipePath, 'utf-8');
    const ast = parsePipeDSL(dslSource);

    // Execute the DSL logic on the incoming payload
    const { data: transformedData, ctx } = await executeAST(ast, payload);
    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));

    // Send back the HTTP 200 JSON response to whoever sent the request
    return res.status(200).json({
      success: true,
      pipeline,
      execution_time_ms: executionTimeMs,
      logs: ctx.logs,
      errors: ctx.errors.map((e) => e.message),
      output: transformedData,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'DSL Execution failed',
      details: err.message,
    });
  }
});

export default router;