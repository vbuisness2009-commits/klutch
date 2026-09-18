/**
 * Post-processors for PDF extraction: fix verbal graph prose, duplicate
 * IMAGE tags, and plain-text <math> that Chrome renders at 0×0.
 *
 * Also upgrades extract artifacts — LaTeX (`\frac`, `\sqrt`, …) and ASCII
 * caret powers (`x^2`, `(x+4)^2`) — into real MathML tokens so the player
 * and PDF do not show raw source.
 *
 * Intentionally dependency-free so `node --experimental-strip-types` scripts
 * can import this file directly.
 */

/** Matches [IMAGE: Page N - description] placeholders from extractPrompt. */
const IMAGE_TAG_RE = /\[IMAGE:\s*Page\s*(\d+)\s*-\s*(.*?)\]/g;

type HtmlQuestion = {
  stimulus?: string;
  stem?: string;
  rationale?: string;
  choices?: { label: string; content: string }[];
  [key: string]: unknown;
};

/** Bullets that narrate a plotted line instead of cropping it. */
const VERBAL_GRAPH_BULLET_RE =
  /\b(Begins at|Falls sharply|Falls gradually|Rises sharply|Rises gradually|Remains level|Ends at)\b/i;

const VERBAL_GRAPH_INTRO_RE =
  /The following\s+\d+\s+lines\s+are\s+shown|The line graph\s*:|line graph of|graph models/i;

/** Real MathML tokens — excludes mtext/mrow wrappers from prior repairs. */
const STRUCTURED_MATH_RE =
  /<(mi|mn|mo|msup|msub|msubsup|mfrac|msqrt|mroot|semantics|mtable|mspace|mover|munder|menclose|mmultiscripts)\b/i;

const LATEX_CMD_RE =
  /\\(frac|dfrac|tfrac|sqrt|pm|mp|cdot|times|div|leq|geq|neq|approx|infty|pi|alpha|beta|theta|left|right|cdotp|ldots|dots|cdot)\b/;

const FN_NAMES =
  /^(sin|cos|tan|sec|csc|cot|log|ln|lg|min|max|abs)\b/i;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function mathAttrs(attrs: string | undefined): string {
  const attr = attrs ?? ' xmlns="http://www.w3.org/1998/Math/MathML"';
  return /\bxmlns\s*=/i.test(attr)
    ? attr
    : `${attr} xmlns="http://www.w3.org/1998/Math/MathML"`;
}

/** Plain text payload of a <math> that is bare chars or mtext-only. */
function extractMathPlainText(inner: string): string {
  const noAnnot = inner.replace(
    /<annotation\b[^>]*>[\s\S]*?<\/annotation>/gi,
    ""
  );
  return unescapeXml(noAnnot.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function needsRichConversion(text: string): boolean {
  return LATEX_CMD_RE.test(text) || /\^/.test(text);
}

function takeBraced(s: string, start: number): { content: string; next: number } | null {
  if (s[start] !== "{") return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { content: s.slice(start + 1, i), next: i + 1 };
    }
  }
  return null;
}

function takeGroup(
  s: string,
  start: number,
  open: string,
  close: string
): { content: string; next: number } | null {
  if (s[start] !== open) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return { content: s.slice(start + 1, i), next: i + 1 };
    }
  }
  return null;
}

const OP_CHARS = new Set([
  "=",
  "+",
  "-",
  "−",
  "±",
  "∓",
  "*",
  "/",
  "<",
  ">",
  "≤",
  "≥",
  "≠",
  "≈",
  ",",
  ":",
  "!",
]);

/**
 * Convert ASCII / light TeX math into MathML token markup (no outer <math>).
 * Handles SAT-common: \frac, \sqrt, \pm, \cdot, ^powers, identifiers, nums.
 */
