/**
 * Merge Pass A question extract with Pass B figure-audit hits, and repair
 * chunk-local [IMAGE: Page k] numbers to absolute PDF pages.
 */

import { IMAGE_TAG_RE } from "@/lib/pdf/extractPrompt";
import { repairExtractedQuestions } from "@/lib/pdf/repairExtracted";
import type { ExtractedQuestion } from "@/lib/testEngine/importExtracted";

export type FigureHit = {
  page: number;
  description: string;
  questionNumber?: string | number;
  section?: string;
  module?: number;
  kind?: string;
  choiceLabel?: string | null;
};

/** Kinds Pass B may add; vague "other" is rejected. */
export const ALLOWED_FIGURE_KINDS = new Set([
  "graph",
  "diagram",
  "geometry",
  "chart",
  "scatterplot",
  "plot",
]);

const TABLE_DESC_RE =
  /\btable\b|\bcolumns?\b|\brows?\b|\bfrequency\b|\bclassification\b/i;

const WATERMARK_DESC_RE =
  /\bwatermark\b|\bdiscord\b|\btelegram\b|\bstamp\b|\blogo\b|\bheader\b|\bfooter\b|\bqr\s*code\b/i;

const VAGUE_DESC_RE =
  /^(a\s+)?(the\s+)?(graph|figure|diagram|plot|chart|image|drawing)s?\.?$/i;

/** Crop landmarks — without at least one, short graph/figure blurbs are noise. */
const CONCRETE_VISUAL_RE =
  /\b(axis|axes|scatter|triangle|circle|rectangle|polygon|shaded|parabola|line of best fit|xy[\s-]?plane|quadrant|vertex|angle|degrees?|point\s*[A-Z]|segment|ray|histogram|bar\s*chart|pie\s*chart|number\s*line|inequality|region|grid|slope|intercept|ordered\s*pair)\b/i;

const FIGURE_LANGUAGE_RE =
  /\b(figure|graph|diagram|scatterplot|scatter\s*plot|shown above|as shown|number\s*line|xy[\s-]?plane|coordinate\s*plane|shaded\s+region)\b/i;

const ALGEBRAIC_CUE_RE =
  /\binfinitely many solutions\b|\bno solution\b|\bsolve for\b|\bwhat is the value of\b|\bequation[s]?\b|\bsystem of\b|\blinear equation\b|\bquadratic\b|\bfactor\b|\bsimplify\b/i;

/** True when an IMAGE description is almost certainly a data table. */
export function looksLikeTable(description: string): boolean {
  return TABLE_DESC_RE.test(description);
}

/** Watermark / stamp / logo language — never a real figure. */
export function looksLikeWatermark(description: string): boolean {
  return WATERMARK_DESC_RE.test(description);
}

/** Bare "graph" / "figure" / "graph of a linear function" with no crop landmarks. */
export function isVagueFigureDescription(description: string): boolean {
  const d = description.trim();
  if (!d) return true;
  if (VAGUE_DESC_RE.test(d)) return true;
  const words = d.toLowerCase().split(/\W+/).filter(Boolean);
  const generic = new Set([
    "graph",
    "figure",
    "diagram",
    "plot",
    "chart",
    "image",
    "drawing",
    "a",
    "an",
    "the",
    "of",
    "linear",
    "function",
    "functions",
    "line",
    "shown",
  ]);
  if (words.length <= 6 && words.every((w) => generic.has(w))) return true;
  // Short blurbs that say "graph/figure" but name no axes, shapes, or labels.
  if (
    words.length <= 8 &&
    /\b(graph|plot|figure|diagram|chart)\b/i.test(d) &&
    !CONCRETE_VISUAL_RE.test(d)
  ) {
    return true;
  }
  return false;
}

export function isAllowedFigureKind(kind: string | undefined): boolean {
  if (!kind) return false;
  return ALLOWED_FIGURE_KINDS.has(kind.trim().toLowerCase());
}

function isChartKind(kind: string | undefined): boolean {
  return isAllowedFigureKind(kind);
}

