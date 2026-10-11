import katex from "katex";

export function cleanToLatex(expr: string): string {
  return expr
    .replace(/<=/g, " \\le ")
    .replace(/>=/g, " \\ge ")
    .replace(/\s*\*\s*(?=\()/g, "")
    .replace(/\s*\*\s*/g, " \\cdot ")
    .replace(/\bsqrt\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/\bpi\b/gi, "\\pi")
    .replace(/\^\(([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)\)/g, "^{\\frac{$1}{$2}}")
    .replace(/\^([0-9a-zA-Z]+)/g, "^{$1}")
    .replace(/\^\(([^)]+)\)/g, "^{$1}");
}

function renderKatex(expr: string, display = false): string {
  try {
    return katex.renderToString(cleanToLatex(expr.trim()), {
      displayMode: display,
      throwOnError: false,
    });
  } catch {
    return expr;
  }
}

/**
 * Parses LaTeX ($...$, $$...$$) and common math patterns (e.g. ^2, ^(3t), equations)
 * into authentic, fully rendered KaTeX HTML spans.
 */
export function formatMathHtml(text: string): string {
  if (!text) return "";

  // 1. Explicit display mode $$ ... $$
  let result = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) =>
    renderKatex(math, true)
  );

  // 2. Explicit inline mode $ ... $
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, math) =>
    renderKatex(math, false)
  );

  // If already contains rendered katex, we can return or continue checking unrendered parts
  if (result.includes('class="katex"')) {
    return result;
  }

  const trimmed = result.trim();

  // 3. Multiline system of equations/inequalities
  if (
    trimmed.includes("\n") &&
    trimmed.split("\n").every((l) => /[=<>≤≥]/.test(l.trim()))
  ) {
    return trimmed
      .split("\n")
      .map((l) => renderKatex(l, false))
      .join("<br/>");
  }

  // 4. Choices connected by "and" or "or", e.g. "x = 3 and x = -3"
  if (trimmed.includes(" and ") || trimmed.includes(" or ")) {
    const parts = trimmed.split(/(\s+(?:and|or)\s+)/);
    if (parts.some((p) => /[=<>≤≥\^]/.test(p))) {
      return parts
        .map((p) => {
          if (p.trim() === "and" || p.trim() === "or") return p;
          if (/[=<>≤≥\^]/.test(p)) return renderKatex(p, false);
          return p;
        })
        .join("");
    }
  }

  // 5. Entire string is a math formula, equation, or expression
  // e.g. "P(t) = 100 * (2)^(3t)", "800 * (0.85)^(t/4)", "-2 < x <= 4", "f(x) = 2x^2 + 5"
  const isEntireMath =
    /^(?:[A-Za-z]\([A-Za-z0-9\s,\/+-]*\)|\b[a-zA-Z]\b|[-+0-9\.\(\)])[-+0-9A-Za-z\s\/\^\*\(\)\.=<>≤≥]*$/.test(
      trimmed
    ) &&
    (/[\^=<>≤≥]/.test(trimmed) ||
      /^\d+\/\d+$/.test(trimmed) ||
      /^[A-Za-z]\([0-9a-zA-Z]+\)$/.test(trimmed));

  if (isEntireMath) {
    return renderKatex(trimmed, false);
  }

  // 6. Inline equations in prose: e.g. "If the equation (x - 3)^2 = 4 has two solutions..."
  // e.g. "If 2x + y = 10 and x - y = 2, what is..."
  // e.g. "If f(x) = 2x + 3, what is..."
  const eqRegex =
    /((?:[0-9a-zA-Z\(\)\^]+|[a-zA-Z]\([a-zA-Z0-9,\s+-]+\))(?:\s*[-+*\/]\s*[0-9a-zA-Z\(\)\^]+)*\s*=\s*[-+]?[0-9a-zA-Z\(\)\^]+(?:\s*[-+*\/]\s*[0-9a-zA-Z\(\)\^]+)*)/g;
  result = result.replace(eqRegex, (m) => renderKatex(m, false));

  // 7. Standalone exponent expressions in prose: e.g. "(x - a)^2", "x^2", "2^(3t)"
  const expRegex =
    /((?:\([a-zA-Z0-9\s\-+\/]+\)|[a-zA-Z0-9]+)\^[0-9a-zA-Z\(\)\/\-]+)/g;
  result = result.replace(expRegex, (m) => {
    if (m.includes('class="katex"')) return m;
    return renderKatex(m, false);
  });

  return result;
}
