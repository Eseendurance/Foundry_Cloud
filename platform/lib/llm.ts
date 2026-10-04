type LocalChatResponse = {
  message?: { content?: string };
};

function localModelUrl(): URL | null {
  const endpoint = process.env.LOCAL_LLM_URL;
  if (!endpoint || !process.env.LOCAL_LLM_MODEL) return null;

  const url = new URL(endpoint);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isLocalHostname =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    !host.includes(".");
  const isPrivateIpv4 =
    /^10\./.test(host) ||
    /^127\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  const isPrivateIpv6 = host === "::1" || host.startsWith("fc") || host.startsWith("fd");

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !(isLocalHostname || isPrivateIpv4 || isPrivateIpv6)
  ) {
    throw new Error("LOCAL_LLM_URL must point to a local or private-network model server.");
  }

  return url;
}

export type LlmResult = {
  text: string;
  provider: "local";
};

export function availableProviders(): string[] {
  try {
    return localModelUrl() ? ["local"] : [];
  } catch {
    return [];
  }
}

export async function generateText(
  system: string,
  prompt: string,
  maxTokens = 8000
): Promise<LlmResult> {
  const url = localModelUrl();
  if (!url) {
    throw new Error("The local AI engine is offline. Configure LOCAL_LLM_URL and LOCAL_LLM_MODEL.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.LOCAL_LLM_MODEL,
        stream: false,
        options: { num_predict: maxTokens },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("The local AI engine did not respond before the 90-second timeout.");
    }
    throw new Error("The local AI engine could not be reached.");
  }

  if (!response.ok) {
    throw new Error(`The local AI engine returned HTTP ${response.status}.`);
  }

  const result = (await response.json()) as LocalChatResponse;
  const text = result.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("The local AI engine returned an empty or invalid response.");
  }

  return { text, provider: "local" };
}
