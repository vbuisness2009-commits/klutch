/**
 * Post-test session analytics.
 *
 * "Slow" is judged against each item's expectedPace band (AI or heuristic),
 * not against the student's session median — otherwise 2s clicks look "slow"
 * when the module median collapses in a short run.
 */

import {
  isCorrect,
  scoredItems,
  type Domain,
  type Difficulty,
  type ExpectedPace,
  type Item,
  type Route,
  type SectionId,
  type TestForm,
} from "./types";
import { scoreTest, type TestScore } from "./scoring";
import {
  PACE_HEURISTIC_NOTE,
  isSlowAgainstPace,
  paceFor,
} from "./pace";

export type ItemAnalytics = {
  itemId: string;
  sectionId: SectionId;
  sectionName: string;
  moduleNum: 1 | 2;
  moduleId: string;
  route?: Route;
  numberInModule: number;
  domain: Domain;
  skill: string;
  difficulty: Difficulty;
  format: "mc" | "spr";
  pretest: boolean;
  response?: string;
  correct: boolean | null;
  flagged: boolean;
  /** Active seconds spent on this item while it was displayed. */
  timeSec: number;
  answerChanges: number;
  excessive: boolean;
  /** Why it was flagged slow, if excessive. */
  excessiveReason?: string;
  expectedPace: ExpectedPace;
};

export type SessionAnalytics = {
  formId: string;
  formName: string;
  routes: Partial<Record<SectionId, Route>>;
  score: TestScore | null;
  items: ItemAnalytics[];
  totals: {
    timeSec: number;
    answered: number;
    correct: number;
    incorrect: number;
    blank: number;
    flagged: number;
    excessive: number;
  };
};

export type FeedbackItemPayload = {
  itemId: string;
  sectionId: SectionId;
  moduleNum: 1 | 2;
  route?: Route;
  numberInModule: number;
  domain: Domain;
  skill: string;
  difficulty: Difficulty;
  format: "mc" | "spr";
  pretest: boolean;
  response?: string;
  correct: boolean | null;
  flagged: boolean;
  timeSec: number;
  answerChanges: number;
  excessive: boolean;
  excessiveReason?: string;
  expectedMinSec: number;
  expectedMaxSec: number;
  paceProfile: ExpectedPace["profile"];
  paceNote?: string;
  /** Optional short stem snippet already in client state — never full copyrighted text. */
  stemSnippet?: string;
};

/** Compact payload sent to the feedback / chat API (no full stems by default). */
export type FeedbackPayload = {
  formId: string;
  formName: string;
  routes: Partial<Record<SectionId, Route>>;
  score: TestScore | null;
  items: FeedbackItemPayload[];
  totals: SessionAnalytics["totals"];
  heuristicNote: string;
};

export const HEURISTIC_NOTE = PACE_HEURISTIC_NOTE;

type BuildArgs = {
  form: TestForm;
  routes: Partial<Record<SectionId, Route>>;
  responses: Record<string, string>;
  flags: Record<string, boolean>;
  /** Accumulated active seconds per item id. */
  itemTimes: Record<string, number>;
  /** Times the student changed an already-set answer. */
  answerChanges: Record<string, number>;
  scorable?: boolean;
};

export function buildSessionAnalytics({
  form,
  routes,
  responses,
  flags,
  itemTimes,
  answerChanges,
  scorable = true,
}: BuildArgs): SessionAnalytics {
  const items: ItemAnalytics[] = [];

  for (const section of form.sections) {
    const route = routes[section.id] ?? "lower";
    const modules: {
      moduleNum: 1 | 2;
      mod: typeof section.module1;
      route?: Route;
    }[] = [
      { moduleNum: 1, mod: section.module1 },
      { moduleNum: 2, mod: section.module2[route], route },
    ];

    for (const { moduleNum, mod, route: modRoute } of modules) {
      mod.items.forEach((item, idx) => {
        const timeSec = Math.round(itemTimes[item.id] ?? 0);
        const response = responses[item.id];
        const answered = Boolean(response);
        const correct = item.pretest
          ? null
          : answered
            ? isCorrect(item, response)
            : false;
        const expectedPace = paceFor(item, section.id);
        const { excessive, reason } = isSlowAgainstPace(timeSec, expectedPace);

        items.push({
          itemId: item.id,
          sectionId: section.id,
          sectionName: section.name,
          moduleNum,
          moduleId: mod.id,
          route: modRoute,
          numberInModule: idx + 1,
          domain: item.domain,
          skill: item.skill,
          difficulty: item.difficulty,
          format: item.format,
          pretest: Boolean(item.pretest),
          response,
          correct,
          flagged: Boolean(flags[item.id]),
          timeSec,
          answerChanges: answerChanges[item.id] ?? 0,
          excessive,
          excessiveReason: reason,
          expectedPace,
        });
      });
    }
  }

  const scored = items.filter((i) => !i.pretest);
  const answered = scored.filter((i) => i.response);
  const correct = scored.filter((i) => i.correct === true);
  const blank = scored.filter((i) => !i.response);

  return {
    formId: form.id,
    formName: form.name,
    routes,
    score: scorable ? scoreTest(form, routes, responses) : null,
    items,
    totals: {
      timeSec: items.reduce((s, i) => s + i.timeSec, 0),
      answered: answered.length,
      correct: correct.length,
      incorrect: scored.length - correct.length - blank.length,
      blank: blank.length,
      flagged: items.filter((i) => i.flagged).length,
      excessive: items.filter((i) => i.excessive).length,
    },
  };
}

/** Strip to the compact shape the coaching API expects. */
export function toFeedbackPayload(
  analytics: SessionAnalytics,
  stemSnippets?: Record<string, string>
): FeedbackPayload {
  return {
    formId: analytics.formId,
    formName: analytics.formName,
    routes: analytics.routes,
    score: analytics.score,
    totals: analytics.totals,
    heuristicNote: HEURISTIC_NOTE,
    items: analytics.items.map((i) => ({
      itemId: i.itemId,
      sectionId: i.sectionId,
      moduleNum: i.moduleNum,
      route: i.route,
      numberInModule: i.numberInModule,
      domain: i.domain,
      skill: i.skill,
      difficulty: i.difficulty,
      format: i.format,
      pretest: i.pretest,
      response: i.response,
      correct: i.correct,
      flagged: i.flagged,
      timeSec: i.timeSec,
      answerChanges: i.answerChanges,
      excessive: i.excessive,
      excessiveReason: i.excessiveReason,
      expectedMinSec: i.expectedPace.minSec,
      expectedMaxSec: i.expectedPace.maxSec,
      paceProfile: i.expectedPace.profile,
      paceNote: i.expectedPace.note,
      stemSnippet: stemSnippets?.[i.itemId],
    })),
  };
}

/** Short plain-text snippet for coaching context (avoids shipping full stems). */
export function stemSnippet(item: Item, max = 80): string {
  const raw = item.stem.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
}

/** Items the student actually saw on their route (for UI tables). */
export function itemsOnRoute(
  form: TestForm,
  routes: Partial<Record<SectionId, Route>>
): Item[] {
  return form.sections.flatMap((s) => {
    const route = routes[s.id] ?? "lower";
    return [...s.module1.items, ...s.module2[route].items];
  });
}

export { scoredItems };
