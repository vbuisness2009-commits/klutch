import "server-only";

import { FORMS } from "./practiceFormA";
import { getTest } from "./store";
import { ensureHeuristicPaces } from "./pace";
import {
  isCorrect,
  scoredItems,
  type Item,
  type MultipleChoiceItem,
  type Route,
  type SectionId,
  type TestForm,
} from "./types";

/**
 * Answer keys stay on the server. The player gets a redacted form; routing is
 * decided here, and keys are only returned once the student has finished.
 */

/**
 * Published tests are playable by anyone; unpublished ones only when the
 * caller has verified an admin session (preview from the hub).
 */
export async function loadPlayableForm(
  id: string,
  opts: { admin?: boolean } = {}
): Promise<{
  form: TestForm;
  scorable: boolean;
  builtIn: boolean;
  published: boolean;
} | null> {
  const builtIn = FORMS[id];
  if (builtIn) {
    return { form: ensureHeuristicPaces(builtIn), scorable: true, builtIn: true, published: true };
  }
  const stored = await getTest(id).catch(() => null);
  if (!stored || (!stored.published && !opts.admin)) return null;
  return {
    form: ensureHeuristicPaces(stored.form),
    scorable: stored.scorable,
    builtIn: false,
    published: stored.published,
  };
}

function redactItem(item: Item): Item {
  const { rationale: _r, solutions: _s, distractorNotes: _d, keySource: _k, ...rest } = item;
  void _r, _s, _d, _k;
  if (rest.format === "spr") return { ...rest, accepted: [], rationale: "" };
  // Empty string never matches a response, so client code can't score with it.
  return { ...rest, correct: "" as MultipleChoiceItem["correct"], rationale: "" };
}

export function redactForm(form: TestForm): TestForm {
  return {
    ...form,
    sections: form.sections.map((s) => ({
      ...s,
      module1: { ...s.module1, items: s.module1.items.map(redactItem) },
      module2: {
        lower: { ...s.module2.lower, items: s.module2.lower.items.map(redactItem) },
        upper: { ...s.module2.upper, items: s.module2.upper.items.map(redactItem) },
      },
    })),
  };
}

/** Module 1 performance picks the module 2 form. Scored items only. */
export function routeFor(
  form: TestForm,
  sectionId: SectionId,
  responses: Record<string, string>
): Route {
  const section = form.sections.find((s) => s.id === sectionId);
  if (!section) return "lower";
  const correct = scoredItems(section.module1.items).filter((it) =>
    isCorrect(it, responses[it.id])
  ).length;
  return correct >= section.routeUpAt ? "upper" : "lower";
}

/**
 * Keyed form limited to the modules the student actually sat, and only for
 * questions they answered. Blank questions score as wrong either way, so
 * withholding their keys doesn't change the result.
 */
export function keyedFormForRoutes(
  form: TestForm,
  routes: Partial<Record<SectionId, Route>>,
  responses: Record<string, string>
): TestForm {
  const reveal = (items: Item[]) =>
    items.map((it) => (responses[it.id]?.trim() ? it : redactItem(it)));
  return {
    ...form,
    sections: form.sections.map((s) => {
      const taken = routes[s.id] ?? "lower";
      const skipped: Route = taken === "upper" ? "lower" : "upper";
      const played = { ...s.module2[taken], items: reveal(s.module2[taken].items) };
      const blanked = {
        ...s.module2[skipped],
        items: s.module2[skipped].items.map(redactItem),
      };
      return {
        ...s,
        module1: { ...s.module1, items: reveal(s.module1.items) },
        module2: taken === "upper"
          ? { upper: played, lower: blanked }
          : { lower: played, upper: blanked },
      };
    }),
  };
}
