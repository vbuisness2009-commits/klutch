import katex from "katex";

export function cleanToLatex(expr: string): string {
  return expr
    .replace(/[–—]/g, "-")
    .replace(/<=/g, " \\le ")
    .replace(/>=/g, " \\ge ")
    .replace(/\s*\*\s*(?=\()/g, "")
    .replace(/\s*\*\s*/g, " \\cdot ")
    .replace(/√\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/√([0-9a-zA-Z]+)/g, "\\sqrt{$1}")
    .replace(/\bsqrt\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/½/g, "\\frac{1}{2}")
    .replace(/¼/g, "\\frac{1}{4}")
    .replace(/¾/g, "\\frac{3}{4}")
    .replace(/[′]/g, "'")
    .replace(/[″]/g, "''")
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
 * Validates whether an extracted string is authentic math rather than English prose
 * that accidentally got enclosed by currency dollar signs (e.g. "$30 per month ... costs $8").
 */
export function isValidMath(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;

  // Math cannot span HTML tags (e.g. </mo> ... <mo>)
  if (/<[a-zA-Z\/][^>]*>/.test(trimmed)) return false;

  // Strip LaTeX formatting commands before checking for prose words
  const strippedText = trimmed
    .replace(/\\(text|mathrm|mathbf|mathit)\{[^}]*\}/g, "")
    .replace(/\\[a-zA-Z]+/g, " ");

  // Math cannot contain sentence punctuation (e.g. ". " followed by capital letter, or "?", ";")
  if (/\.\s+[A-Z]/.test(strippedText) || /[?;]/.test(strippedText)) return false;

  // Math cannot contain English prose stop words
  const proseWords =
    /\b(the|of|in|to|for|with|that|this|per|each|cost|costs|costing|month|months|monthly|year|years|yearly|bill|bills|subscriber|subscribers|total|totals|gigabyte|gigabytes|data|which|what|where|when|how|many|represent|represents|representing|contain|contains|containing|customer|customers|purchase|purchased|purchases|discount|discounts|discounted|price|prices|company|companies|charge|charges|charged|mile|miles|traveled|order|orders|ordered|fee|fees|rate|rates|hour|hours|hourly|first|second|third|between|more|less|than|increased?|decreased?|amount|amounts|original|percent|percentage|sold|buys?|bought|sales?|tax|taxes|salary|salaries|earn|earns|earned|spent|spend|spending|save|saves|saved|savings|pay|pays|paid|paying|dollar|dollars|cent|cents|shin|guards?|soccer|balls?|tickets?|students?|children|adults?|books?|pens?|pencils?|items?|units?|service|services|plan|plans|water|plant|plants|protect|forested|watershed|natural|naturally|filters?|supply|light|bulb|bulbs|grid|powered|mostly|coal|gas|considering|rooftop|solar|photovoltaic|home|slowly|rose|sharply|tripling|gentrification|typical|core|country|manufacturing|automated|basket|nominal|deflator|transfer|payments?|exports?|imports?|reserves?|deposit|deposits?|loans?|excess|demand|trillion|billion|million)\b/i;

  if (proseWords.test(strippedText)) return false;

  // 3 or more consecutive words with 3+ letters without math operators
  if (/\b[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\b/.test(strippedText)) return false;

  return true;
}

function formatMathInner(text: string): string {
  if (!text) return "";

  const katexBlocks: string[] = [];
  function protectKatex(html: string): string {
    katexBlocks.push(html);
    return `___KATEX_BLOCK_${katexBlocks.length - 1}___`;
  }

  // 1. Explicit display mode $$ ... $$
  let result = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
    if (isValidMath(math)) {
      return protectKatex(renderKatex(math, true));
    }
    return match;
  });

  // 2. Explicit inline mode $ ... $
  // Delimiter rules:
  // - Opening $: cannot be preceded by backslash, cannot be followed by whitespace
  // - Closing $: cannot be preceded by whitespace or backslash, cannot be followed by a digit
  const inlineMathRegex = /(?<!\\)\$(?!\s)([^\$\n]+?)(?<![\s\\])\$(?!\d)/g;
  result = result.replace(inlineMathRegex, (match, math) => {
    if (isValidMath(math)) {
      return protectKatex(renderKatex(math, false));
    }
    return match;
  });

  // 3. Multiline system of equations/inequalities
  const trimmed = result.trim();
  if (
    trimmed.includes("\n") &&
    trimmed.split("\n").every((l) => /[=<>≤≥]/.test(l.trim()))
  ) {
    result = trimmed
      .split("\n")
      .map((l) => protectKatex(renderKatex(l, false)))
      .join("<br/>");
  } else if (trimmed.includes(" and ") || trimmed.includes(" or ")) {
    // 4. Choices connected by "and" or "or", e.g. "x = 3 and x = -3"
    const parts = trimmed.split(/(\s+(?:and|or)\s+)/);
    if (
      parts.some((p) => /[=<>≤≥\^]/.test(p)) &&
      parts.every((p) => !p.includes("___KATEX_BLOCK_"))
    ) {
      result = parts
        .map((p) => {
          if (p.trim() === "and" || p.trim() === "or") return p;
          if (/[=<>≤≥\^]/.test(p) && isValidMath(p)) {
            return protectKatex(renderKatex(p, false));
          }
          return p;
        })
        .join("");
    }
  } else {
    // 5. Entire string is a math formula, equation, or expression
    const isEntireMath =
      /^(?:[A-Za-z]\([A-Za-z0-9\s,\/+-]*\)|\b[a-zA-Z]\b|[-+0-9\.\(\)])[-+0-9A-Za-z\s\/\^\*\(\)\.=<>≤≥]*$/.test(
        trimmed
      ) &&
      (/[\^=<>≤≥]/.test(trimmed) ||
        /^\d+\/\d+$/.test(trimmed) ||
        /^[A-Za-z]\([0-9a-zA-Z]+\)$/.test(trimmed)) &&
      !trimmed.includes("___KATEX_BLOCK_") &&
      isValidMath(trimmed);

    if (isEntireMath) {
      result = protectKatex(renderKatex(trimmed, false));
    }
  }

  // 6. Inline equations in prose: e.g. "If the equation (x - 3)^2 = 4 has two solutions..."
  const eqRegex =
    /((?:[0-9a-zA-Z\(\)\^]+|[a-zA-Z]\([a-zA-Z0-9,\s+-]+\))(?:\s*[-+*\/]\s*[0-9a-zA-Z\(\)\^]+)*\s*=\s*[-+]?[0-9a-zA-Z\(\)\^]+(?:\s*[-+*\/]\s*[0-9a-zA-Z\(\)\^]+)*)/g;
  result = result.replace(eqRegex, (match) => {
    if (match.includes("___KATEX_BLOCK_") || !isValidMath(match)) return match;
    return protectKatex(renderKatex(match, false));
  });

  // 7. Standalone exponent expressions in prose: e.g. "(x - a)^2", "x^2", "2^(3t)"
  const expRegex =
    /((?:\([a-zA-Z0-9\s\-+\/]+\)|[a-zA-Z0-9]+)\^[0-9a-zA-Z\(\)\/\-]+)/g;
  result = result.replace(expRegex, (match) => {
    if (match.includes("___KATEX_BLOCK_")) return match;
    return protectKatex(renderKatex(match, false));
  });

  // Restore KaTeX blocks
  if (katexBlocks.length > 0) {
    result = result.replace(
      /___KATEX_BLOCK_(\d+)___/g,
      (_, idx) => katexBlocks[Number(idx)]
    );
  }

  // Unescape escaped dollar signs
  result = result.replace(/\\\$/g, "$");

  return result;
}

/**
 * Parses LaTeX ($...$, $$...$$) and common math patterns (e.g. ^2, ^(3t), equations)
 * into authentic, fully rendered KaTeX HTML spans, while protecting SVG vector graphics.
 */
export function formatMathHtml(text: string): string {
  if (!text) return "";

  // Protect any SVG elements from math equation regex replacement
  const svgs: string[] = [];
  const protectedText = text.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    svgs.push(match);
    return `___SVG_BLOCK_${svgs.length - 1}___`;
  });

  let result = formatMathInner(protectedText);

  if (svgs.length > 0) {
    result = result.replace(/___SVG_BLOCK_(\d+)___/g, (_, idx) => svgs[Number(idx)]);
  }

  return result;
}