/** Strip tags/HTML so we can inspect question wording. */
function plainText(q: ExtractedQuestion): string {
  const parts = [
    q.stimulus,
    q.stem,
    ...(q.choices ?? []).map((c) => c.content),
  ].filter(Boolean) as string[];
  return parts
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(IMAGE_TAG_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stem/stimulus already refer to a visible figure. */
export function hasFigureLanguage(q: ExtractedQuestion): boolean {
  return FIGURE_LANGUAGE_RE.test(plainText(q));
}

/**
 * Pure algebra / SPR-style item with no drawing cue — IMAGE tags here are
 * almost always hallucinations (e.g. "graph of a linear function" on an
 * infinitely-many-solutions equation).
 */
export function isPurelyAlgebraicWithoutFigureCue(
  q: ExtractedQuestion
): boolean {
  if (hasFigureLanguage(q)) return false;
  const text = plainText(q);
  if (!text) return false;
  if (ALGEBRAIC_CUE_RE.test(text)) return true;
  // Math SPR/MC that is mostly MathML / equations and short stem.
  const hasMath =
    /<math[\s>]|<\/math>|=/.test(
      `${q.stimulus ?? ""}${q.stem ?? ""}`
    );
  const short = text.length < 280;
  if (hasMath && short && sectionKey(q.section) === "math") return true;
  return false;
}

/**
 * Whether Pass B may inject this hit onto a question.
 * Prefer concrete visuals only: allowed kind + substantive description.
 */
export function isConcretePassBHit(fig: FigureHit): boolean {
  if (!fig.description?.trim()) return false;
  if (!Number.isFinite(fig.page) || fig.page < 1) return false;
  if (looksLikeTable(fig.description)) return false;
  if (looksLikeWatermark(fig.description)) return false;
  if (isVagueFigureDescription(fig.description)) return false;
  if (!isAllowedFigureKind(fig.kind)) return false;
  return true;
}

/**
 * Rewrite Page k → absolute when k looks chunk-local (k <= chunk page count).
 * Leaves already-absolute numbers alone when they fall outside 1..pages.
 */
export function remapImagePages(
  text: string,
  firstPage: number,
  chunkPages: number
): string {
  if (!text || chunkPages <= 0) return text;
  return text.replace(IMAGE_TAG_RE, (full, pageStr: string, desc: string) => {
    const k = Number(pageStr);
    if (!Number.isFinite(k) || k < 1) return full;
    if (k <= chunkPages) {
      const abs = firstPage + k - 1;
      return `[IMAGE: Page ${abs} - ${desc.trim()}]`;
    }
    return full;
  });
}

export function remapQuestionImagePages(
  question: ExtractedQuestion,
  firstPage: number,
  chunkPages: number
): ExtractedQuestion {
  const map = (s: string | undefined) =>
    s ? remapImagePages(s, firstPage, chunkPages) : s;
  return {
    ...question,
    stimulus: map(question.stimulus),
    stem: map(question.stem),
    rationale: map(question.rationale),
    choices: question.choices?.map((c) => ({
      ...c,
      content: map(c.content) ?? c.content,
    })),
  };
}

export function remapFigurePage(
  figure: FigureHit,
  firstPage: number,
  chunkPages: number
): FigureHit {
  const k = figure.page;
  if (!Number.isFinite(k) || k < 1) return figure;
  if (k <= chunkPages) {
    return { ...figure, page: firstPage + k - 1 };
  }
  return figure;
}

function makeTag(page: number, description: string): string {
  return `[IMAGE: Page ${page} - ${description.trim()}]`;
}

function allImageTags(q: ExtractedQuestion): { page: number; description: string; tag: string }[] {
  const texts = [
    q.stimulus,
    q.stem,
    q.rationale,
    ...(q.choices ?? []).map((c) => c.content),
  ].filter(Boolean) as string[];
  const out: { page: number; description: string; tag: string }[] = [];
  const seen = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(IMAGE_TAG_RE)) {
      const tag = m[0];
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push({ tag, page: Number(m[1]), description: m[2].trim() });
    }
  }
  return out;
}

function stripTags(
  text: string,
  shouldDrop: (page: number, description: string) => boolean
): string {
  let out = text.replace(IMAGE_TAG_RE, (full, pageStr: string, desc: string) => {
    const page = Number(pageStr);
    return shouldDrop(page, desc.trim()) ? "" : full;
  });
  // Tidy holes left by removed placeholders.
  out = out.replace(/<p>\s*<\/p>/gi, "");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() ? out : "";
}

