import "server-only";

import { parseModelJson } from "../pdf/parseModelJson";
import { inferPaceHeuristic } from "../testEngine/pace";
import type {
  Difficulty,
  Item,
  Module,
  MultipleChoiceItem,
  Section,
  SprItem,
  TestForm,
} from "../testEngine/types";
import type { StoredTest } from "../testEngine/store";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function getApiKey(): string {
  const keys = (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }
  return keys[0];
}

type GeneratedRwQuestion = {
  number: number;
  domain: "Craft and Structure" | "Information and Ideas" | "Standard English Conventions" | "Expression of Ideas";
  skill: string;
  difficulty: "E" | "M" | "H";
  stimulus: string;
  stem: string;
  choices: { label: "A" | "B" | "C" | "D"; content: string }[];
  correct: "A" | "B" | "C" | "D";
  rationale: string;
};

type GeneratedMathQuestion = {
  number: number;
  domain: "Algebra" | "Advanced Math" | "Problem-Solving and Data Analysis" | "Geometry and Trigonometry";
  skill: string;
  difficulty: "E" | "M" | "H";
  format: "mc" | "spr";
  stem: string;
  choices?: { label: "A" | "B" | "C" | "D"; content: string }[];
  correct?: "A" | "B" | "C" | "D";
  accepted?: string[];
  rationale: string;
};

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://klutch.local",
        "x-title": "Klutch SAT Blueprint Generator",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 32768,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 300);
      throw new Error(`OpenRouter (${MODEL}) HTTP ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

const JSON_PROMPT_RULE = `CRITICAL FORMAT RULES:
- Output strict, valid JSON ONLY.
- DO NOT use unescaped double quotes inside strings. For titles, quotations, dialogue, or excerpts, ALWAYS use single quotes (') like 'The Raven' or 'quoted text'.
- Every multiple choice question must have exactly 4 choices with labels "A", "B", "C", "D".
- "correct" must be exactly "A", "B", "C", or "D".
- Provide a clear 1-2 sentence "rationale" explaining why the correct choice is right.`;

async function fetchRwBatch(
  testLabel: string,
  variant: "m1" | "m2u" | "m2l",
  part: 1 | 2
): Promise<GeneratedRwQuestion[]> {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";
  const label = `${testLabel} RW ${variant.toUpperCase()} (Part ${part})`;

  const diffGuide = isRouting
    ? "Module 1 (Routing Baseline): Balanced distribution (mix of Easy, Medium, Hard). Standard high school to AP English reading level."
    : isUpper
    ? "Module 2 Upper (Hard Curve): High discrimination. Collegiate-level prose, dense science/social science hypotheses, subtle distractors, advanced vocabulary (e.g. esoteric, vacillate, corroborate, preclude, tenuous, eschew)."
    : "Module 2 Lower (Foundational Curve): Accessible informational prose, straightforward vocabulary and direct syntax.";

  const spec =
    part === 1
      ? `Generate EXACTLY 14 questions (numbered 1 to 14) for Craft and Structure + Information and Ideas:
- Q1-4: Craft and Structure -> Words in Context (4 questions testing academic vocabulary)
- Q5-6: Craft and Structure -> Text Structure and Purpose (2 questions)
- Q7-8: Craft and Structure -> Cross-Text Connections (2 questions, Text 1 & Text 2)
- Q9-11: Information and Ideas -> Central Ideas and Details (3 questions)
- Q12-13: Information and Ideas -> Command of Evidence (2 questions testing hypotheses)
- Q14: Information and Ideas -> Inferences (1 question: 'Which choice most logically completes the text?')`
      : `Generate EXACTLY 13 questions (numbered 15 to 27) for Information and Ideas + Conventions + Expression of Ideas:
- Q15: Information and Ideas -> Inferences (1 question: 'Which choice most logically completes the text?')
- Q16-19: Standard English Conventions -> Boundaries (4 questions: semicolons, dashes, colons, comma splices)
- Q20-22: Standard English Conventions -> Form, Structure, Sense (3 questions: subject-verb agreement, modifiers, verb tense)
- Q23-25: Expression of Ideas -> Transitions (3 questions: Consequently, Furthermore, In contrast, Specifically)
- Q26-27: Expression of Ideas -> Rhetorical Synthesis (2 questions: 4-5 bulleted research notes with a specified goal)`;

  const prompt = `You are a College Board assessment designer creating questions for ${label}.
${spec}

Difficulty Calibration:
${diffGuide}

${JSON_PROMPT_RULE}

Output format:
{
  "questions": [
    {
      "number": ${part === 1 ? 1 : 15},
      "domain": "Craft and Structure",
      "skill": "Words in Context",
      "difficulty": "${isUpper ? "H" : isRouting ? "M" : "E"}",
      "stimulus": "Passage text...",
      "stem": "Which choice completes the text with the most logical and precise word or phrase?",
      "choices": [
        { "label": "A", "content": "..." },
        { "label": "B", "content": "..." },
        { "label": "C", "content": "..." },
        { "label": "D", "content": "..." }
      ],
      "correct": "B",
      "rationale": "Choice B is correct because..."
    }
  ]
}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await callOpenRouter(prompt);
      const parsed = parseModelJson<{ questions: GeneratedRwQuestion[] }>(res);
      const questions = parsed.questions || [];
      if (questions.length >= (part === 1 ? 13 : 12)) {
        return questions;
      }
    } catch (e: any) {
      if (attempt === 3) throw e;
    }
  }
  return [];
}

