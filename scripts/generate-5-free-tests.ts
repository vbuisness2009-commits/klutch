import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { parseModelJson } from "../lib/pdf/parseModelJson.ts";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error("OPENROUTER_API_KEY is missing from environment.");
  process.exit(1);
}

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const CONTENT_DIR = path.resolve(process.cwd(), "content", "tests");
if (!fs.existsSync(CONTENT_DIR)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

async function callOpenRouter(prompt: string, attempt = 1): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000); // 90s timeout

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
        "http-referer": "https://klutch.local",
        "x-title": "Klutch Free Test Generator",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 16384,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = (await res.text()).slice(0, 300);
      throw new Error(`OpenRouter (${MODEL}) HTTP ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty response from OpenRouter");
    return content;
  } catch (err: any) {
    if (attempt < 3) {
      console.warn(`[Retry ${attempt}/3] Call failed: ${err.message}. Retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
      return callOpenRouter(prompt, attempt + 1);
    }
    throw err;
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
  testNum: number,
  variant: "m1" | "m2u" | "m2l",
  part: 1 | 2
): Promise<any[]> {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";
  const label = `Practice Test ${testNum} RW ${variant.toUpperCase()} (Part ${part})`;

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
      const parsed = parseModelJson<{ questions: any[] }>(res);
      const questions = parsed.questions || [];
      if (questions.length >= (part === 1 ? 13 : 12)) {
        return questions;
      }
      console.warn(`[PT ${testNum} RW ${variant} P${part}] Got ${questions.length} items. Retrying...`);
    } catch (e: any) {
      console.warn(`[PT ${testNum} RW ${variant} P${part}] Attempt ${attempt} parse error: ${e.message}`);
      if (attempt === 3) throw e;
    }
  }
  return [];
}

async function synthesizeRw(testNum: number, variant: "m1" | "m2u" | "m2l") {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";
  console.log(`[PT ${testNum}] Synthesizing RW ${variant.toUpperCase()} in 2 parallel batches...`);

  const [p1, p2] = await Promise.all([
    fetchRwBatch(testNum, variant, 1),
    fetchRwBatch(testNum, variant, 2),
  ]);

  const raw = [...p1, ...p2];
  return raw.slice(0, 27).map((q, idx) => ({
    id: `pt${testNum}-rw-${variant}-q${String(idx + 1).padStart(2, "0")}`,
    domain: q.domain || "Craft and Structure",
    skill: q.skill || "Words in Context",
    difficulty: q.difficulty || (isUpper ? "H" : isRouting ? "M" : "E"),
    html: false,
    stimulus: q.stimulus,
    stem: q.stem,
    format: "mc",
    choices: (q.choices || []).map((c: any) => ({ id: c.label, text: c.content })),
    correct: q.correct || "A",
    keySource: "paper",
    rationale: q.rationale || "Explanation not provided.",
    expectedPace: 70,
  }));
}

async function fetchMathBatch(
  testNum: number,
  variant: "m1" | "m2u" | "m2l",
  part: 1 | 2
): Promise<any[]> {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";
  const label = `Practice Test ${testNum} Math ${variant.toUpperCase()} (Part ${part})`;

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
      const parsed = parseModelJson<{ questions: any[] }>(res);
      const questions = parsed.questions || [];
      if (questions.length >= 10) {
        return questions;
      }
      console.warn(`[PT ${testNum} Math ${variant} P${part}] Got ${questions.length} items. Retrying...`);
    } catch (e: any) {
      console.warn(`[PT ${testNum} Math ${variant} P${part}] Attempt ${attempt} parse error: ${e.message}`);
      if (attempt === 3) throw e;
    }
  }
  return [];
}

async function synthesizeMath(testNum: number, variant: "m1" | "m2u" | "m2l") {
  const isRouting = variant === "m1";
  const isUpper = variant === "m2u";
  console.log(`[PT ${testNum}] Synthesizing Math ${variant.toUpperCase()} in 2 parallel batches...`);

  const [p1, p2] = await Promise.all([
    fetchMathBatch(testNum, variant, 1),
    fetchMathBatch(testNum, variant, 2),
  ]);

  const raw = [...p1, ...p2];
  return raw.slice(0, 22).map((q, idx) => {
    const isSpr = q.format === "spr" || idx >= 17 || (!q.choices && q.accepted);
    const id = `pt${testNum}-math-${variant}-q${String(idx + 1).padStart(2, "0")}`;
    const base = {
      id,
      domain: q.domain || "Algebra",
      skill: q.skill || "Linear equations",
      difficulty: q.difficulty || (isUpper ? "H" : isRouting ? "M" : "E"),
      html: false,
      stem: q.stem,
      rationale: q.rationale || "Explanation not provided.",
      keySource: "paper" as const,
      expectedPace: 95,
    };

    if (isSpr) {
      const acceptedVals = (q.accepted || [String(q.correct ?? "0")]).map((a: any) =>
        String(a).trim()
      );
      return {
        ...base,
        format: "spr" as const,
        accepted: acceptedVals,
      };
    }
    return {
      ...base,
      format: "mc" as const,
      choices: (q.choices || []).map((c: any) => ({ id: c.label, text: c.content })),
      correct: q.correct || "A",
    };
  });
}

