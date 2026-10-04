/**
 * AP content format. Every subject lives under content/ap/<slug>/:
 *
 *   content/ap/<slug>/meta.json      ApSubjectMeta  (exam profile + unit list)
 *   content/ap/<slug>/unit-01.json   ApUnit         (one file per unit, 2-digit)
 *   content/ap/<slug>/unit-02.json   ...
 *
 * All content is original. Nothing is copied from College Board released
 * exams, review books, or other prep sites; those are only used to calibrate
 * style and difficulty.
 *
 * Text fields accept a small Markdown subset, rendered by the site:
 *   paragraphs (blank line), **bold**, *italic*, `inline code`,
 *   ``` fenced code blocks ```, "- " bullet lists, "1. " numbered lists,
 *   and pipe tables (| a | b |). No HTML, no images, no LaTeX.
 * Write math in Unicode: x², √(x+1), ∫₀¹ f(x) dx, π, ≤, ≥, ≠, →, Δ, θ, ½.
 * Questions must not depend on a picture. If a graph, map, artwork, or score
 * matters, describe it precisely in the stimulus or give the data as a table.
 *
 * Validate with:
 *   node --experimental-strip-types scripts/check-ap-content.ts [slug]
 */

/** Practice tiers. Calibrated against the real exam, not against the course. */
export const AP_TIERS = ["Intro", "Exam level", "Hardest"] as const;
export type ApTier = (typeof AP_TIERS)[number];
/*
 * Intro       Checks one idea at a time: a definition, a single-step
 *             application, a direct read of a source. A student a few weeks
 *             into the unit gets it right.
 * Exam level  Indistinguishable in style, length, stimulus use, and difficulty
 *             from a median question on the current AP exam for this unit.
 * Hardest     Matches the hardest ~15% of items on the real exam: multi-step,
 *             stimulus-heavy, close distractors, skills combined across topics.
 *             Still fair and still within the course framework.
 */

export type ApSource = { title: string; url: string };

export type ApExamSection = {
  /** e.g. "Section I, Part A" */
  name: string;
  /** e.g. "Multiple choice", "Short answer", "Document-based question" */
  questionType: string;
  /** Number of questions; 0 for through-course tasks with no count. */
  count: number;
  /** Minutes; 0 when not timed on exam day (portfolio, performance task). */
  minutes: number;
  /** Share of the composite score, e.g. "50%" */
  weight: string;
  calculator?: "Allowed" | "Not allowed" | "Graphing calculator required";
  notes?: string;
};

export type ApSubjectMeta = {
  slug: string;
  name: string;
  /** Month the profile was last checked against College Board, e.g. "2026-10". */
  lastVerified: string;
  /** One-paragraph plain description of what the course and exam test. */
  overview: string;
  /** "Fully digital in Bluebook", "Hybrid digital", "Paper", "Portfolio", etc. */
  examMode: string;
  totalMinutes: number;
  sections: ApExamSection[];
  /**
   * The current course units in order. This list is authoritative: the site
   * uses it over the hardcoded fallback. unit-NN.json files must match it.
   */
  units: {
    number: number;
    title: string;
    /** Exam weighting as College Board publishes it, e.g. "10–12%". */
    weight?: string;
  }[];
  /** Course skills / science practices / historical thinking skills. */
  skills: { name: string; description: string }[];
  scoring: {
    /** How raw section scores combine into 1–5, in plain words. */
    summary: string;
    /**
     * Approximate composite % needed for each score. Clearly an estimate;
     * College Board does not publish cut scores.
     */
    approxCutoffs?: { score: 5 | 4 | 3 | 2; minPercent: number }[];
    /** Most recent published score distribution. */
    distribution?: { year: number; percents: Record<"5" | "4" | "3" | "2" | "1", number> };
  };
  /** How each free-response type is scored, if the exam has them. */
  frqTypes?: { name: string; points: number; howScored: string }[];
  /** Exam-day strategy, specific to this exam. 5–10 items. */
  strategy: string[];
  /** Things students commonly get wrong on this exam overall. */
  pitfalls: string[];
  /** Formula/reference sheet contents the student gets on exam day, if any. */
  referenceSheet?: string;
  /** Pages actually read while researching. */
  sources: ApSource[];
  /** Anything uncertain or changing (e.g. course redesign next year). */
  caveats?: string[];
};

export type ApGuide = {
  /** 2–4 sentence overview of the unit. */
  summary: string;
  /** The teaching content. Enough to learn the unit from, exam-focused. */
  sections: { heading: string; body: string }[];
  keyTakeaways: string[];
  commonMistakes: string[];
  /** How this unit shows up on the exam: question styles, what gets asked. */
  examTips: string[];
  /** A dense one-screen recap to read the morning of the exam. */
  cramSheet: string;
};

export type ApVocab = {
  term: string;
  /** The definition the exam rewards, in one or two sentences. */
  definition: string;
  /** Optional example or use in context. */
  example?: string;
};

type ApQuestionBase = {
  /** Unique within the subject, e.g. "u3-q07". */
  id: string;
  tier: ApTier;
  /** Topic within the unit, e.g. "3.4 Cellular Respiration". */
  topic: string;
  /** Course skill exercised, from meta.skills when possible. */
  skill?: string;
  /** Passage, source, data table, code, or scenario shown before the stem. */
  stimulus?: string;
};

export type ApMcq = ApQuestionBase & {
  type: "mcq";
  stem: string;
  /** 4 choices (A–D) for most exams; 5 (A–E) where the exam uses 5. */
  choices: { id: "A" | "B" | "C" | "D" | "E"; text: string }[];
  answer: "A" | "B" | "C" | "D" | "E";
  /** Why the answer is right, worked out step by step where relevant. */
  explanation: string;
  /** Why each wrong choice is tempting, keyed by choice id. */
  distractors?: Partial<Record<"A" | "B" | "C" | "D" | "E", string>>;
};

export type ApFrq = ApQuestionBase & {
  type: "frq";
  /** The exam's own name for the type, e.g. "LEQ", "Free response", "Q3 Argument". */
  frqType: string;
  prompt: string;
  /** Lettered parts, when the real FRQ has them. */
  parts?: { label: string; prompt: string; points: number }[];
  points: number;
  /** Suggested minutes, matching exam pacing. */
  minutes?: number;
  /** Scored the way the real rubric scores it. Points must sum to `points`. */
  rubric: { criterion: string; points: number; description: string }[];
  /** A response that earns full or near-full credit. */
  sampleResponse: string;
};

export type ApQuestion = ApMcq | ApFrq;

export type ApUnit = {
  number: number;
  title: string;
  guide: ApGuide;
  /** 12–25 terms. */
  vocab: ApVocab[];
  /**
   * At least 14 MCQ (4 Intro, 6 Exam level, 4 Hardest) and at least 1 FRQ in
   * the real exam's FRQ style, for exams that have MCQ. Portfolio and
   * performance-task courses use FRQ-type tasks only, at least 4 per unit.
   */
  practice: ApQuestion[];
  /** Only links opened and confirmed to exist. Omit rather than guess. */
  videos?: { title: string; url: string; channel: string }[];
};
