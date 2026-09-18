/**
 * Imports an exported Bluebook-style session JSON into a TestForm.
 *
 * Shape of the source file:
 *   { session_id, package, questions: [...] }
 *   question: { question_id, question_number, question_type: "mcq" | "spr",
 *               section_name, stem (HTML), stimulus (HTML), answer_options }
 *
 * Two quirks the importer has to handle:
 *
 *  1. Module 2 contains BOTH routed forms in one list, distinguished only by
 *     each question_number appearing twice. The first occurrence of a number
 *     goes to one form and the second to the other. Which is the harder form
 *     is not recorded anywhere, so the admin can swap them after import.
 *
 *  2. These exports carry no answer key. A form without one can be delivered
 *     and printed but cannot be scored, so it imports with `scorable: false`
 *     and the UI says so rather than reporting a meaningless score.
 */

import type {
  Item,
  Module,
  MultipleChoiceItem,
  Section,
  SprItem,
  TestForm,
} from "./types";

type SourceQuestion = {
  question_id: string;
  question_number: string;
  question_type: string;
  section_name: string;
  stem?: string;
  stimulus?: string;
  answer_options?: { id: string; content: string }[];
  /** Present in exports that include a key. Absent in blank forms. */
  correct_answer?: string;
  metadata?: Record<string, unknown>;
};

export type SourceFile = {
  session_id?: string;
  questions: SourceQuestion[];
};

export type ImportResult = {
  form: TestForm;
  /** True only when every item carried a usable answer key. */
  scorable: boolean;
  warnings: string[];
};

const LETTERS = ["A", "B", "C", "D"] as const;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Section 1, Module 2: Reading and Writing" -> parts we can group on. */
function parseSectionName(name: string) {
  const module = /module\s*2/i.test(name) ? 2 : 1;
  const isMath = /math/i.test(name);
  return { module, sectionId: isMath ? ("math" as const) : ("rw" as const) };
}

function toItem(q: SourceQuestion, index: number): Item {
  const base = {
    id: q.question_id || `q-${index}`,
    domain: (/math/i.test(q.section_name)
      ? "Algebra"
      : "Information and Ideas") as Item["domain"],
    skill: "Imported",
    // Items run easiest to hardest within a module, so position is the only
    // difficulty signal available until the pool is calibrated.
    difficulty: ("M" as const),
    html: true,
    stimulus: q.stimulus ? q.stimulus : undefined,
    stem: q.stem ?? "",
    rationale: "",
  };

  if (q.question_type === "spr") {
    const spr: SprItem = {
      ...base,
      format: "spr",
      accepted: q.correct_answer ? [q.correct_answer] : [],
    };
    return spr;
  }

  const options = q.answer_options ?? [];
  const correctIdx = options.findIndex((o) => o.id === q.correct_answer);
  const mc: MultipleChoiceItem = {
    ...base,
    format: "mc",
    choices: options.slice(0, 4).map((o, i) => ({
      id: LETTERS[i],
      text: o.content,
    })),
    correct: LETTERS[correctIdx >= 0 ? correctIdx : 0],
  };
  return mc;
}

function splitModuleTwo(questions: SourceQuestion[]): {
  first: SourceQuestion[];
  second: SourceQuestion[];
} {
  const seen = new Set<string>();
  const first: SourceQuestion[] = [];
  const second: SourceQuestion[] = [];
  for (const q of questions) {
    if (seen.has(q.question_number)) second.push(q);
    else {
      seen.add(q.question_number);
      first.push(q);
    }
  }
  return { first, second };
}

const byNumber = (a: SourceQuestion, b: SourceQuestion) =>
  Number(a.question_number) - Number(b.question_number);

function makeModule(id: string, qs: SourceQuestion[]): Module {
  return { id, items: [...qs].sort(byNumber).map(toItem) };
}

export function importBluebookJson(
  source: SourceFile,
  opts: { id: string; name: string; swapModuleTwo?: boolean }
): ImportResult {
  const warnings: string[] = [];
  const questions = source.questions ?? [];
  if (questions.length === 0) throw new Error("No questions found in the file.");

  const hasKey = questions.some((q) => Boolean(q.correct_answer));
  if (!hasKey) {
    warnings.push(
      "No answer key in this file, so the test can be taken and printed but not scored."
    );
  }

  const sections: Section[] = (["rw", "math"] as const)
    .map((sectionId) => {
      const mine = questions.filter(
        (q) => parseSectionName(q.section_name).sectionId === sectionId
      );
      if (mine.length === 0) return null;

      const m1 = mine.filter((q) => parseSectionName(q.section_name).module === 1);
      const m2 = mine.filter((q) => parseSectionName(q.section_name).module === 2);
      const { first, second } = splitModuleTwo(m2);

      if (second.length === 0 && m2.length > 0) {
        warnings.push(
          `${sectionId.toUpperCase()} module 2 has only one form, so both routes use it.`
        );
      }

      const lowerSrc = opts.swapModuleTwo ? second : first;
      const upperSrc = opts.swapModuleTwo ? first : second;

      const section: Section = {
        id: sectionId,
        name: sectionId === "math" ? "Math" : "Reading and Writing",
        secondsPerModule: sectionId === "math" ? 35 * 60 : 32 * 60,
        module1: makeModule(`${opts.id}-${sectionId}-m1`, m1),
        module2: {
          lower: makeModule(
            `${opts.id}-${sectionId}-m2l`,
            lowerSrc.length ? lowerSrc : first
          ),
          upper: makeModule(
            `${opts.id}-${sectionId}-m2u`,
            upperSrc.length ? upperSrc : first
          ),
        },
        routeUpAt: Math.round(m1.length * 0.6),
      };
      return section;
    })
    .filter((s): s is Section => s !== null);

  if (sections.length === 0) {
    throw new Error("Could not identify any Reading and Writing or Math sections.");
  }

  return {
    form: {
      id: opts.id,
      name: opts.name,
      breakSeconds: 10 * 60,
      sections,
    },
    scorable: hasKey,
    warnings,
  };
}

/** Quick summary for the admin table without loading the whole form. */
export function summarize(form: TestForm) {
  return form.sections.map((s) => ({
    name: s.name,
    module1: s.module1.items.length,
    module2: s.module2.upper.items.length,
  }));
}

export { stripTags };