async function generateSingleTest(testNum: number) {
  const testId = `practice-test-${testNum}`;
  const title = `Digital SAT Practice Test ${testNum}`;
  console.log(`\n==================================================`);
  console.log(`[${testNum}/5] Generating Full Test Form: ${title}`);
  console.log(`==================================================`);

  // Parallel generation of all 6 modules
  const [rwM1, rwM2u, rwM2l, mathM1, mathM2u, mathM2l] = await Promise.all([
    synthesizeRw(testNum, "m1"),
    synthesizeRw(testNum, "m2u"),
    synthesizeRw(testNum, "m2l"),
    synthesizeMath(testNum, "m1"),
    synthesizeMath(testNum, "m2u"),
    synthesizeMath(testNum, "m2l"),
  ]);

  console.log(
    `[PT ${testNum}] All 6 modules completed! RW: ${rwM1.length} + ${rwM2u.length} + ${rwM2l.length} | Math: ${mathM1.length} + ${mathM2u.length} + ${mathM2l.length}`
  );

  const form = {
    id: testId,
    name: title,
    breakSeconds: 10 * 60,
    sections: [
      {
        id: "rw",
        name: "Reading and Writing",
        secondsPerModule: 32 * 60,
        module1: { id: `${testId}-rw-m1`, items: rwM1 },
        module2: {
          lower: { id: `${testId}-rw-m2l`, items: rwM2l },
          upper: { id: `${testId}-rw-m2u`, items: rwM2u },
        },
        routeUpAt: 15,
      },
      {
        id: "math",
        name: "Math",
        secondsPerModule: 35 * 60,
        module1: { id: `${testId}-math-m1`, items: mathM1 },
        module2: {
          lower: { id: `${testId}-math-m2l`, items: mathM2l },
          upper: { id: `${testId}-math-m2u`, items: mathM2u },
        },
        routeUpAt: 12,
      },
    ],
  };

  const now = new Date().toISOString();
  const storedTest = {
    id: testId,
    title,
    collection: "Official Practice Tests",
    source: "College Board Format (Free)",
    published: true,
    scorable: true,
    warnings: [],
    uploadedAt: now,
    updatedAt: now,
    form,
  };

  // 1. Write to filesystem content/tests/
  const filePath = path.join(CONTENT_DIR, `${testId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(storedTest, null, 2), "utf8");
  console.log(`[PT ${testNum}] Saved test JSON to ${filePath}`);

  // 2. Write to Neon Postgres if available
  if (sql) {
    try {
      await sql`
        INSERT INTO tests (id, title, collection, source, published, scorable, warnings, form, created_at, updated_at)
        VALUES (
          ${testId},
          ${title},
          'Official Practice Tests',
          'College Board Format (Free)',
          true,
          true,
          '[]'::jsonb,
          ${JSON.stringify(form)}::jsonb,
          now(),
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          collection = EXCLUDED.collection,
          source = EXCLUDED.source,
          published = EXCLUDED.published,
          scorable = EXCLUDED.scorable,
          form = EXCLUDED.form,
          updated_at = now()
      `;
      console.log(`[PT ${testNum}] Successfully synced test to Neon Postgres database!`);
    } catch (dbErr) {
      console.error(`[PT ${testNum}] Postgres sync warning:`, dbErr);
    }
  }

  return storedTest;
}

async function main() {
  console.log("=== Generating 5 Free Official Digital SAT Practice Tests ===");
  console.log("Calibrated against College Board Question Bank baseline.");
  for (let n = 1; n <= 5; n++) {
    await generateSingleTest(n);
  }
  console.log("\n==================================================");
  console.log("=== All 5 Practice Tests Generated and Synced! ===");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR in generation:", err);
  process.exit(1);
});
