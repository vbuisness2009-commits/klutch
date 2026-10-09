/**
 * Robust parser for LLM JSON output.
 * Handles markdown fences, invalid backslash escapes, and trailing commas.
 */

export function stripFences(text: string): string {
  const m = text.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  if (m) return m[1].trim();
  // Also handle cases where there are leading/trailing fences with other text
  const fenceStart = text.indexOf("```json");
  const altFenceStart = text.indexOf("```");
  const start = fenceStart !== -1 ? fenceStart + 7 : altFenceStart !== -1 ? altFenceStart + 3 : -1;
  if (start !== -1) {
    const end = text.indexOf("```", start);
    if (end !== -1) return text.slice(start, end).trim();
  }
  return text.trim();
}

function fixBadEscapes(s: string): string {
  return s.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, "\\\\");
}

function fixTrailingCommas(s: string): string {
  return s.replace(/,\s*([\]}])/g, "$1");
}

export function parseModelJson<T = unknown>(text: string): T {
  const stripped = stripFences(text);
  const attempts = [
    stripped,
    fixBadEscapes(stripped),
    fixTrailingCommas(stripped),
    fixTrailingCommas(fixBadEscapes(stripped)),
  ];

  let lastError: Error | null = null;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  // Fallback: try finding the first { ... } or [ ... ] block
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sub = stripped.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sub) as T;
    } catch {
      try {
        return JSON.parse(fixTrailingCommas(fixBadEscapes(sub))) as T;
      } catch {}
    }
  }

  throw lastError ?? new Error("Invalid JSON from model");
}
