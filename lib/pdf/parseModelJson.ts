/**
 * Robust parser for LLM JSON output.
 * Handles markdown fences (including unclosed fences), invalid backslash escapes (LaTeX),
 * literal control characters, trailing commas, and truncated outputs.
 */

export function stripFences(text: string): string {
  let s = text.trim();

  // 1. Handle markdown code blocks
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (fenceMatch && fenceMatch[1]) {
    s = fenceMatch[1].trim();
  } else {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  }

  // 2. If there is introductory text before the first '{' or '[', strip it
  const firstJsonChar = s.search(/[{\[]/);
  if (firstJsonChar > 0) {
    s = s.slice(firstJsonChar).trim();
  }

  return s;
}

function cleanControlCharsInStrings(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  let out = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (isEscaped) {
      out += ch;
      isEscaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      isEscaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
    }
    out += ch;
  }
  return out;
}

function fixBadEscapes(s: string): string {
  return s.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, "\\\\");
}

function fixTrailingCommas(s: string): string {
  return s.replace(/,\s*([\]}])/g, "$1");
}

function repairTruncatedJson(jsonStr: string): string {
  let s = jsonStr.trim();
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (ch === "\\") {
      isEscaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}") {
        if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
      } else if (ch === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
      }
    }
  }

  if (inString) s += '"';
  s = s.replace(/,\s*$/g, "").replace(/:\s*$/g, ': ""');

  while (stack.length > 0) {
    const open = stack.pop();
    if (open === "{") s += "}";
    else if (open === "[") s += "]";
  }

  return s;
}

export function parseModelJson<T = unknown>(text: string): T {
  const stripped = stripFences(text);

  const cleanSteps = [
    stripped,
    fixTrailingCommas(cleanControlCharsInStrings(fixBadEscapes(stripped))),
    repairTruncatedJson(stripped),
    repairTruncatedJson(fixTrailingCommas(cleanControlCharsInStrings(fixBadEscapes(stripped)))),
  ];

  let lastError: Error | null = null;
  for (const candidate of cleanSteps) {
    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  // Fallback: try finding the outermost { ... } block
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sub = stripped.slice(firstBrace, lastBrace + 1);
    const subSteps = [
      sub,
      fixTrailingCommas(cleanControlCharsInStrings(fixBadEscapes(sub))),
      repairTruncatedJson(sub),
      repairTruncatedJson(fixTrailingCommas(cleanControlCharsInStrings(fixBadEscapes(sub)))),
    ];
    for (const candidate of subSteps) {
      try {
        return JSON.parse(candidate) as T;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
  }

  throw (
    lastError ??
    new Error(
      `Invalid JSON from model (starts with: ${stripped.slice(0, 100)}...)`
    )
  );
}