export function asciiLatexToMathML(src: string): string {
  const input = src
    .replace(/\$+/g, "")
    .replace(/\\left\s*/g, "")
    .replace(/\\right\s*/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\!/g, "")
    .replace(/~/g, " ")
    .trim();
  if (!input) return "";

  const parts: string[] = [];
  let i = 0;

  const pushSup = (base: string, expSrc: string) => {
    const exp = asciiLatexToMathML(expSrc.trim()) || `<mn>${escapeXml(expSrc.trim())}</mn>`;
    parts.push(`<msup>${base}<mrow>${exp}</mrow></msup>`);
  };

  const maybeSupAfter = (base: string): void => {
    while (i < input.length && /\s/.test(input[i])) i++;
    if (i >= input.length || input[i] !== "^") {
      parts.push(base);
      return;
    }
    i++; // skip ^
    while (i < input.length && /\s/.test(input[i])) i++;
    if (i < input.length && input[i] === "{") {
      const br = takeBraced(input, i);
      if (br) {
        i = br.next;
        pushSup(base, br.content);
        return;
      }
    }
    // single atom: digit run, letter, or parenthesized already handled via {
    if (i < input.length && /\d/.test(input[i])) {
      const m = input.slice(i).match(/^\d+/);
      if (m) {
        i += m[0].length;
        pushSup(base, m[0]);
        return;
      }
    }
    if (i < input.length && /[a-zA-Z]/.test(input[i])) {
      pushSup(base, input[i]);
      i++;
      return;
    }
    if (i < input.length && input[i] === "(") {
      const g = takeGroup(input, i, "(", ")");
      if (g) {
        i = g.next;
        pushSup(base, `(${g.content})`);
        return;
      }
    }
    // orphan ^ — keep as operator so we don't drop it silently
    parts.push(base);
    parts.push("<mo>^</mo>");
  };

  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // LaTeX command
    if (ch === "\\") {
      const cmdMatch = input.slice(i).match(/^\\([a-zA-Z]+)/);
      if (!cmdMatch) {
        i++;
        continue;
      }
      const cmd = cmdMatch[1];
      i += cmdMatch[0].length;
      while (i < input.length && /\s/.test(input[i])) i++;

      if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac") {
        const a = takeBraced(input, i);
        if (!a) continue;
        i = a.next;
        while (i < input.length && /\s/.test(input[i])) i++;
        const b = takeBraced(input, i);
        if (!b) continue;
        i = b.next;
        const num = asciiLatexToMathML(a.content) || `<mtext>${escapeXml(a.content)}</mtext>`;
        const den = asciiLatexToMathML(b.content) || `<mtext>${escapeXml(b.content)}</mtext>`;
        maybeSupAfter(`<mfrac><mrow>${num}</mrow><mrow>${den}</mrow></mfrac>`);
        continue;
      }

      if (cmd === "sqrt") {
        let rad = "";
        if (i < input.length && input[i] === "{") {
          const br = takeBraced(input, i);
          if (br) {
            rad = br.content;
            i = br.next;
          }
        } else if (i < input.length) {
          rad = input[i];
          i++;
        }
        const inner = asciiLatexToMathML(rad) || `<mtext>${escapeXml(rad)}</mtext>`;
        maybeSupAfter(`<msqrt><mrow>${inner}</mrow></msqrt>`);
        continue;
      }

      const singles: Record<string, string> = {
        pm: "<mo>±</mo>",
        mp: "<mo>∓</mo>",
        cdot: "<mo>·</mo>",
        cdotp: "<mo>·</mo>",
        times: "<mo>×</mo>",
        div: "<mo>÷</mo>",
        leq: "<mo>≤</mo>",
        geq: "<mo>≥</mo>",
        neq: "<mo>≠</mo>",
        approx: "<mo>≈</mo>",
        infty: "<mi>∞</mi>",
        pi: "<mi>π</mi>",
        alpha: "<mi>α</mi>",
        beta: "<mi>β</mi>",
        theta: "<mi>θ</mi>",
        ldots: "<mo>…</mo>",
        dots: "<mo>…</mo>",
      };
      if (singles[cmd]) {
        maybeSupAfter(singles[cmd]);
        continue;
      }
      // unknown command — show name as identifier
      maybeSupAfter(`<mi>${escapeXml(cmd)}</mi>`);
      continue;
    }

    // Parentheses / brackets
    if (ch === "(" || ch === "[") {
      const close = ch === "(" ? ")" : "]";
      const g = takeGroup(input, i, ch, close);
      if (g) {
        i = g.next;
        const inner = asciiLatexToMathML(g.content);
        maybeSupAfter(
          `<mrow><mo>${ch}</mo>${inner}<mo>${close}</mo></mrow>`
        );
        continue;
      }
    }

    // Number (allow thousands commas: 1,100)
    if (/\d/.test(ch)) {
      const m = input.slice(i).match(/^\d{1,3}(?:,\d{3})+(?:\.\d+)?|^\d+(?:\.\d+)?/);
      if (m) {
        i += m[0].length;
        maybeSupAfter(`<mn>${m[0]}</mn>`);
        continue;
      }
    }

    // Function names / identifiers (advance i before superscript check)
    if (/[a-zA-Z]/.test(ch)) {
      const fn = input.slice(i).match(FN_NAMES);
      if (fn) {
        i += fn[0].length;
        maybeSupAfter(`<mi>${fn[0]}</mi>`);
        continue;
      }
      i++;
      maybeSupAfter(`<mi>${ch}</mi>`);
      continue;
    }

    // Operators / punctuation
    if (OP_CHARS.has(ch)) {
      const glyph =
        ch === "*" ? "·" : ch === "-" ? "−" : ch;
      parts.push(`<mo>${escapeXml(glyph)}</mo>`);
      i++;
      continue;
    }

    // Unicode letters already math-ish
    if (/[πθαβ∞]/.test(ch)) {
      i++;
      maybeSupAfter(`<mi>${ch}</mi>`);
      continue;
    }

    // Fallback: keep as text so nothing disappears
    parts.push(`<mtext>${escapeXml(ch)}</mtext>`);
    i++;
  }

  return parts.join("");
}