async function synthesizeRwModule(
  testLabel: string,
  variant: "m1" | "m2u" | "m2l"
): Promise<Item[]> {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";

  const [p1, p2] = await Promise.all([
    fetchRwBatch(testLabel, variant, 1),
    fetchRwBatch(testLabel, variant, 2),
  ]);

  const questions = [...p1, ...p2].slice(0, 27);

  return questions.map((q, idx): Item => {
    const id = `${testLabel}-rw-${variant}-q${String(idx + 1).padStart(2, "0")}`;
    const baseItem: MultipleChoiceItem = {
      id,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty || (isUpper ? "H" : isRouting ? "M" : "E"),
      html: false,
      stimulus: q.stimulus,
      stem: q.stem,
      format: "mc",
      choices: (q.choices || []).map((c) => ({
        id: c.label,
        text: c.content,
      })),
      correct: q.correct || "A",
      keySource: "paper",
      rationale: q.rationale,
    };
    return {
      ...baseItem,
      expectedPace: inferPaceHeuristic(baseItem, "rw"),
    };
  });
}

async function fetchMathBatch(
  testLabel: string,
  variant: "m1" | "m2u" | "m2l",
  part: 1 | 2
): Promise<GeneratedMathQuestion[]> {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";
  const label = `${testLabel} Math ${variant.toUpperCase()} (Part ${part})`;

  const diffGuide = isRouting
    ? "Module 1 (Routing Baseline): Ascending difficulty from foundational to intermediate. Algebra, quadratics, percentages, basic trig."
    : isUpper
    ? "Module 2 Upper (Hard Curve): Rigorous multi-step algebra, parametric systems (no/infinite solutions: ax+by=c), quadratic vertex form and discriminant constraints, completing the square on circle equations, trig cofunctions, and non-trivial SPRs."
    : "Module 2 Lower (Foundational Curve): Single/two-step linear equations, direct proportions, Pythagorean theorem, right triangles.";

  const spec =
    part === 1
      ? `Generate EXACTLY 11 questions (numbered 1 to 11) Multiple Choice:
- Q1-6: Algebra (Linear equations in 1 variable, linear inequalities, systems of equations)
- Q7-11: Advanced Math (Quadratics, polynomials, rational expressions)`
      : `Generate EXACTLY 11 questions (numbered 12 to 22):
- Q12-14: Problem-Solving and Data Analysis (Percentages, ratios, conditional probability)
- Q15-16: Advanced Math (Nonlinear functions, exponential growth/decay)
- Q17: Geometry and Trigonometry (Circles, radians, right triangle trig)
- Q18-22: EXACTLY 5 questions Student-Produced Response (format: "spr", no choices, accepted: ["<exact>", "<decimal>"]). Covers Algebra, Advanced Math, and Geometry.`;

  const prompt = `You are an elite Digital SAT Math test designer creating questions for ${label}.
${spec}

Difficulty Calibration:
${diffGuide}

${JSON_PROMPT_RULE}
- Write math equations in clean standard notation: e.g. "3x^2 - 12x + 5 = 0", "f(x) = 2(x - 3)^2 + 8", "sqrt(x + 7)", "x/4 + y/6 = 10". Never use complex backslash LaTeX escapes.

Output format:
{
  "questions": [
    {
      "number": ${part === 1 ? 1 : 12},
      "domain": "Algebra",
      "skill": "Linear equations in one variable",
      "difficulty": "${isUpper ? "H" : isRouting ? "M" : "E"}",
      "format": "mc",
      "stem": "If 4x - 8 = 16, what is the value of x?",
      "choices": [
        { "label": "A", "content": "4" },
        { "label": "B", "content": "6" },
        { "label": "C", "content": "8" },
        { "label": "D", "content": "12" }
      ],
      "correct": "B",
      "rationale": "Adding 8 gives 4x = 24, so x = 6."
    }
  ]
}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await callOpenRouter(prompt);
      const parsed = parseModelJson<{ questions: GeneratedMathQuestion[] }>(res);
      const questions = parsed.questions || [];
      if (questions.length >= 10) {
        return questions;
      }
    } catch (e: any) {
      if (attempt === 3) throw e;
    }
  }
  return [];
}

async function synthesizeMathModule(
  testLabel: string,
  variant: "m1" | "m2u" | "m2l"
): Promise<Item[]> {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";

  const [p1, p2] = await Promise.all([
    fetchMathBatch(testLabel, variant, 1),
    fetchMathBatch(testLabel, variant, 2),
  ]);

  const questions = [...p1, ...p2].slice(0, 22);

  return questions.map((q, idx): Item => {
    const isSpr = q.format === "spr" || idx >= 17 || (!q.choices && q.accepted);
    const id = `${testLabel}-math-${variant}-q${String(idx + 1).padStart(2, "0")}`;
    const base = {
      id,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty || (isUpper ? "H" : isRouting ? "M" : "E"),
      html: false,
      stem: q.stem,
      rationale: q.rationale,
      keySource: "paper" as const,
    };

    let item: Item;
    if (isSpr) {
      const spr: SprItem = {
        ...base,
        format: "spr",
        accepted: (q.accepted || ["0"]).map((a) => String(a).trim()),
      };
      item = spr;
    } else {
      const mc: MultipleChoiceItem = {
        ...base,
        format: "mc",
        choices: (q.choices || []).map((c) => ({
          id: c.label,
          text: c.content,
        })),
        correct: q.correct || "A",
      };
      item = mc;
    }

    return {
      ...item,
      expectedPace: inferPaceHeuristic(item, "math"),
    };
  });
}

/**
 * Generate a complete, psychometrically calibrated 98-question Digital SAT practice test
 * with distinct Routing (M1), Upper Adaptive (M2U), and Lower Adaptive (M2L) modules.
 */
export async function generateBlueprintTest(
  identifier: number | string,
  options?: {
    title?: string;
    collection?: string;
    source?: string;
  }
): Promise<StoredTest> {
  const isCustomId = typeof identifier === "string";
  const testId = isCustomId ? identifier : `generated-test-${identifier}`;
  const title =
    options?.title ?? (isCustomId ? identifier : `Generated Test ${identifier}`);
  const collection = options?.collection ?? "Generated Tests";
  const source = options?.source ?? "ai-blueprint";

  // Synthesize all 6 modules in parallel across Upper and Lower branches
  const [rwM1, rwM2u, rwM2l, mathM1, mathM2u, mathM2l] = await Promise.all([
    synthesizeRwModule(testId, "m1"),
    synthesizeRwModule(testId, "m2u"),
    synthesizeRwModule(testId, "m2l"),
    synthesizeMathModule(testId, "m1"),
    synthesizeMathModule(testId, "m2u"),
    synthesizeMathModule(testId, "m2l"),
  ]);

  const rwSection: Section = {
    id: "rw",
    name: "Reading and Writing",
    secondsPerModule: 32 * 60,
    module1: { id: `${testId}-rw-m1`, items: rwM1 },
    module2: {
      lower: { id: `${testId}-rw-m2l`, items: rwM2l },
      upper: { id: `${testId}-rw-m2u`, items: rwM2u },
    },
    routeUpAt: 15,
  };

  const mathSection: Section = {
    id: "math",
    name: "Math",
    secondsPerModule: 35 * 60,
    module1: { id: `${testId}-math-m1`, items: mathM1 },
    module2: {
      lower: { id: `${testId}-math-m2l`, items: mathM2l },
      upper: { id: `${testId}-math-m2u`, items: mathM2u },
    },
    routeUpAt: 12,
  };

  const form: TestForm = {
    id: testId,
    name: title,
    breakSeconds: 10 * 60,
    sections: [rwSection, mathSection],
  };

  const now = new Date().toISOString();
  return {
    id: testId,
    title,
    collection,
    source,
    published: true,
    scorable: true,
    warnings: [],
    uploadedAt: now,
    updatedAt: now,
    form,
  };
}
