export type TokenType =
  | "KEYWORD"
  | "IDENTIFIER"
  | "STRING"
  | "NUMBER"
  | "BOOLEAN"
  | "BRACE_OPEN"
  | "BRACE_CLOSE"
  | "BRACKET_OPEN"
  | "BRACKET_CLOSE";

export type Token = {
  type: TokenType;
  value: string;
};

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let current = 0;

  while (current < input.length) {
    let char = input[current];

    // Skip whitespace & newlines
    if (/\s/.test(char)) {
      current++;
      continue;
    }

    // Brackets and Braces
    if (char === "{") { tokens.push({ type: "BRACE_OPEN", value: "{" }); current++; continue; }
    if (char === "}") { tokens.push({ type: "BRACE_CLOSE", value: "}" }); current++; continue; }
    if (char === "[") { tokens.push({ type: "BRACKET_OPEN", value: "[" }); current++; continue; }
    if (char === "]") { tokens.push({ type: "BRACKET_CLOSE", value: "]" }); current++; continue; }

    // Quoted Strings
    if (char === '"') {
      let value = "";
      char = input[++current];
      while (char !== '"' && current < input.length) {
        value += char;
        char = input[++current];
      }
      current++; // Skip closing quote
      tokens.push({ type: "STRING", value });
      continue;
    }

    // Keywords and Identifiers
    if (/[a-zA-Z_]/.test(char)) {
      let value = "";
      while (/[a-zA-Z0-9_/-]/.test(char) && current < input.length) {
        value += char;
        char = input[++current];
      }
      const keywords = ["SOURCE", "URL", "CRON", "LICENSE", "PIPELINE", "FROM", "EXTRACT", "SANITIZE_PII", "STORE_INTO", "EXPOSE_ENDPOINT", "REQUIRES_KEY", "QUOTA"];
      if (keywords.includes(value.toUpperCase())) {
        tokens.push({ type: "KEYWORD", value: value.toUpperCase() });
      } else if (value === "true" || value === "false") {
        tokens.push({ type: "BOOLEAN", value });
      } else {
        tokens.push({ type: "IDENTIFIER", value });
      }
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      let value = "";
      while (/[0-9]/.test(char) && current < input.length) {
        value += char;
        char = input[++current];
      }
      tokens.push({ type: "NUMBER", value });
      continue;
    }

    current++;
  }

  return tokens;
}