/**
 * Chrome MathML Core ignores bare character data inside <math>, leaving
 * zero-size gaps ("If , what is the value of ?"). Upgrade LaTeX / caret
 * payloads to real tokens; otherwise wrap plain text in <mtext>.
 * Leave already-structured MathML alone.
 */
export function normalizePlainMath(html: string): string {
  if (!html || !/<math[\s>]/i.test(html)) return html;
  return html.replace(
    /<math(\s[^>]*)?>([\s\S]*?)<\/math>/gi,
    (full, attrs, inner) => {
      const body = String(inner ?? "");
      const withNs = mathAttrs(attrs);

      // Proper tokens (mi/mn/mfrac/…) — including semantics from good extracts.
      if (STRUCTURED_MATH_RE.test(body)) return full;

      const text = extractMathPlainText(body);
      if (!text) return full;

      if (needsRichConversion(text)) {
        try {
          const converted = asciiLatexToMathML(text);
          const flat = converted.replace(/<[^>]+>/g, "");
          // Reject failed conversions that still leak TeX / bare carets.
          if (
            converted &&
            STRUCTURED_MATH_RE.test(converted) &&
            !LATEX_CMD_RE.test(flat) &&
            !/\^/.test(flat)
          ) {
            return `<math${withNs}><mrow>${converted}</mrow></math>`;
          }
        } catch {
          /* fall through to mtext */
        }
      }

      return `<math${withNs}><mrow><mtext>${escapeXml(text)}</mtext></mrow></math>`;
    }
  );
}

/**
 * Drop model-invented "The following N lines are shown" / "Falls sharply to"
 * reconstructions. Keep [IMAGE] placeholders and real <img> crops.
 */
