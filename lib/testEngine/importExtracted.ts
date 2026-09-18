/**
 * Turns the output of the PDF extraction step into a TestForm.
 *
 * Unlike the Bluebook JSON path, extracted papers usually DO carry an answer
 * key, because the source PDF prints one. That is the whole reason this route
 * is worth having: it produces scoreable tests.
 *
 * Module labels from the model are unreliable across concurrent page chunks,
 * so assignment is repaired from question-number restarts before the form is
 * built. A digital SAT always restarts numbering at 1 when module 2 begins.
 */

import { applyCrops } from "@/lib/pdf/extractPrompt";
import {
  repairExtractedQuestions,
  repairHtmlAfterCrops,
} from "@/lib/pdf/repairExtracted";
import { inferPaceHeuristic } from "./pace";
import type {
  Difficulty,
  Item,
  Module,
  MultipleChoiceItem,
  Section,
  SectionId,
  SprItem,
  TestForm,
} from "./types";

export type ExtractedQuestion = {
  number?: string;
  section?: string;
  module?: number;
  format?: "mc" | "spr";
  difficulty?: Difficulty;
  stimulus?: string;
  stem?: string;
  choices?: { label: string; content: string }[];
  correct?: string;
  accepted?: string[];
  rationale?: string;
  /**
   * "paper" when the PDF printed the answer, "solved" when the model worked it
   * out. Blank papers produce solved keys, which are useful but fallible, so
   * they are surfaced rather than silently trusted.
   */
  keySource?: "paper" | "solved";
};

/** Expected operational counts for a digital SAT module. */
const MODULE_SIZE: Record<SectionId, number> = {
  rw: 27,
  math: 22,
};

export type ExtractedImportResult = {
  form: TestForm;
  scorable: boolean;
  warnings: string[];
};

const LETTERS = ["A", "B", "C", "D"] as const;

function sectionOf(q: ExtractedQuestion): SectionId {
  return /math/i.test(q.section ?? "") ? "math" : "rw";
}

