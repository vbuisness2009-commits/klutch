/**
 * Scoring.
 *
 * The digital SAT is not scored by counting correct answers. College Board
 * fits an item response theory model: a three-parameter logistic for
 * multiple choice and a graded response model for student-produced response,
 * estimates the student's ability (theta) from the whole pattern of answers,
 * and puts theta through a linear transformation onto the 200 to 800 scale in
 * 10-point steps. Two students with the same number correct can score
 * differently depending on which items they got right.
 *
 * This module implements that machinery. What it does not have is calibrated
 * item parameters, which come from pretesting thousands of students. Until the
 * pool is calibrated, each item gets a provisional difficulty from its band
 * (see PROVISIONAL_B). The estimator is real; the inputs are placeholders, so
 * every score is reported with its standard error rather than as a point
 * value pretending to precision it does not have.
 */

import {
  isCorrect,
  isSpr,
  scoredItems,
  type Item,
  type Section,
  type TestForm,
  type Route,
  type SectionId,
} from "./types.ts";

/** Logistic scaling constant that makes the logistic approximate the normal ogive. */
const D = 1.702;

/** Provisional difficulty (b) per band, pending real calibration. */
const PROVISIONAL_B: Record<Item["difficulty"], number> = {
  E: -1.0,
  M: 0.0,
  H: 1.0,
};

/** Provisional discrimination. Uniform until estimated from response data. */
const PROVISIONAL_A = 1.0;

/**
 * Pseudo-guessing. A four-option multiple choice item can be guessed at 0.25.
 * Student-produced response has no options to guess among, so it is 0.
 */
function guessing(item: Item): number {
  return isSpr(item) ? 0 : 0.25;
}

export type ItemParams = { a: number; b: number; c: number };

export function paramsFor(item: Item): ItemParams {
  return {
    a: PROVISIONAL_A,
    b: PROVISIONAL_B[item.difficulty],
    c: guessing(item),
  };
}

/** Probability of a correct response under the 3PL model. */
export function pCorrect(theta: number, p: ItemParams): number {
  return p.c + (1 - p.c) / (1 + Math.exp(-D * p.a * (theta - p.b)));
}

const GRID_MIN = -4;
const GRID_MAX = 4;
const GRID_STEP = 0.05;

export type Ability = { theta: number; se: number };

/**
 * Expected a posteriori estimate of ability over a quadrature grid with a
 * standard normal prior. EAP is used rather than maximum likelihood because
 * it stays finite when a student gets everything or nothing right.
 */
export function estimateAbility(
  items: Item[],
  responses: Record<string, string>
): Ability {
  const logLik: number[] = [];
  const grid: number[] = [];

  for (let t = GRID_MIN; t <= GRID_MAX + 1e-9; t += GRID_STEP) {
    grid.push(t);
    let ll = 0;
    for (const item of items) {
      const p = Math.min(0.9999, Math.max(0.0001, pCorrect(t, paramsFor(item))));
      ll += isCorrect(item, responses[item.id]) ? Math.log(p) : Math.log(1 - p);
    }
    // Standard normal prior, up to a constant that cancels in normalization.
    logLik.push(ll - (t * t) / 2);
  }

  // Normalize in log space so long tests do not underflow to zero.
  const max = Math.max(...logLik);
  const weights = logLik.map((l) => Math.exp(l - max));
  const total = weights.reduce((s, w) => s + w, 0);

  const theta = grid.reduce((s, t, i) => s + t * weights[i], 0) / total;
  const variance =
    grid.reduce((s, t, i) => s + (t - theta) ** 2 * weights[i], 0) / total;

  return { theta, se: Math.sqrt(variance) };
}

export const SCALE_MIN = 200;
export const SCALE_MAX = 800;

/**
 * Anchors for the theta-to-scale transformation.
 *
 * A linear map with a fixed slope does not work here. An EAP estimate is
 * pulled toward the prior, so even a flawless paper lands well short of the
 * theta a fixed slope would need to reach 800, and students would cap out
 * below the top of the scale.
 *
 * Instead the scale is anchored to what the form can actually produce: the
 * ability estimate for answering everything right, and for answering nothing
 * right, on the harder route. Anchoring to the harder route on purpose means a
 * student who gets routed into the easier module 2 cannot reach 800, which is
 * the ceiling effect the real test has.
 *
 * College Board sets its slope and intercept from a concordance study and does
 * not publish them. This is a Klutch convention and is replaced by real
 * equating once the pool is calibrated.
 */
const anchorCache = new Map<string, { min: number; max: number }>();

function anchorsFor(section: Section): { min: number; max: number } {
  const cached = anchorCache.get(section.id);
  if (cached) return cached;

  const reference = scoredItems([
    ...section.module1.items,
    ...section.module2.upper.items,
  ]);

  const allRight: Record<string, string> = {};
  const allWrong: Record<string, string> = {};
  for (const item of reference) {
    if (isSpr(item)) {
      allRight[item.id] = item.accepted[0];
      allWrong[item.id] = "\u0000";
    } else {
      allRight[item.id] = item.correct;
      allWrong[item.id] = item.correct === "A" ? "B" : "A";
    }
  }

  const anchors = {
    min: estimateAbility(reference, allWrong).theta,
    max: estimateAbility(reference, allRight).theta,
  };
  anchorCache.set(section.id, anchors);
  return anchors;
}

function slopeFor(section: Section): number {
  const { min, max } = anchorsFor(section);
  return (SCALE_MAX - SCALE_MIN) / Math.max(0.5, max - min);
}

export function scaleScore(theta: number, section: Section): number {
  const { min } = anchorsFor(section);
  const raw = SCALE_MIN + slopeFor(section) * (theta - min);
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw));
  return Math.round(clamped / 10) * 10;
}

/** Standard error carried onto the scale by multiplying by the slope. */
export function scaleError(se: number, section: Section): number {
  return Math.round((se * slopeFor(section)) / 10) * 10;
}

export type SectionScore = {
  id: SectionId;
  name: string;
  route: Route;
  correct: number;
  total: number;
  theta: number;
  score: number;
  /** Plus or minus, on the scale. */
  margin: number;
};

export function scoreSection(
  section: Section,
  route: Route,
  responses: Record<string, string>
): SectionScore {
  const all = [...section.module1.items, ...section.module2[route].items];
  const scored = scoredItems(all);
  const { theta, se } = estimateAbility(scored, responses);

  return {
    id: section.id,
    name: section.name,
    route,
    correct: scored.filter((i) => isCorrect(i, responses[i.id])).length,
    total: scored.length,
    theta,
    score: scaleScore(theta, section),
    margin: Math.max(10, scaleError(se, section)),
  };
}

export type TestScore = {
  sections: SectionScore[];
  total: number;
  totalMargin: number;
};

export function scoreTest(
  form: TestForm,
  routes: Partial<Record<SectionId, Route>>,
  responses: Record<string, string>
): TestScore {
  const sections = form.sections.map((s) =>
    scoreSection(s, routes[s.id] ?? "lower", responses)
  );
  return {
    sections,
    total: sections.reduce((sum, s) => sum + s.score, 0),
    // Independent sections, so the errors add in quadrature.
    totalMargin: Math.round(
      Math.sqrt(sections.reduce((sum, s) => sum + s.margin ** 2, 0)) / 10
    ) * 10,
  };
}
