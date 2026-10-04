import "server-only";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AP_SUBJECTS, type ApSubject } from "@/lib/apSubjects";
import { NEEDS_CHECK, unitTitles } from "@/lib/apContent";
import {
  AP_TIERS,
  type ApFrq,
  type ApMcq,
  type ApQuestion,
  type ApSubjectMeta,
  type ApTier,
  type ApUnit,
} from "@/lib/apSchema";

/**
 * Reads AP content from content/ap/<slug>/ (format in lib/apSchema.ts).
 *
 * Content is written by hand and lands subject by subject, so nothing here
 * trusts it. Every file is parsed inside a try, every field is checked before
 * it's used, and anything malformed is dropped (a question, a vocab term) or
 * treated as absent (a whole unit, a whole subject) rather than allowed to
 * take a page down. What got dropped is collected as issues and logged once
 * per file in development, so authors see it without the site breaking.
 *
 * Reads happen at build time for the statically generated AP pages, and on
 * request in `next dev`. Files are cached by mtime, so a dev server picks up
 * edits without a restart and a build reads each file once.
 */

const ROOT = join(process.cwd(), "content", "ap");

export type ApUnitStatus =
  /** Unit file parsed and has at least a guide or questions. */
  | "ready"
  /** meta.json lists the unit but its file isn't there yet. */
  | "missing"
  /** The file is there but isn't usable JSON / an ApUnit. */
  | "malformed"
  /** The subject has no meta.json, so this is a fallback title only. */
  | "none";

export type ApUnitSummary = {
  number: number;
  title: string;
  weight?: string;
  status: ApUnitStatus;
  guide: boolean;
  mcq: number;
  frq: number;
  vocab: number;
  videos: number;
  tiers: Record<ApTier, number>;
};

export type ApSubjectSummary = {
  slug: string;
  name: string;
  category: ApSubject["category"];
  hasMeta: boolean;
  /** Fallback unit titles that still need checking (no meta.json yet). */
  provisional: boolean;
  examMode?: string;
  lastVerified?: string;
  units: ApUnitSummary[];
  totals: {
    units: number;
    guides: number;
    mcq: number;
    frq: number;
    questions: number;
    vocab: number;
    videos: number;
  };
};

// ---------------------------------------------------------------- file cache

type Cached<T> = { mtimeMs: number; value: T };
const cache = new Map<string, Cached<unknown>>();
const logged = new Set<string>();

/**
 * Parses and normalizes a JSON file, memoized on mtime. Returns undefined when
 * the file doesn't exist and null when it exists but can't be used.
 */
function readJson<T>(
  path: string,
  normalize: (raw: unknown, issues: string[]) => T | null
): T | null | undefined {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    return undefined;
  }

  const hit = cache.get(path) as Cached<T | null> | undefined;
  if (hit && hit.mtimeMs === mtimeMs) return hit.value;

  const issues: string[] = [];
  let value: T | null = null;
  try {
    value = normalize(JSON.parse(readFileSync(path, "utf8")), issues);
  } catch (e) {
    issues.push(`not valid JSON (${(e as Error).message})`);
    value = null;
  }
  if (value === null && issues.length === 0) issues.push("not usable");

  cache.set(path, { mtimeMs, value });
  issueLog.set(path, issues);
  const key = `${path}@${mtimeMs}`;
  if (issues.length && process.env.NODE_ENV !== "production" && !logged.has(key)) {
    logged.add(key);
    const rel = path.slice(process.cwd().length + 1);
    console.warn(`[ap content] ${rel}: ${issues.slice(0, 8).join("; ")}${issues.length > 8 ? ` (+${issues.length - 8} more)` : ""}`);
  }
  return value;
}

const issueLog = new Map<string, string[]>();

// ---------------------------------------------------------------- guards

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const has = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => arr(v).filter(has);

const CHOICE_IDS = ["A", "B", "C", "D", "E"] as const;
type ChoiceId = (typeof CHOICE_IDS)[number];
const isChoiceId = (v: unknown): v is ChoiceId => CHOICE_IDS.includes(v as ChoiceId);

function tierOf(v: unknown): ApTier | null {
  const s = str(v).trim().toLowerCase();
  return AP_TIERS.find((t) => t.toLowerCase() === s) ?? null;
}

// ---------------------------------------------------------------- meta

