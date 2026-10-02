import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not configured." },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemInstruction = `You are the Foundry Platform DSL Engine Copilot.
Your job is to generate valid Foundry .pipe DSL configurations based on user prompts.

A valid .pipe DSL structure looks like this:
pipeline "EcommerceOrderPipeline" {
  version = "1.0"
  source "webhook_orders" {
    type = "http_endpoint"
    path = "/v1/ingest/orders"
  }
  transform "FilterAndCalculate" {
    filter = "payload.amount >= 50"
    map = {
      order_id = "payload.id"
      tax = "payload.amount * 0.075"
      total = "payload.amount * 1.075"
    }
  }
  destination "database" {
    target = "neon_orders_table"
  }
}

Return ONLY valid JSON with two fields:
1. "dsl": The raw string content of the .pipe configuration.
2. "explanation": A brief, 2-3 sentence overview of what the pipeline does.

Return pure JSON without markdown formatting or code blocks.`;

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: `Generate a pipeline for: ${prompt}` },
    ]);

    const rawResponse = result.response.text();
    const cleanJson = rawResponse.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}