function stripQuestionTags(
  q: ExtractedQuestion,
  shouldDrop: (page: number, description: string) => boolean
): ExtractedQuestion {
  const map = (s: string | undefined) => (s ? stripTags(s, shouldDrop) : s);
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

function sectionKey(s: string | undefined): "math" | "rw" | "other" {
  if (!s) return "other";
  if (/math/i.test(s)) return "math";
  if (/reading|writing|rw/i.test(s)) return "rw";
  return "other";
}

function numStr(n: string | number | undefined): string | null {
  if (n === undefined || n === null || n === "") return null;
  const v = String(n).trim();
  return v || null;
}

function questionHasTagOnPage(q: ExtractedQuestion, page: number): boolean {
  return allImageTags(q).some((t) => t.page === page);
}

function questionHasSimilarTag(
  q: ExtractedQuestion,
  page: number,
  description: string
): boolean {
  const needle = description.trim().toLowerCase().slice(0, 40);
  return allImageTags(q).some((t) => {
    if (t.page !== page) return false;
    if (!needle) return true;
    return t.description.toLowerCase().includes(needle.slice(0, 24));
  });
}

function insertTag(
  q: ExtractedQuestion,
  tag: string,
  choiceLabel?: string | null
): ExtractedQuestion {
  const label = choiceLabel?.trim().toUpperCase();
  if (label && q.choices?.length) {
    const choices = q.choices.map((c) => {
      if (c.label.toUpperCase() !== label) return c;
      if (c.content.includes(tag)) return c;
      const content = c.content?.trim()
        ? `${c.content.trim()} ${tag}`
        : `<p>${tag}</p>`;
      return { ...c, content };
    });
    return { ...q, choices };
  }
  if (q.stimulus?.includes(tag) || q.stem?.includes(tag)) return q;
  const stimulus = q.stimulus?.trim()
    ? `${q.stimulus.trim()}\n<p>${tag}</p>`
    : `<p>${tag}</p>`;
  return { ...q, stimulus };
}

/**
 * Pick the best Pass A question for a Pass B figure hit.
 */
function findTarget(
  questions: ExtractedQuestion[],
  fig: FigureHit
): number {
  const qn = numStr(fig.questionNumber);
  const wantSection = sectionKey(fig.section);
  const wantModule = fig.module;

  const scored: { i: number; score: number }[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    let score = 0;
    if (qn && numStr(q.number) === qn) score += 10;
    if (wantSection !== "other" && sectionKey(q.section) === wantSection) {
      score += 4;
    }
    if (
      wantModule != null &&
      Number(q.module) === Number(wantModule)
    ) {
      score += 3;
    }
    if (questionHasTagOnPage(q, fig.page)) score += 5;
    // Prefer Math for diagram/graph kinds when number didn't match.
    if (
      !qn &&
      isChartKind(fig.kind) &&
      sectionKey(q.section) === "math"
    ) {
      score += 1;
    }
    if (score > 0) scored.push({ i, score });
  }

  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score);
    return scored[0].i;
  }

  // Fallback: nearest existing IMAGE page among Math (or any) items.
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (wantSection === "math" && sectionKey(q.section) !== "math") continue;
    for (const t of allImageTags(q)) {
      const d = Math.abs(t.page - fig.page);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
  }
  if (best >= 0) return best;

  // Last resort: first Math question, else first question.
  const mathIdx = questions.findIndex((q) => sectionKey(q.section) === "math");
  if (mathIdx >= 0) return mathIdx;
  return questions.length > 0 ? 0 : -1;
}

function passBReconfirmsNonTable(
  page: number,
  description: string,
  figures: FigureHit[]
): boolean {
  const tokens = description
    .toLowerCase()
    .replace(/\btable\b/g, " ")
    .split(/\W+/)
    .filter((t) => t.length > 3);
  return figures.some((f) => {
    if (f.page !== page || looksLikeTable(f.description)) return false;
    if (!isConcretePassBHit(f)) return false;
    const other = f.description.toLowerCase();
    const hits = tokens.filter((t) => other.includes(t)).length;
    return hits >= 2 || (tokens.length > 0 && hits === tokens.length);
  });
}

/**
 * Merge Pass B figures into Pass A questions: drop table / watermark / vague
 * IMAGE tags, then add only concrete Pass B hits (allowed kind + substance).
 */
export function mergeFigures(
  questions: ExtractedQuestion[],
  figures: FigureHit[]
): ExtractedQuestion[] {
  const cleaned = questions.map((q) => {
    let next = stripQuestionTags(q, (page, description) => {
      if (looksLikeWatermark(description)) return true;
      if (isVagueFigureDescription(description)) return true;
      if (!looksLikeTable(description)) return false;
      return !passBReconfirmsNonTable(page, description, figures);
    });
    // Algebraic items with no figure cue: strip leftover phantom IMAGE tags.
    if (isPurelyAlgebraicWithoutFigureCue(next)) {
      next = stripQuestionTags(next, () => true);
    }
    return next;
  });

  if (cleaned.length === 0) return cleaned;

  let next = cleaned.map((q) => ({ ...q }));

  if (figures.length > 0) {
  for (const fig of figures) {
    if (!isConcretePassBHit(fig)) continue;

    const idx = findTarget(next, fig);
    if (idx < 0) continue;

    // Never inject onto a pure-algebra question that has no drawing language
    // (e.g. infinitely-many-solutions SPR with a phantom "linear graph").
    if (isPurelyAlgebraicWithoutFigureCue(next[idx])) continue;

    if (questionHasSimilarTag(next[idx], fig.page, fig.description)) {
      continue;
    }

    const tag = makeTag(fig.page, fig.description);
    next[idx] = insertTag(next[idx], tag, fig.choiceLabel);
  }
  }

  // Strip verbal graph prose, dedupe IMAGE tags, fix plain-text <math>.
  return repairExtractedQuestions(next);
}
