import { NextRequest } from "next/server";
import { generateText, availableProviders } from "@/lib/llm";
import { rateLimited, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a coding assistant embedded in a browser-based code editor. You can see the user's current files (plain HTML/CSS/JS — no build step, no npm packages, no backend).

Respond with ONLY a JSON object, no markdown fences, no commentary outside the JSON, in exactly this shape:
{"message": "plain-language explanation of what you're suggesting or answering", "edits": [{"path": "filename", "content": "ENTIRE new file content"}]}

Rules:
- "edits" contains the FULL new content of any file you want to change or create — never a partial snippet or diff. The editor replaces the whole file with what you send.
- If the instruction is a question that doesn't need a code change, return an empty "edits" array and put your answer in "message".
- Only include files you're actually changing — don't repeat untouched files.
- Don't invent files, frameworks, or build tools that aren't already in the project (it's plain HTML/CSS/JS only).
- If asked to do something outside that scope (e.g. requiring a real backend, a database, or an npm package), say so plainly in "message" and don't fake it with placeholder code.`;

export async function POST(req: NextRequest) {
  if (rateLimited(`ide-agent:${clientKey(req)}`, 15, 5 * 60_000)) {
    return json(429, {
      error: "Too many requests from this connection in a short window. Wait a few minutes and try again.",
    });
  }

  let body: { instruction?: string; files?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Send this as JSON." });
  }

  const instruction = (body.instruction || "").trim().slice(0, 2000);
  const files = body.files || {};

  if (!instruction) {
    return json(400, { error: "Tell the agent what you want." });
  }

  if (availableProviders().length === 0) {
    return json(500, {
      error:
        "No AI provider is configured. Set one of ANTHROPIC_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY in your Vercel project's environment variables — see the README.",
    });
  }

  const filesBlock = Object.entries(files)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n")
    .slice(0, 20_000);

  try {
    const { text: raw } = await generateText(
      SYSTEM_PROMPT,
      `Current files:\n\n${filesBlock}\n\nInstruction: ${instruction}`,
      8000
    );
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();

    let parsed: { message?: string; edits?: { path: string; content: string }[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Model didn't return clean JSON — surface its raw text as the
      // message rather than pretending we understood it.
      return json(200, { message: raw || "No response.", edits: [] });
    }

    return json(200, {
      message: parsed.message || "",
      edits: Array.isArray(parsed.edits) ? parsed.edits : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent request failed.";
    return json(502, { error: msg });
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
