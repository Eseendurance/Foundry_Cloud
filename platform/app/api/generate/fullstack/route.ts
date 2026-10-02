import { NextRequest, NextResponse } from "next/server";
import { generateText, availableProviders } from "@/lib/llm";
import { scaffoldFiles } from "@/lib/fullstack-scaffold";
import { rateLimited, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 90;

const PROTECTED_PATHS = new Set([
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
  ".gitignore",
  "app/globals.css",
  "app/layout.tsx",
  "lib/db.ts",
  "README.md",
]);

const SYSTEM_PROMPT = `You are generating files for a real Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 project. A fixed scaffold already provides package.json, tsconfig.json, next.config.ts, postcss.config.mjs, .gitignore, app/globals.css, app/layout.tsx, and lib/db.ts (a Postgres query() helper). Do NOT regenerate any of those — they already exist and are correct. If you include them anyway, they'll be ignored.

Respond with ONLY a JSON object, no markdown fences, no commentary outside the JSON:
{"summary": "one paragraph describing what you built and how the pieces fit together", "files": [{"path": "app/page.tsx", "content": "..."}]}

Rules:
- Always include app/page.tsx as the homepage.
- If the app needs to remember anything between visits, write real API routes under app/api/<name>/route.ts using: import { query } from "@/lib/db";
  Follow this exact pattern in every handler that touches the database — run a CREATE TABLE IF NOT EXISTS statement first (idempotent, cheap, no separate migration step needed), then the real query. NEVER fake persistence with an in-memory array or object — it silently resets on every cold start and will look broken in production. If genuine persistence isn't needed, don't add a database at all.
- Every file must be complete, valid, real TypeScript/TSX. No placeholders, no "// TODO: implement this", no pseudocode standing in for real logic.
- Style with Tailwind utility classes only (already configured) — no other CSS framework, no styled-components, no CSS modules.
- You may add app/api/*/route.ts, additional app/**/page.tsx routes, and components/*.tsx as needed.
- Never invent a dependency on an external paid API (email, SMS, payments, auth providers, etc.) unless the user's prompt explicitly asks for it — and if they do, note in "summary" that it needs its own API key which isn't provided here.
- If the request describes something that isn't a web app (e.g. a mobile app, a CLI tool), say so plainly in "summary" and build the closest reasonable web equivalent instead of pretending.`;

export async function POST(req: NextRequest) {
  if (rateLimited(`fullstack-generate:${clientKey(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many full-stack generations in a short window. Wait a bit and try again." },
      { status: 429 }
    );
  }

  let body: { prompt?: string; appName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  const prompt = (body.prompt || "").trim().slice(0, 2000);
  const appName = (body.appName || "generated-app").trim().slice(0, 60);

  if (!prompt) {
    return NextResponse.json({ error: "Describe what you want to build first." }, { status: 400 });
  }

  if (availableProviders().length === 0) {
    return NextResponse.json(
      {
        error:
          "No AI provider is configured. Set one of ANTHROPIC_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY in your Vercel project's environment variables — see the README.",
      },
      { status: 500 }
    );
  }

  try {
    const { text: raw } = await generateText(SYSTEM_PROMPT, prompt, 16000);
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();

    let parsed: { summary?: string; files?: { path: string; content: string }[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "The model didn't return valid JSON. Try rephrasing the request." },
        { status: 502 }
      );
    }

    const aiFiles = Array.isArray(parsed.files) ? parsed.files : [];
    const rejected: string[] = [];
    const accepted: Record<string, string> = {};

    for (const f of aiFiles) {
      const path = (f.path || "").replace(/^\/+/, "").trim();
      if (!path || path.includes("..") || PROTECTED_PATHS.has(path) || path.startsWith("node_modules/")) {
        rejected.push(f.path || "(empty path)");
        continue;
      }
      accepted[path] = f.content ?? "";
    }

    if (!accepted["app/page.tsx"]) {
      return NextResponse.json(
        { error: "The model didn't produce an app/page.tsx. Try again." },
        { status: 502 }
      );
    }

    const files = { ...scaffoldFiles(appName), ...accepted };

    return NextResponse.json({
      summary: parsed.summary || "",
      files,
      rejectedPaths: rejected,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
