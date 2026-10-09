import { repairExtractedQuestions, repairHtml } from "./repairExtracted.ts";
import { inferPaceHeuristic } from "../testEngine/pace.ts";
import type {
  Difficulty,
  Item,
  Module,
  Section,
  SectionId,
  TestForm,
} from "../testEngine/types.ts";

export type ExtractedQuestion = {
  number?: string | number;
  section?: string;
  module?: number;
  format?: "mc" | "spr";
  difficulty?: Difficulty;
  stimulus?: string;
  stem: string;
  choices?: { label: string; content: string }[];
  correct?: string;
  accepted?: string[];
  rationale?: string;
  keySource?: "paper" | "solved" | "missing";
};

const MODULE_SIZE: Record<SectionId, number> = {
  rw: 27,
  math: 22,
};

const LETTERS = ["A", "B", "C", "D"] as const;

export type ExtractedImportResult = {
  form: TestForm;
  scorable: boolean;
  warnings: string[];
  totalQuestions: number;
  paperKeys: number;
  missingKeys: number;
};

export function sectionOf(q: ExtractedQuestion): SectionId {
  const s = String(q.section ?? "").toLowerCase();
  return s.includes("math") ? "math" : "rw";
}

function questionNumber(q: ExtractedQuestion): number | null {
  const n = Number.parseInt(String(q.number ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Determine where module 1 ends in a section.
 * Checks for numbering reset back to 1, or 50/50 cut near standard sizes (27/22).
 */
export function findModuleCut(
  questions: ExtractedQuestion[],
  sectionId: SectionId
): number {
  const n = questions.length;
  if (n <= 1) return n;

  const expected = MODULE_SIZE[sectionId];

  // If already at or under expected module 1 size, keep all in module 1
  if (n <= expected + 2) return n;

  // If roughly 2 full operational modules (27+27 or 22+22), default to expected
  if (Math.abs(n - expected * 2) <= 2) return expected;

  // Numbering restart: if question number resets back to 1
  const minProgress = Math.floor(expected * 0.6);
  for (let i = 1; i < n; i++) {
    const prev = questionNumber(questions[i - 1]);
    const cur = questionNumber(questions[i]);
    if (prev != null && cur != null && cur === 1 && prev >= minProgress) {
      return i;
    }
  }

  // Model-declared module split if reasonable
  const declared1 = questions.filter((q) => (q.module ?? 1) === 1).length;
  if (declared1 >= Math.floor(n * 0.35) && declared1 <= Math.ceil(n * 0.65)) {
    return declared1;
  }

  // Equal split fallback
  return Math.ceil(n / 2);
}

function toItem(
  q: ExtractedQuestion,
  index: number,
  idPrefix: string
): Item {
  const text = (s: string | undefined) => (s ? repairHtml(s) : "");

  const sec = sectionOf(q);
  const base = {
    id: `${idPrefix}-q${String(index + 1).padStart(3, "0")}`,
    domain: (sec === "math" ? "Algebra" : "Information and Ideas") as Item["domain"],
    skill: "Imported from PDF",
    difficulty: (q.difficulty ?? "M") as Difficulty,
    html: true,
    stimulus: q.stimulus ? text(q.stimulus) || undefined : undefined,
    stem: text(q.stem),
    rationale: q.rationale ? text(q.rationale) : "",
  };

  let item: Item;
  const isSprFormat =
    q.format === "spr" ||
    (!q.choices?.length && Array.isArray(q.accepted) && q.accepted.length > 0);

  if (isSprFormat) {
    const accepted = (q.accepted ?? [])
      .map((a) => String(a).trim())
      .filter(Boolean);
    item = {
      ...base,
      format: "spr",
      accepted,
      keySource: accepted.length > 0 ? (q.keySource ?? "paper") : "missing",
    };
  } else {
    const rawChoices = (q.choices ?? []).slice(0, 4);
    const choices = rawChoices.map((c, i) => ({
      id: LETTERS[i],
      text: text(c.content),
    }));

    // Pad to 4 choices if needed so player never crashes
    while (choices.length < 4) {
      const idx = choices.length;
      choices.push({ id: LETTERS[idx], text: `Choice ${LETTERS[idx]}` });
    }

    const cleanCorrect = String(q.correct ?? "").trim().toUpperCase();
    const correctIdx = (LETTERS as readonly string[]).indexOf(cleanCorrect);
    const hasValidKey = correctIdx >= 0;
    const correctLetter = hasValidKey ? LETTERS[correctIdx] : LETTERS[0];

    item = {
      ...base,
      format: "mc",
      choices,
      correct: correctLetter,
      keySource: hasValidKey ? (q.keySource ?? "paper") : "missing",
    };
  }

  return {
    ...item,
    expectedPace: inferPaceHeuristic(item, sec),
  };
}

export function importExtracted(
  rawQuestions: ExtractedQuestion[],
  opts: { id: string; name: string }
): ExtractedImportResult {
  if (rawQuestions.length === 0) {
    throw new Error("No questions found in the document.");
  }

  const warnings: string[] = [];
  const repaired = repairExtractedQuestions(rawQuestions);

  let paperKeys = 0;
  let missingKeys = 0;

  for (const q of repaired) {
    if (q.format === "spr") {
      if (q.accepted && q.accepted.length > 0) paperKeys++;
      else missingKeys++;
    } else {
      if (q.correct && ["A", "B", "C", "D"].includes(q.correct.toUpperCase())) paperKeys++;
      else missingKeys++;
    }
  }

  const sections: Section[] = (["rw", "math"] as const)
    .map((sectionId) => {
      const secQuestions = repaired.filter((q) => sectionOf(q) === sectionId);
      if (secQuestions.length === 0) return null;

      const items = secQuestions.map((q, i) =>
        toItem(q, i, `${opts.id}-${sectionId}`)
      );

      const cut = findModuleCut(secQuestions, sectionId);
      const m1: Module = {
        id: `${opts.id}-${sectionId}-m1`,
        items: items.slice(0, cut),
      };
      const m2: Module = {
        id: `${opts.id}-${sectionId}-m2`,
        items: items.slice(cut),
      };

      if (m2.items.length === 0) {
        warnings.push(
          `${sectionId.toUpperCase()} only has questions for a single module (${m1.items.length} questions).`
        );
      }

      const sec: Section = {
        id: sectionId,
        name: sectionId === "math" ? "Math" : "Reading and Writing",
        secondsPerModule: sectionId === "math" ? 35 * 60 : 32 * 60,
        module1: m1,
        // Linear/imported papers have one module 2 set that both routes serve
        module2: {
          lower: m2.items.length ? m2 : m1,
          upper: m2.items.length ? m2 : m1,
        },
        routeUpAt: Math.max(1, Math.round(m1.items.length * 0.6)),
      };
      return sec;
    })
    .filter((s): s is Section => s !== null);

  if (sections.length === 0) {
    throw new Error("Could not parse questions into Reading & Writing or Math sections.");
  }

  return {
    form: {
      id: opts.id,
      name: opts.name,
      breakSeconds: 10 * 60,
      sections,
    },
    scorable: missingKeys === 0,
    warnings,
    totalQuestions: repaired.length,
    paperKeys,
    missingKeys,
  };
}
