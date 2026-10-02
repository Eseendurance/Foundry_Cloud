import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";

export async function POST(req: NextRequest) {
  // 1. Verify Authorization Header
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  // Require API Key matching your environment variable
  if (!apiKey || apiKey !== process.env.GROUNDWORK_MASTER_KEY) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing Groundwork API key." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { steps } = body;

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: "Invalid execution payload. 'steps' array is required." },
        { status: 400 }
      );
    }

    const executionResults: Record<string, any> = {};

    // 2. Sequential Step Execution (Make/n8n engine)
    for (const step of steps) {
      const stepId = step.id || `step_${Math.random().toString(36).substring(2, 7)}`;

      if (step.type === "ai_generate") {
        const aiOutput = await generateText(
          step.system || "You are an automated assistant.",
          step.prompt,
          step.maxTokens || 4000
        );
        executionResults[stepId] = {
          output: aiOutput.text,
          provider: aiOutput.provider,
        };
      } else if (step.type === "http_request") {
        const response = await fetch(step.url, {
          method: step.method || "POST",
          headers: step.headers || { "Content-Type": "application/json" },
          body: step.body ? JSON.stringify(step.body) : undefined,
        });
        const responseData = await response.json().catch(() => null);
        executionResults[stepId] = {
          status: response.status,
          data: responseData,
        };
      }
    }

    return NextResponse.json({
      success: true,
      results: executionResults,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Automation execution failed." },
      { status: 500 }
    );
  }
}