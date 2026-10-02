export type LlmResult = {
  text: string;
  provider: string;
};

export function availableProviders(): string[] {
  const providers: string[] = [];
  if (process.env.GROQ_API_KEY) providers.push("groq");
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  return providers;
}

export async function generateText(
  system: string,
  prompt: string,
  maxTokens = 8000
): Promise<LlmResult> {
  const providers = availableProviders();
  if (providers.length === 0) {
    throw new Error("No AI provider key configured.");
  }
  // Provider implementation details...
  return { text: "", provider: "groq" };
}