function normalizeMeta(slug: string) {
  return (raw: unknown, issues: string[]): ApSubjectMeta | null => {
    if (!isObj(raw)) {
      issues.push("meta.json is not an object");
      return null;
    }

    const units = arr(raw.units)
      .filter(isObj)
      .map((u) => ({
        number: num(u.number, NaN),
        title: str(u.title).trim(),
        weight: has(u.weight) ? u.weight : undefined,
      }))
      .filter((u) => {
        const ok = Number.isInteger(u.number) && u.number > 0 && u.title;
        if (!ok) issues.push(`dropped a unit entry without number/title`);
        return ok;
      })
      .sort((a, b) => a.number - b.number);
    if (!units.length) {
      issues.push("meta.units is empty");
      return null;
    }

    const scoring = isObj(raw.scoring) ? raw.scoring : {};
    const cutoffs = arr(scoring.approxCutoffs)
      .filter(isObj)
      .map((c) => ({ score: num(c.score), minPercent: num(c.minPercent, NaN) }))
      .filter(
        (c): c is { score: 5 | 4 | 3 | 2; minPercent: number } =>
          [2, 3, 4, 5].includes(c.score) && c.minPercent >= 0 && c.minPercent <= 100
      )
      .sort((a, b) => b.score - a.score);

    let distribution: ApSubjectMeta["scoring"]["distribution"];
    if (isObj(scoring.distribution) && isObj(scoring.distribution.percents)) {
      const p = scoring.distribution.percents;
      const percents = {
        "5": num(p["5"]),
        "4": num(p["4"]),
        "3": num(p["3"]),
        "2": num(p["2"]),
        "1": num(p["1"]),
      };
      if (Object.values(percents).some((n) => n > 0)) {
        distribution = { year: num(scoring.distribution.year), percents };
      }
    }

    if (has(raw.slug) && raw.slug !== slug) issues.push(`meta.slug is "${raw.slug}"`);

    return {
      slug,
      name: str(raw.name),
      lastVerified: str(raw.lastVerified),
      overview: str(raw.overview),
      examMode: str(raw.examMode),
      totalMinutes: num(raw.totalMinutes),
      sections: arr(raw.sections)
        .filter(isObj)
        .filter((s) => has(s.name) || has(s.questionType))
        .map((s) => ({
          name: str(s.name),
          questionType: str(s.questionType),
          count: num(s.count),
          minutes: num(s.minutes),
          weight: str(s.weight),
          calculator:
            s.calculator === "Allowed" ||
            s.calculator === "Not allowed" ||
            s.calculator === "Graphing calculator required"
              ? s.calculator
              : undefined,
          notes: has(s.notes) ? s.notes : undefined,
        })),
      units,
      skills: arr(raw.skills)
        .filter(isObj)
        .filter((s) => has(s.name))
        .map((s) => ({ name: str(s.name), description: str(s.description) })),
      scoring: {
        summary: str(scoring.summary),
        approxCutoffs: cutoffs.length ? cutoffs : undefined,
        distribution,
      },
      frqTypes: arr(raw.frqTypes)
        .filter(isObj)
        .filter((f) => has(f.name))
        .map((f) => ({ name: str(f.name), points: num(f.points), howScored: str(f.howScored) })),
      strategy: strList(raw.strategy),
      pitfalls: strList(raw.pitfalls),
      referenceSheet: has(raw.referenceSheet) ? raw.referenceSheet : undefined,
      sources: arr(raw.sources)
        .filter(isObj)
        .filter((s) => has(s.title) && /^https?:\/\//.test(str(s.url)))
        .map((s) => ({ title: str(s.title), url: str(s.url) })),
      caveats: strList(raw.caveats),
    };
  };
}

// ---------------------------------------------------------------- unit

function normalizeQuestion(raw: unknown, k: number, issues: string[]): ApQuestion | null {
  if (!isObj(raw)) {
    issues.push(`practice[${k}] is not an object`);
    return null;
  }
  const id = has(raw.id) ? raw.id.trim() : "";
  const where = id || `practice[${k}]`;
  if (!id) {
    issues.push(`${where}: no id`);
    return null;
  }
  let tier = tierOf(raw.tier);
  if (!tier) {
    issues.push(`${where}: bad tier "${str(raw.tier)}", shown as Exam level`);
    tier = "Exam level";
  }
  const base = {
    id,
    tier,
    topic: str(raw.topic),
    skill: has(raw.skill) ? raw.skill : undefined,
    stimulus: has(raw.stimulus) ? raw.stimulus : undefined,
  };

  if (raw.type === "mcq") {
    const seen = new Set<string>();
    const choices = arr(raw.choices)
      .filter(isObj)
      .filter((c) => isChoiceId(c.id) && has(c.text) && !seen.has(c.id as string) && seen.add(c.id as string))
      .map((c) => ({ id: c.id as ChoiceId, text: str(c.text) }));
    if (!has(raw.stem) || choices.length < 2) {
      issues.push(`${where}: mcq without stem or choices, dropped`);
      return null;
    }
    if (!isChoiceId(raw.answer) || !choices.some((c) => c.id === raw.answer)) {
      issues.push(`${where}: answer "${str(raw.answer)}" isn't a choice, dropped`);
      return null;
    }
    const distractors: ApMcq["distractors"] = {};
    if (isObj(raw.distractors)) {
      for (const [key, v] of Object.entries(raw.distractors)) {
        if (isChoiceId(key) && has(v)) distractors[key] = v;
      }
    }
    if (!has(raw.explanation)) issues.push(`${where}: no explanation`);
    const q: ApMcq = {
      ...base,
      type: "mcq",
      stem: str(raw.stem),
      choices,
      answer: raw.answer,
      explanation: str(raw.explanation),
      distractors,
    };
    return q;
  }

  if (raw.type === "frq") {
    const rubric = arr(raw.rubric)
      .filter(isObj)
      .filter((r) => has(r.criterion) || has(r.description))
      .map((r) => ({
        criterion: str(r.criterion),
        points: Math.max(0, Math.round(num(r.points))),
        description: str(r.description),
      }));
    if (!has(raw.prompt) && !arr(raw.parts).length) {
      issues.push(`${where}: frq without prompt, dropped`);
      return null;
    }
    if (!rubric.length) {
      issues.push(`${where}: frq without rubric, dropped`);
      return null;
    }
    const rubricSum = rubric.reduce((n, r) => n + r.points, 0);
    const points = num(raw.points, rubricSum);
    if (points !== rubricSum) issues.push(`${where}: rubric sums to ${rubricSum}, points is ${points}`);
    const parts = arr(raw.parts)
      .filter(isObj)
      .filter((p) => has(p.prompt))
      .map((p) => ({ label: str(p.label), prompt: str(p.prompt), points: num(p.points) }));
    const q: ApFrq = {
      ...base,
      type: "frq",
      frqType: str(raw.frqType) || "Free response",
      prompt: str(raw.prompt),
      parts: parts.length ? parts : undefined,
      // Self-scoring is out of the rubric, so the rubric's total is what counts.
      points: rubricSum,
      minutes: num(raw.minutes) || undefined,
      rubric,
      sampleResponse: str(raw.sampleResponse),
    };
    return q;
  }

  issues.push(`${where}: unknown type "${str(raw.type)}", dropped`);
  return null;
}

function normalizeUnit(expected: { number: number; title: string }) {
  return (raw: unknown, issues: string[]): ApUnit | null => {
    if (!isObj(raw)) {
      issues.push("unit file is not an object");
      return null;
    }
    if (raw.number !== expected.number) issues.push(`number is ${String(raw.number)}, meta says ${expected.number}`);
    if (has(raw.title) && raw.title !== expected.title) issues.push(`title "${raw.title}" differs from meta`);

    const g = isObj(raw.guide) ? raw.guide : null;
    const guide: ApUnit["guide"] | null = g
      ? {
          summary: str(g.summary),
          sections: arr(g.sections)
            .filter(isObj)
            .filter((s) => has(s.body))
            .map((s) => ({ heading: str(s.heading), body: str(s.body) })),
          keyTakeaways: strList(g.keyTakeaways),
          commonMistakes: strList(g.commonMistakes),
          examTips: strList(g.examTips),
          cramSheet: str(g.cramSheet),
        }
      : null;
    if (!guide) issues.push("no guide");

    const ids = new Set<string>();
    const practice = arr(raw.practice)
      .map((q, k) => normalizeQuestion(q, k, issues))
      .filter((q): q is ApQuestion => {
        if (!q) return false;
        if (ids.has(q.id)) {
          issues.push(`${q.id}: duplicate id, second copy dropped`);
          return false;
        }
        ids.add(q.id);
        return true;
      });

    const vocab = arr(raw.vocab)
      .filter(isObj)
      .filter((v) => has(v.term) && has(v.definition))
      .map((v) => ({
        term: str(v.term).trim(),
        definition: str(v.definition),
        example: has(v.example) ? v.example : undefined,
      }));

    const videos = arr(raw.videos)
      .filter(isObj)
      .filter((v) => has(v.title) && /^https:\/\//.test(str(v.url)))
      .map((v) => ({ title: str(v.title), url: str(v.url), channel: str(v.channel) }));

    return {
      number: expected.number,
      title: expected.title,
      // A unit with no usable guide still serves its practice and vocab. The
      // empty guide renders as an empty state, not a crash.
      guide: guide ?? {
        summary: "",
        sections: [],
        keyTakeaways: [],
        commonMistakes: [],
        examTips: [],
        cramSheet: "",
      },
      vocab,
      practice,
      videos: videos.length ? videos : undefined,
    };
  };
}

// ---------------------------------------------------------------- public API

export function subjectBySlug(slug: string): ApSubject | undefined {
  return AP_SUBJECTS.find((s) => s.slug === slug);
}

const unitFile = (slug: string, n: number) =>
  join(ROOT, slug, `unit-${String(n).padStart(2, "0")}.json`);

/** The subject's exam profile, or null when it hasn't landed or is unusable. */
export function loadMeta(slug: string): ApSubjectMeta | null {
  if (!subjectBySlug(slug)) return null;
  return readJson(join(ROOT, slug, "meta.json"), normalizeMeta(slug)) ?? null;
}

/**
 * The unit list a subject page should show: meta.units when meta exists,
 * otherwise the hardcoded fallback titles.
 */
export function unitList(slug: string): { number: number; title: string; weight?: string }[] {
  const meta = loadMeta(slug);
  if (meta) return meta.units;
  const subject = subjectBySlug(slug);
  if (!subject) return [];
  return unitTitles(slug, subject.units).map((title, k) => ({ number: k + 1, title }));
}

/** One unit's full content, or null when it's missing or unusable. */
export function loadUnit(slug: string, n: number): ApUnit | null {
  const meta = loadMeta(slug);
  const entry = meta?.units.find((u) => u.number === n);
  if (!entry) return null;
  return readJson(unitFile(slug, n), normalizeUnit(entry)) ?? null;
}

function emptyTiers(): Record<ApTier, number> {
  return { Intro: 0, "Exam level": 0, Hardest: 0 };
}

export function subjectSummary(slug: string): ApSubjectSummary | null {
  const subject = subjectBySlug(slug);
  if (!subject) return null;
  const meta = loadMeta(slug);

  const units: ApUnitSummary[] = unitList(slug).map((u) => {
    const blank = {
      ...u,
      guide: false,
      mcq: 0,
      frq: 0,
      vocab: 0,
      videos: 0,
      tiers: emptyTiers(),
    };
    if (!meta) return { ...blank, status: "none" as const };

    const raw = readJson(unitFile(slug, u.number), normalizeUnit(u));
    if (raw === undefined) return { ...blank, status: "missing" as const };
    if (raw === null) return { ...blank, status: "malformed" as const };

    const tiers = emptyTiers();
    let mcq = 0;
    let frq = 0;
    for (const q of raw.practice) {
      if (q.type === "mcq") {
        mcq++;
        tiers[q.tier]++;
      } else frq++;
    }
    const guide = raw.guide.sections.length > 0 || has(raw.guide.summary);
    return {
      ...u,
      status: guide || raw.practice.length || raw.vocab.length ? ("ready" as const) : ("malformed" as const),
      guide,
      mcq,
      frq,
      vocab: raw.vocab.length,
      videos: raw.videos?.length ?? 0,
      tiers,
    };
  });

  const sum = (f: (u: ApUnitSummary) => number) => units.reduce((n, u) => n + f(u), 0);
  const mcq = sum((u) => u.mcq);
  const frq = sum((u) => u.frq);

  return {
    slug,
    name: subject.name,
    category: subject.category,
    hasMeta: Boolean(meta),
    provisional: !meta && NEEDS_CHECK.has(slug),
    examMode: meta?.examMode || undefined,
    lastVerified: meta?.lastVerified || undefined,
    units,
    totals: {
      units: units.length,
      guides: sum((u) => (u.guide ? 1 : 0)),
      mcq,
      frq,
      questions: mcq + frq,
      vocab: sum((u) => u.vocab),
      videos: sum((u) => u.videos),
    },
  };
}

export function allSummaries(): ApSubjectSummary[] {
  return AP_SUBJECTS.map((s) => subjectSummary(s.slug)!);
}

/** True when a subject has anything a student can actually use. */
export function hasContent(s: ApSubjectSummary): boolean {
  return s.totals.guides + s.totals.questions + s.totals.vocab > 0;
}

/**
 * The practice-exam question pool: every Exam level and Hardest MCQ in the
 * subject, tagged with its unit. Served by app/api/ap/[slug]/mock so the mock
 * page itself doesn't carry the answers.
 */
export type MockPoolItem = { unit: number; q: ApMcq };

export function mockPool(slug: string): MockPoolItem[] {
  const meta = loadMeta(slug);
  if (!meta) return [];
  const out: MockPoolItem[] = [];
  for (const u of meta.units) {
    const unit = loadUnit(slug, u.number);
    for (const q of unit?.practice ?? []) {
      if (q.type === "mcq" && q.tier !== "Intro") out.push({ unit: u.number, q });
    }
  }
  return out;
}

/**
 * Everything the loader dropped or doubted, per file, for the subjects asked
 * about. Used by tooling, not pages.
 */
export function contentIssues(slugs = AP_SUBJECTS.map((s) => s.slug)): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const slug of slugs) {
    subjectSummary(slug);
    for (const [path, issues] of Array.from(issueLog.entries())) {
      if (issues.length && path.startsWith(join(ROOT, slug) + "/")) {
        out[path.slice(process.cwd().length + 1)] = issues;
      }
    }
  }
  return out;
}
