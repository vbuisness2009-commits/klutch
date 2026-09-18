/**
 * Vision models often return almost-JSON: bad backslash escapes, trailing
 * commas, or fence wrappers. Chunk failures here used to drop whole page
 * ranges (e.g. Math M2), so parse leniently before giving up.
 */

export function stripFences(text: string): string {
  const m = text.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  return m ? m[1].trim() : text.trim();
}

/** Escape lone backslashes that are not valid JSON escapes. */
function fixBadEscapes(s: string): string {
  return s.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, "\\\\");
}

function fixTrailingCommas(s: string): string {
  return s.replace(/,\s*([\]}])/g, "$1");
}

export function parseModelJson(text: string): unknown {
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
      return JSON.parse(candidate);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("Invalid JSON from model");
}