export function stripVerbalFigureProse(html: string): string {
  if (!html) return html;
  if (!VERBAL_GRAPH_BULLET_RE.test(html) && !VERBAL_GRAPH_INTRO_RE.test(html)) {
    return html;
  }

  let out = html;

  out = out.replace(
    /<p>\s*The following\s+\d+\s+lines\s+are\s+shown:?\s*<\/p>\s*<ul>[\s\S]*?<\/ul>/gi,
    ""
  );

  out = out.replace(
    /<p>\s*The line graph:?\s*<\/p>\s*<ul>[\s\S]*?<\/ul>/gi,
    ""
  );

  out = out.replace(
    /<p>\s*The\s+[^<]{0,120}?\bline:?\s*<\/p>\s*<ul>[\s\S]*?<\/ul>/gi,
    (block) => (VERBAL_GRAPH_BULLET_RE.test(block) ? "" : block)
  );

  out = out.replace(/<ul>([\s\S]*?)<\/ul>/gi, (full, inner) => {
    const items = [...String(inner).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(
      (m) => m[1].replace(/<[^>]+>/g, " ").trim()
    );
    if (items.length < 2) return full;
    const verbal = items.filter((t) => VERBAL_GRAPH_BULLET_RE.test(t)).length;
    if (verbal >= Math.ceil(items.length * 0.5)) return "";
    return full;
  });

  out = out.replace(
    /<p>\s*The following\s+\d+\s+lines\s+are\s+shown:?\s*<\/p>/gi,
    ""
  );
  out = out.replace(/<p>\s*The line graph:?\s*<\/p>/gi, "");

  out = out.replace(/<p>\s*<\/p>/gi, "");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() ? out : "";
}

/** Same-page duplicate [IMAGE] placeholders → keep the first.
 *  Choice A–D figures live in separate content strings, so per-field
 *  page dedupe does not collapse distinct choice plots.
 */
export function dedupeImageTags(html: string): string {
  if (!html || !/\[IMAGE:/i.test(html)) return html;
  const seenPages = new Set<number>();
  return html.replace(IMAGE_TAG_RE, (full, pageStr: string, desc: string) => {
    const page = Number(pageStr);
    if (!Number.isFinite(page)) return full;
    if (seenPages.has(page)) return "";
    seenPages.add(page);
    // Keep crop-ready landmarks; drop point-by-point narration the model
    // sometimes stuffs into the description ("rises to (1,50), remains level…").
    const cleaned = String(desc ?? "")
      .replace(
        /;\s*the line starts at[\s\S]*$/i,
        ""
      )
      .replace(
        /\b(begins at|falls sharply|falls gradually|rises sharply|rises gradually|remains level)\b[\s\S]*$/i,
        ""
      )
      .replace(/[;\s]+$/g, "")
      .trim();
    const use = cleaned.length >= 12 ? cleaned : String(desc ?? "").trim();
    return `[IMAGE: Page ${page} - ${use}]`;
  });
}

/** Collapse duplicate <img> with the same src (stacked crops, with or without
 *  wrapping <p> tags between them). Keeps the first occurrence. */
export function dedupeConsecutiveImages(html: string): string {
  if (!html || !/<img\b/i.test(html)) return html;

  // First: true consecutive siblings
  let out = html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*(["'])([^"']*)\2[^>]*>)(?:\s*<img\b[^>]*\bsrc\s*=\s*\2\3\2[^>]*>)+/gi,
    "$1"
  );

  // Then: identical src anywhere later in the field (e.g. <img>…</p><p><img>)
  const seen = new Set<string>();
  out = out.replace(/<img\b[^>]*\bsrc\s*=\s*(["'])([^"']*)\1[^>]*>/gi, (full, _q, src) => {
    if (seen.has(src)) return "";
    seen.add(src);
    return full;
  });

  out = out.replace(/<p>\s*<\/p>/gi, "");
  out = out.replace(/[ \t]{2,}/g, " ");
  return out;
}

/** Run all HTML repairs used before crops are applied. */
export function repairHtmlBeforeCrops(html: string): string {
  if (!html) return html;
  let out = stripVerbalFigureProse(html);
  out = dedupeImageTags(out);
  out = normalizePlainMath(out);
  out = out.replace(/<p>\s*<\/p>/gi, "");
  return out;
}

/** Run after placeholders become <img>. */
export function repairHtmlAfterCrops(html: string): string {
  if (!html) return html;
  let out = dedupeConsecutiveImages(html);
  out = normalizePlainMath(out);
  out = stripVerbalFigureProse(out);
  return out;
}

function mapQuestionHtml<T extends HtmlQuestion>(q: T, fn: (s: string) => string): T {
  const map = (s: string | undefined) => (s ? fn(s) : s);
  return {
    ...q,
    stimulus: map(q.stimulus),
    stem: map(q.stem),
    rationale: map(q.rationale),
    choices: q.choices?.map((c) => ({
      ...c,
      content: map(c.content) ?? c.content,
    })),
  };
}

export function repairExtractedQuestion<T extends HtmlQuestion>(q: T): T {
  return mapQuestionHtml(q, repairHtmlBeforeCrops);
}

export function repairExtractedQuestions<T extends HtmlQuestion>(
  questions: T[]
): T[] {
  return questions.map((q) => repairExtractedQuestion(q));
}

/** Repair already-imported item HTML (stored tests / player). */
export function repairItemHtml(html: string | undefined): string | undefined {
  if (!html) return html;
  return repairHtmlAfterCrops(html);
}