function questionNumber(q: ExtractedQuestion): number | null {
  const n = Number.parseInt(String(q.number ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Find where module 1 ends inside one section.
 *
 * Vision labels drift after the first few module-2 pages, so we do not trust
 * a lopsided declared split. Preferred signals, in order:
 *   1. Section length matches two operational modules (27+27 / 22+22).
 *   2. Question numbering restarts at 1 after most of a module.
 *   3. Model labels, but only when they land near a 50/50 cut.
 *   4. Equal half.
 */
export function findModuleCut(
  questions: ExtractedQuestion[],
  sectionId: SectionId
): number {
  const n = questions.length;
  if (n <= 1) return n;

  const expected = MODULE_SIZE[sectionId];

  // One module (or less): keep everything in module 1.
  if (n <= expected + 2) return n;

  // Two clean operational modules, allow ±2 stray/missing items.
  if (Math.abs(n - expected * 2) <= 2) return expected;

  // Numbering restart: after enough of module 1, the next item is #1 again.
  // Ignore mid-module OCR glitches (e.g. a stray "1" between 11 and 12).
  const minProgress = Math.floor(expected * 0.7);
  for (let i = 1; i < n; i++) {
    const prev = questionNumber(questions[i - 1]);
    const cur = questionNumber(questions[i]);
    if (prev == null || cur == null) continue;
    if (i < minProgress || prev < minProgress) continue;
    if (cur === 1 && prev > cur) return i;
  }

  // Trust the model only when its cut is roughly balanced.
  const declared1 = questions.filter((q) => (q.module ?? 1) === 1).length;
  if (declared1 >= Math.floor(n * 0.4) && declared1 <= Math.ceil(n * 0.6)) {
    return declared1;
  }

  return Math.ceil(n / 2);
}

function toItem(
  q: ExtractedQuestion,
  index: number,
  id: string,
  crops: Record<string, string>
): Item {
  const text = (s: string | undefined) => {
    if (!s) return "";
    return repairHtmlAfterCrops(applyCrops(s, crops));
  };

  const base = {
    id: `${id}-q${String(index + 1).padStart(3, "0")}`,
    domain: (sectionOf(q) === "math"
      ? "Algebra"
      : "Information and Ideas") as Item["domain"],
    skill: "Imported from PDF",
    difficulty: (q.difficulty ?? "M") as Difficulty,
    html: true,
    stimulus: q.stimulus ? text(q.stimulus) || undefined : undefined,
    stem: text(q.stem),
    rationale: text(q.rationale),
  };

  let item: Item;
  if (q.format === "spr" || (!q.choices?.length && q.accepted?.length)) {
    item = {
      ...base,
      format: "spr",
      accepted: (q.accepted ?? []).map((a) => String(a)),
    };
  } else {
    const choices = (q.choices ?? []).slice(0, 4);
    const correctIdx = choices.findIndex(
      (c) => c.label?.toUpperCase() === q.correct?.toUpperCase()
    );
    item = {
      ...base,
      format: "mc",
      choices: choices.map((c, i) => ({
        id: LETTERS[i],
        text: text(c.content),
      })),
      correct: LETTERS[correctIdx >= 0 ? correctIdx : 0],
    };
  }

  return {
    ...item,
    expectedPace: inferPaceHeuristic(item, sectionOf(q)),
  };
}

function hasKey(q: ExtractedQuestion): boolean {
  if (q.format === "spr") return Boolean(q.accepted?.length);
  return Boolean(q.correct);
}

export function importExtracted(
  questions: ExtractedQuestion[],
  opts: { id: string; name: string; crops?: Record<string, string> }
): ExtractedImportResult {
  if (questions.length === 0) {
    throw new Error("The extraction returned no questions.");
  }

  const crops = opts.crops ?? {};
  const warnings: string[] = [];
  // Always re-run extract repairs so stored/admin payloads get math + figure fixes.
  const repaired = repairExtractedQuestions(questions);

  const missingKey = repaired.filter((q) => !hasKey(q)).length;
  if (missingKey > 0) {
    warnings.push(
      `${missingKey} of ${repaired.length} questions have no answer key and will always count as wrong.`
    );
  }

  const solved = repaired.filter(
    (q) => hasKey(q) && q.keySource === "solved"
  ).length;
  if (solved > 0) {
    warnings.push(
      `${solved} answers were worked out by the model because the paper printed no key. Spot-check them before trusting a score.`
    );
  }

  const sections: Section[] = (["rw", "math"] as const)
    .map((sectionId) => {
      const mine = repaired.filter((q) => sectionOf(q) === sectionId);
      if (mine.length === 0) return null;

      const items = mine.map((q, i) => toItem(q, i, `${opts.id}-${sectionId}`, crops));

      const cut = findModuleCut(mine, sectionId);
      const m1: Module = { id: `${opts.id}-${sectionId}-m1`, items: items.slice(0, cut) };
      const m2: Module = { id: `${opts.id}-${sectionId}-m2`, items: items.slice(cut) };

      const expected = MODULE_SIZE[sectionId];
      if (cut > 0 && m2.items.length > 0) {
        const model1 = mine.filter((q) => (q.module ?? 1) === 1).length;
        if (model1 !== cut) {
          warnings.push(
            `${sectionId.toUpperCase()} module split repaired to ${cut}+${m2.items.length} (model had labeled ${model1}+${mine.length - model1}).`
          );
        } else if (
          Math.abs(cut - expected) > 2 ||
          Math.abs(m2.items.length - expected) > 2
        ) {
          warnings.push(
            `${sectionId.toUpperCase()} modules are ${cut}+${m2.items.length}; operational SAT size is ${expected}+${expected}.`
          );
        }
      }

      if (m2.items.length === 0) {
        warnings.push(
          `${sectionId.toUpperCase()} has only enough questions for one module.`
        );
      }

      const section: Section = {
        id: sectionId,
        name: sectionId === "math" ? "Math" : "Reading and Writing",
        secondsPerModule: sectionId === "math" ? 35 * 60 : 32 * 60,
        module1: m1,
        // Linear papers have one second module, so both routes serve it.
        module2: {
          lower: m2.items.length ? m2 : m1,
          upper: m2.items.length ? m2 : m1,
        },
        routeUpAt: Math.max(1, Math.round(m1.items.length * 0.6)),
      };
      return section;
    })
    .filter((s): s is Section => s !== null);

  if (sections.length === 0) {
    throw new Error("Could not place any questions into a section.");
  }

  return {
    form: { id: opts.id, name: opts.name, breakSeconds: 10 * 60, sections },
    scorable: missingKey === 0,
    warnings,
  };
}
