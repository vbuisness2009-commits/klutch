/**
 * Test engine data model.
 *
 * Mirrors the structure College Board documents for the digital SAT so a
 * full-length form drops into the player without code changes: two sections,
 * two modules each, module 2 selected by performance on module 1.
 *
 * Reference (Digital SAT Suite Technical Manual, 2024):
 *   Reading and Writing  2 x 27 items (25 operational + 2 pretest), 32 min
 *   Math                 2 x 22 items (20 operational + 2 pretest), 35 min
 *   Module 1 is a broad mix of difficulty and decides the module 2 route.
 *   Items are ordered easiest to hardest within a module.
 */

export type SectionId = "rw" | "math";

export type Domain =
  // Reading and Writing
  | "Information and Ideas"
  | "Craft and Structure"
  | "Expression of Ideas"
  | "Standard English Conventions"
  // Math
  | "Algebra"
  | "Advanced Math"
  | "Problem-Solving and Data Analysis"
  | "Geometry and Trigonometry";

/** College Board's three-band labelling, used for blueprint targets. */
export type Difficulty = "E" | "M" | "H";

/** Which module-2 form a student routes into. */
export type Route = "lower" | "upper";

export type Choice = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

/**
 * A route to the answer. Math items carry more than one, ordered fastest
 * first, because the useful thing to teach is not just why the answer is right
 * but which path gets there quickest. For most digital SAT math that is
 * Desmos, and knowing when it is not is itself a skill.
 */
export type SolutionPath = {
  method: "desmos" | "algebra" | "reasoning";
  /** Short name shown on the tab, e.g. "Graph it in Desmos". */
  label: string;
  /** Roughly how long this route takes a fluent student, in seconds. */
  seconds: number;
  steps: string[];
  /** Expressions to preload into the calculator, in order. */
  desmosExpressions?: string[];
  /** Why you would pick this route over the other one. */
  whenToUse?: string;
};

/**
 * How long a fluent student should spend on this item. Assigned once (AI or
 * heuristic) and stored on the item — never inferred from the student's own
 * session median, which falsely marks 2s answers as "slow" in short runs.
 */
export type PaceProfile = "sprint" | "steady" | "deep";

export type ExpectedPace = {
  /** Lower end of the expected active-time band (seconds). */
  minSec: number;
  /** Above this is slow for this item. */
  maxSec: number;
  profile: PaceProfile;
  /** Short label, e.g. "Words in Context — sprint". */
  note?: string;
  source?: "ai" | "heuristic";
};

type BaseItem = {
  id: string;
  domain: Domain;
  skill: string;
  difficulty: Difficulty;
  /**
   * Pretest items are shown to the student but excluded from scoring. This is
   * how uncalibrated items earn their statistics. Nothing marks them in the UI.
   */
  pretest?: boolean;
  /** Passage, data description, or setup shown beside the question. */
  stimulus?: string;
  stem: string;
  rationale: string;
  /**
   * Where the answer key came from. Missing/unset means the item still needs
   * a key (typical Bluebook export). "solved" means the post-upload Gemini
   * pass filled it; "paper" means it arrived with the source file.
   */
  keySource?: "paper" | "solved" | "missing";
  /** Set by importers when stem and stimulus carry markup rather than plain text. */
  html?: boolean;
  /** Target active-time band for pacing feedback. */
  expectedPace?: ExpectedPace;
  /**
   * Written when the item is authored and reviewed then, never generated at
   * request time. A wrong explanation is worse than none, because the student
   * cannot tell and will study the error.
   */
  solutions?: SolutionPath[];
  /** Why each wrong choice is tempting, keyed by choice id. */
  distractorNotes?: Partial<Record<"A" | "B" | "C" | "D", string>>;
};

export type MultipleChoiceItem = BaseItem & {
  format: "mc";
  choices: Choice[];
  correct: Choice["id"];
};

/** Student-produced response. Roughly a quarter of Math items. */
export type SprItem = BaseItem & {
  format: "spr";
  /** Every string that counts as correct, e.g. ["3/5", ".6", "0.6"]. */
  accepted: string[];
};

export type Item = MultipleChoiceItem | SprItem;

export type Module = {
  id: string;
  items: Item[];
};

export type Section = {
  id: SectionId;
  name: string;
  /** Seconds allowed per module. Real test: 1920 for RW, 2100 for Math. */
  secondsPerModule: number;
  module1: Module;
  module2: Record<Route, Module>;
  /**
   * Number correct on module 1 at or above which the student routes into the
   * higher-difficulty module 2. College Board does not publish its threshold,
   * so this is a Klutch choice and is stated as such in the UI.
   */
  routeUpAt: number;
};

export type TestForm = {
  id: string;
  name: string;
  /** Seconds for the break between sections. Real test: 600. */
  breakSeconds: number;
  sections: Section[];
};

export function isSpr(item: Item): item is SprItem {
  return item.format === "spr";
}

/** Normalizes an SPR entry before comparing: trims, drops spaces and $ signs. */
export function sprMatches(item: SprItem, raw: string): boolean {
  const clean = (s: string) => s.trim().replace(/[\s$,]/g, "");
  const given = clean(raw);
  if (!given) return false;
  return item.accepted.some((a) => clean(a) === given);
}

export function isCorrect(item: Item, response: string | undefined): boolean {
  if (!response) return false;
  return isSpr(item) ? sprMatches(item, response) : response === item.correct;
}

/** Operational items only. Pretest items never affect a score. */
export function scoredItems(items: Item[]): Item[] {
  return items.filter((i) => !i.pretest);
}
