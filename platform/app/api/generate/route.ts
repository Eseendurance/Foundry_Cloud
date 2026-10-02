import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, type } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt definition required." },
        { status: 400 }
      );
    }

    // Server-side system API key fallback
    const apiKey = process.env.SYSTEM_AI_KEY;

    if (!apiKey) {
      // Offline / Local fallback logic when no system key is configured
      return NextResponse.json({
        success: true,
        mode: "offline-mock",
        output: `[MOCK OUTPUT] Standard schema/code generated for: "${prompt}"`,
      });
    }

    // Call upstream AI service securely using system environment variable
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              type === "schema"
                ? "You are a database architect. Return clean SQL DDL statements or JSON schema objects."
                : "You are a software engineer. Return valid Next.js/TypeScript code snippets.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "No output generated.";

    return NextResponse.json({
      success: true,
      mode: "live-proxy",
      output: resultText,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute generation request." },
      { status: 500 }
    );
  }
}