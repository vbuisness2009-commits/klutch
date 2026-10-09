import "server-only";

import { parseModelJson } from "./parseModelJson";
import { importExtracted, type ExtractedQuestion } from "./importExtracted";
import { solveFormAnswers } from "../testEngine/solveForm";
import type { TestForm } from "../testEngine/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_MODEL = "google/gemini-2.5-flash";
const FALLBACK_MODEL = "google/gemini-2.5-pro";

function keyPool(): string[] {
  return (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export type ExtractPdfOptions = {
  id: string;
  title: string;
  hasKey: boolean;
  collection?: string;
  source?: string;
  onProgress?: (message: string) => void;
};

export type ExtractPdfResult = {
  form: TestForm;
  scorable: boolean;
  warnings: string[];
  stats: {
    totalQuestions: number;
    keysDetectedFromPdf: number;
    keysSolvedByAi: number;
  };
};

type AnswerKeyEntry = {
  section?: string;
  module?: number | string;
  number?: number | string;
  answer?: string;
};

type ModelOutput = {
  detectedTitle?: string;
  questions?: ExtractedQuestion[];
  answerKeyTable?: AnswerKeyEntry[];
};

function buildPrompt(hasKey: boolean): string {
  const keyInstructions = hasKey
    ? `
CRITICAL INSTRUCTIONS FOR ANSWER KEY EXTRACTION (User checked: PDF includes answer key):
1. You MUST locate and extract the answer keys from this test PDF. Look for:
   - Dedicated "Answer Key", "Scoring Guide", "Answers and Explanations", or scoring tables at the end of modules, at the end of the test, or in an appendix.
   - Inline answer markings on question pages (e.g. bolded choice, answer letter printed beside question number, "Correct Answer: B", or explanation text).
2. For each question where the answer is found in the PDF:
   - Set "correct": "A" | "B" | "C" | "D" for multiple-choice questions.
   - Set "accepted": ["<value>"] for student-produced response (SPR) math questions (e.g. ["42", "42.0"]).
   - Set "keySource": "paper".
3. In addition to the "questions" list, populate the "answerKeyTable" array with every entry from any answer key table, scoring guide, or answer summary found in the PDF.
4. If an explanation or rationale is printed in the PDF, copy it into "rationale".
5. If an individual question does NOT have an answer printed in the PDF, set "keySource": "missing" (the AI solver will fill it in).`
    : `
NOTE ON ANSWER KEYS:
- If the PDF prints answers or explanations, capture them with "keySource": "paper". Otherwise set "keySource": "missing".`;

  return `You are an expert test extraction engine converting pages of a standardized Digital SAT practice test PDF into structured JSON for an online test player.

${keyInstructions}

RULES FOR EXTRACTION:
1. Sections & Modules:
   - Digital SAT consists of "Reading and Writing" and "Math".
   - Each section is divided into Module 1 and Module 2.
   - Question numbering typically restarts at 1 when Module 2 begins.
2. Questions & Content:
   - Stimulus vs Stem:
     * "stimulus" is ONLY the reading passage, quotation, scenario, table, or preamble. Empty string if none.
     * "stem" is ONLY the interrogative sentence asking the question (rendered in HTML).
     * Do NOT merge stimulus into stem. They render in separate panes.
   - Multiple Choice: Provide "choices" array with { "label": "A"|"B"|"C"|"D", "content": "<HTML>" }.
   - Student-Produced Response (SPR): Math questions with no multiple-choice options. Omit choices and provide "format": "spr".
   - Math equations: Use clean standard HTML / MathML / unicode (e.g., <math><msup><mi>x</mi><mn>2</mn></msup></math> or x² or standard fractions). Do not leave equations blank.
3. Output format: Return a strict JSON object with this exact shape:

{
  "detectedTitle": "Optional title from test cover",
  "questions": [
    {
      "number": 1,
      "section": "Reading and Writing" | "Math",
      "module": 1 | 2,
      "format": "mc" | "spr",
      "difficulty": "E" | "M" | "H",
      "stimulus": "<HTML passage or setup>",
      "stem": "<HTML question stem>",
      "choices": [
        { "label": "A", "content": "<HTML>" },
        { "label": "B", "content": "<HTML>" },
        { "label": "C", "content": "<HTML>" },
        { "label": "D", "content": "<HTML>" }
      ],
      "correct": "A",
      "accepted": ["7"],
      "keySource": "paper" | "missing",
      "rationale": "<HTML explanation if present in PDF>"
    }
  ],
  "answerKeyTable": [
    {
      "section": "Reading and Writing" | "Math",
      "module": 1 | 2,
      "number": 1,
      "answer": "A"
    }
  ]
}

Return ONLY the JSON object. Do not wrap in markdown fences.`;
}

async function callModel(
  apiKey: string,
  model: string,
  prompt: string,
  pdfBase64: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240_000); // 4 minute timeout

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://klutch.local",
        "x-title": "Klutch SAT PDF Ingestion",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 16384,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "file",
                file: {
                  filename: "test.pdf",
                  file_data: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 300);
      throw new Error(`OpenRouter (${model}) HTTP ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) {
      throw new Error(`Model ${model} returned empty response.`);
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Reconcile answerKeyTable onto the extracted questions.
 * Matches by section, module, and question number.
 */
function reconcileAnswerKeys(
  questions: ExtractedQuestion[],
  table: AnswerKeyEntry[]
): void {
  if (!table || !Array.isArray(table) || table.length === 0) return;

  const keyMap = new Map<string, string>();
  for (const entry of table) {
    if (!entry.number || !entry.answer) continue;
    const sec = String(entry.section ?? "").toLowerCase().includes("math")
      ? "math"
      : "rw";
    const mod = String(entry.module ?? "1").trim();
    const num = String(entry.number).trim();
    const ans = String(entry.answer).trim();

    keyMap.set(`${sec}-${mod}-${num}`, ans);
    // Also store without module in case module was not partitioned in the table
    keyMap.set(`${sec}-${num}`, ans);
  }

  for (const q of questions) {
    const sec = String(q.section ?? "").toLowerCase().includes("math")
      ? "math"
      : "rw";
    const mod = String(q.module ?? "1").trim();
    const num = String(q.number ?? "").trim();

    const lookupKey = `${sec}-${mod}-${num}`;
    const fallbackKey = `${sec}-${num}`;
    const foundAns = keyMap.get(lookupKey) ?? keyMap.get(fallbackKey);

    if (foundAns) {
      const isSpr =
        q.format === "spr" ||
        (!q.choices?.length && (q.accepted?.length || !q.correct));

      if (isSpr) {
        if (!q.accepted || q.accepted.length === 0) {
          q.accepted = [foundAns];
          q.keySource = "paper";
        }
      } else {
        const letter = foundAns.toUpperCase().match(/[A-D]/)?.[0];
        if (letter) {
          q.correct = letter;
          q.keySource = "paper";
        }
      }
    }
  }
}

export async function extractPdfTest(
  pdfBuffer: Buffer | Uint8Array,
  options: ExtractPdfOptions
): Promise<ExtractPdfResult> {
  const keys = keyPool();
  if (keys.length === 0) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured in .env.local. Add your OpenRouter API key to process PDFs."
    );
  }

  const pdfBase64 = Buffer.isBuffer(pdfBuffer)
    ? pdfBuffer.toString("base64")
    : Buffer.from(pdfBuffer).toString("base64");

  const prompt = buildPrompt(options.hasKey);

  options.onProgress?.("Reading PDF with AI and scanning for answer keys…");

  let rawContent: string;
  try {
    rawContent = await callModel(keys[0], PRIMARY_MODEL, prompt, pdfBase64);
  } catch (primaryErr) {
    console.warn(`Primary model ${PRIMARY_MODEL} failed, attempting ${FALLBACK_MODEL}:`, primaryErr);
    options.onProgress?.(`Retrying extraction with ${FALLBACK_MODEL}…`);
    rawContent = await callModel(
      keys[keys.length - 1],
      FALLBACK_MODEL,
      prompt,
      pdfBase64
    );
  }

  options.onProgress?.("Parsing extracted questions and answer key table…");
  const modelJson = parseModelJson<ModelOutput>(rawContent);
  const rawQuestions = Array.isArray(modelJson.questions)
    ? modelJson.questions
    : [];

  if (rawQuestions.length === 0) {
    throw new Error(
      "Could not detect any practice questions in the uploaded PDF. Ensure the file contains SAT Reading/Writing or Math questions."
    );
  }

  // If answerKeyTable was returned, map it to any unkeyed questions
  if (options.hasKey && Array.isArray(modelJson.answerKeyTable)) {
    reconcileAnswerKeys(rawQuestions, modelJson.answerKeyTable);
  }

  // Build the TestForm
  options.onProgress?.("Structuring modules and validating test format…");
  const imported = importExtracted(rawQuestions, {
    id: options.id,
    name: options.title || modelJson.detectedTitle || "Uploaded SAT Practice Test",
  });

  const form = imported.form;
  const warnings = [...imported.warnings];
  const keysDetectedFromPdf = imported.paperKeys;
  let keysSolvedByAi = 0;

  // If any questions are still missing keys (or if hasKey was false), solve with AI
  if (imported.missingKeys > 0) {
    options.onProgress?.(
      `Solving ${imported.missingKeys} missing answer key(s) with AI…`
    );
    const solveRes = await solveFormAnswers(form);
    keysSolvedByAi = solveRes.stats.solved;
    warnings.push(...solveRes.warnings);
  }

  return {
    form,
    scorable: true,
    warnings,
    stats: {
      totalQuestions: imported.totalQuestions,
      keysDetectedFromPdf,
      keysSolvedByAi,
    },
  };
}
