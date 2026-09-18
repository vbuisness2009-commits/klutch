/**
 * Per-item expected pace for post-test timing feedback.
 *
 * "Slow" compares the student's active time to this item's maxSec — not to
 * other items in the session. Vocab / Words-in-Context are sprint items
 * (tight bands); multi-step math and long reading are deep (wide bands).
 */

import type {
  Difficulty,
  ExpectedPace,
  Item,
  PaceProfile,
  SectionId,
  TestForm,
} from "./types";

function plain(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function band(
  minSec: number,
  maxSec: number,
  profile: PaceProfile,
  note: string,
  source: ExpectedPace["source"] = "heuristic"
): ExpectedPace {
  return {
    minSec: Math.max(5, Math.round(minSec)),
    maxSec: Math.max(Math.round(minSec) + 5, Math.round(maxSec)),
    profile,
    note,
    source,
  };
}

function bump(d: Difficulty, easy: number, mid: number, hard: number): number {
  return d === "E" ? easy : d === "H" ? hard : mid;
}

/**
 * Rule-based pace when AI has not annotated the item yet. Uses stem cues so
 * "Imported from PDF" skills still get sensible sprint vs deep bands.
 */
export function inferPaceHeuristic(
  item: Item,
  sectionId: SectionId
): ExpectedPace {
  const d = item.difficulty;
  const text = `${plain(item.stimulus ?? "")} ${plain(item.stem)}`.toLowerCase();
  const skill = (item.skill || "").toLowerCase();

  if (sectionId === "rw") {
    const vocab =
      /precise word|most nearly means|as used in the text|completes the text with the most logical and precise/.test(
        text
      ) || /words in context|vocabulary|craft and structure/.test(skill);
    if (vocab) {
      return band(
        bump(d, 8, 10, 14),
        bump(d, 18, 22, 28),
        "sprint",
        "Words in Context — sprint; 10–15s is normal, not fast"
      );
    }

    const conventions =
      /conforms to the conventions|standard english|punctuation|subject.verb/.test(
        text
      ) || /standard english|conventions/.test(skill);
    if (conventions) {
      return band(
        bump(d, 15, 20, 25),
        bump(d, 35, 45, 55),
        "sprint",
        "Standard English Conventions — quick grammar edit"
      );
    }

    const longPassage = (item.stimulus?.length ?? 0) > 600;
    if (longPassage || /according to the text|based on the text|main idea|function of/.test(text)) {
      return band(
        bump(d, 35, 45, 55),
        bump(d, 70, 85, 100),
        "deep",
        "Passage / evidence — read carefully"
      );
    }

    return band(
      bump(d, 25, 30, 40),
      bump(d, 55, 65, 80),
      "steady",
      "Reading and Writing — steady pace"
    );
  }

  // Math
  const hasFigure =
    /\[IMAGE:|scatterplot|graph|diagram|triangle|circle|xy-plane|figure/.test(
      text
    );
  const multiStep =
    /system of|in terms of|which of the following could|equivalent/.test(text);

  if (hasFigure || multiStep || d === "H") {
    return band(
      bump(d, 40, 50, 60),
      bump(d, 90, 110, 130),
      "deep",
      hasFigure
        ? "Math with figure — expect a full minute-plus"
        : "Multi-step math — deep"
    );
  }

  if (d === "E" || /what is the value of|what is one of the solutions/.test(text)) {
    return band(20, 45, "sprint", "Quick algebra / value — move on if stuck");
  }

  return band(30, 70, "steady", "Math — steady pace");
}

export function paceFor(item: Item, sectionId: SectionId): ExpectedPace {
  return item.expectedPace ?? inferPaceHeuristic(item, sectionId);
}

/** True when active time exceeds this item's expected max. */
export function isSlowAgainstPace(
  timeSec: number,
  pace: ExpectedPace
): { excessive: boolean; reason?: string } {
  if (timeSec <= 0) return { excessive: false };
  if (timeSec <= pace.maxSec) return { excessive: false };
  return {
    excessive: true,
    reason: `over ${pace.minSec}–${pace.maxSec}s target${pace.note ? ` (${pace.note})` : ""}`,
  };
}

/** Attach heuristic paces to every item missing expectedPace. */
export function ensureHeuristicPaces(form: TestForm): TestForm {
  return {
    ...form,
    sections: form.sections.map((section) => ({
      ...section,
      module1: {
        ...section.module1,
        items: section.module1.items.map((it) =>
          it.expectedPace
            ? it
            : { ...it, expectedPace: inferPaceHeuristic(it, section.id) }
        ),
      },
      module2: {
        lower: {
          ...section.module2.lower,
          items: section.module2.lower.items.map((it) =>
            it.expectedPace
              ? it
              : { ...it, expectedPace: inferPaceHeuristic(it, section.id) }
          ),
        },
        upper: {
          ...section.module2.upper,
          items: section.module2.upper.items.map((it) =>
            it.expectedPace
              ? it
              : { ...it, expectedPace: inferPaceHeuristic(it, section.id) }
          ),
        },
      },
    })),
  };
}

export const PACE_HEURISTIC_NOTE =
  "Slow means over this question's target band (set per item: sprint items like vocab are tight; deep items allow a full minute-plus). Not compared to your other answers.";
