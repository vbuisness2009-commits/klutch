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

async function synthesizeRwModule(
  testNumber: number,
  moduleNum: 1 | 2
): Promise<Item[]> {
  const prompt = `You are a College Board psychometric test designer creating Reading and Writing Module ${moduleNum} for a brand new, authentic Digital SAT practice test (Generated Test #${testNumber}).

Generate EXACTLY 27 questions strictly adhering to the official College Board domain sequence:
- Questions 1-8: Craft and Structure (Words in Context: 4 items, Text Structure & Purpose: 2 items, Cross-Text: 2 items)
- Questions 9-15: Information and Ideas (Central Ideas & Details: 3 items, Command of Evidence: 2 items, Inferences: 2 items)
- Questions 16-22: Standard English Conventions (Boundaries/Punctuation: 4 items, Form/Structure/Sense: 3 items)
- Questions 23-27: Expression of Ideas (Transitions: 3 items, Rhetorical Synthesis with research bullets: 2 items)

Difficulty Mix for Module ${moduleNum}:
${moduleNum === 1 ? "- Balanced routing module: 6 Easy (E), 15 Medium (M), 6 Hard (H)" : "- Adaptive upper module: 3 Easy (E), 10 Medium (M), 14 Hard (H)"}

RULES:
1. Every passage/stimulus must be realistic, academic, high-school/undergraduate level text.
2. Multiple choice: exactly 4 choices (A, B, C, D).
3. "correct": exactly one letter A, B, C, or D.
4. "rationale": 1-2 sentence explanation of why the correct choice is right and why other options fail.

Output strict JSON with this shape:
{
  "questions": [
    {
      "number": 1,
      "domain": "Craft and Structure",
      "skill": "Words in Context",
      "difficulty": "M",
      "stimulus": "Passage text...",
      "stem": "Which choice completes the text with the most logical and precise word or phrase?",
      "choices": [
        { "label": "A", "content": "..." },
        { "label": "B", "content": "..." },
        { "label": "C", "content": "..." },
        { "label": "D", "content": "..." }
      ],
      "correct": "B",
      "rationale": "..."
    }
  ]
}`;

  const raw = await callOpenRouter(prompt);
  const parsed = parseModelJson<{ questions: GeneratedRwQuestion[] }>(raw);
  const questions = parsed.questions || [];

  return questions.map((q, idx): Item => {
    const id = `gen${testNumber}-rw-m${moduleNum}-q${String(idx + 1).padStart(2, "0")}`;
    const baseItem: MultipleChoiceItem = {
      id,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty || "M",
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

async function synthesizeMathModule(
  testNumber: number,
  moduleNum: 1 | 2
): Promise<Item[]> {
  const prompt = `You are an elite Digital SAT Math test designer creating Math Module ${moduleNum} for a brand new, authentic Digital SAT practice test (Generated Test #${testNumber}).

Generate EXACTLY 22 questions matching the official College Board Math distribution:
- Algebra: 8 questions (Linear equations, systems, inequalities)
- Advanced Math: 7 questions (Quadratics, polynomials, exponential, nonlinear functions)
- Problem-Solving and Data Analysis: 4 questions (Ratios, percentages, statistics, probability)
- Geometry and Trigonometry: 3 questions (Circles, right triangles, radians)

Format Distribution:
- Exactly 17 questions Multiple Choice (format: "mc", choices: A, B, C, D)
- Exactly 5 questions Student-Produced Response (format: "spr", no choices, accepted: ["<exact answer>", "<decimal equivalent>"])

Order questions roughly from easiest to hardest (Questions 1-6 mostly E, 7-16 mostly M, 17-22 mostly H).

RULES:
1. Ensure every math problem is mathematically sound and has an unambiguous, verifiable answer.
2. Use clean HTML or text for equations (e.g. x^2, fractions, standard equations).
3. "rationale": concise 1-2 sentence solution step.

Output strict JSON with this shape:
{
  "questions": [
    {
      "number": 1,
      "domain": "Algebra",
      "skill": "Linear equations in one variable",
      "difficulty": "E",
      "format": "mc",
      "stem": "If 3x + 7 = 22, what is the value of x?",
      "choices": [
        { "label": "A", "content": "3" },
        { "label": "B", "content": "5" },
        { "label": "C", "content": "7" },
        { "label": "D", "content": "15" }
      ],
      "correct": "B",
      "rationale": "Subtracting 7 gives 3x = 15, so x = 5."
    },
    {
      "number": 18,
      "domain": "Advanced Math",
      "skill": "Quadratic equations",
      "difficulty": "H",
      "format": "spr",
      "stem": "What is the positive solution to x^2 - 12x + 36 = 0?",
      "accepted": ["6", "6.0"],
      "rationale": "(x-6)^2 = 0, so x = 6."
    }
  ]
}`;

  const raw = await callOpenRouter(prompt);
  const parsed = parseModelJson<{ questions: GeneratedMathQuestion[] }>(raw);
  const questions = parsed.questions || [];

  return questions.map((q, idx): Item => {
    const id = `gen${testNumber}-math-m${moduleNum}-q${String(idx + 1).padStart(2, "0")}`;
    const base = {
      id,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty || "M",
      html: false,
      stem: q.stem,
      rationale: q.rationale,
      keySource: "paper" as const,
    };

    let item: Item;
    if (q.format === "spr" || (!q.choices && q.accepted)) {
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
 * Generate a complete, balanced 98-question Digital SAT practice test.
 * Runs module synthesis in parallel for speed (~20-25 seconds total).
 */
export async function generateBlueprintTest(
  testNumber: number
): Promise<StoredTest> {
  const testId = `generated-test-${testNumber}`;
  const title = `Generated Test ${testNumber}`;

  // Synthesize both modules in parallel
  const [rwM1, rwM2, mathM1, mathM2] = await Promise.all([
    synthesizeRwModule(testNumber, 1),
    synthesizeRwModule(testNumber, 2),
    synthesizeMathModule(testNumber, 1),
    synthesizeMathModule(testNumber, 2),
  ]);

  const rwSection: Section = {
    id: "rw",
    name: "Reading and Writing",
    secondsPerModule: 32 * 60,
    module1: { id: `${testId}-rw-m1`, items: rwM1 },
    module2: {
      lower: { id: `${testId}-rw-m2l`, items: rwM2 },
      upper: { id: `${testId}-rw-m2u`, items: rwM2 },
    },
    routeUpAt: 15,
  };

  const mathSection: Section = {
    id: "math",
    name: "Math",
    secondsPerModule: 35 * 60,
    module1: { id: `${testId}-math-m1`, items: mathM1 },
    module2: {
      lower: { id: `${testId}-math-m2l`, items: mathM2 },
      upper: { id: `${testId}-math-m2u`, items: mathM2 },
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
    collection: "Generated Tests",
    source: "ai-blueprint",
    published: true,
    scorable: true,
    warnings: [],
    uploadedAt: now,
    updatedAt: now,
    form,
  };
}
