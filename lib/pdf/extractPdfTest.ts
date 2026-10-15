import "server-only";

import { parseModelJson } from "./parseModelJson.ts";
import { importExtracted, type ExtractedQuestion } from "./importExtracted.ts";
import { solveFormAnswers } from "../testEngine/solveForm.ts";
import type { TestForm } from "../testEngine/types.ts";

export type { ExtractedQuestion };

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

export type AnswerKeyEntry = {
  section?: string;
  module?: number | string;
  number?: number | string;
  answer?: string;
  rationale?: string;
};

export type PdfStructure = {
  detectedTitle?: string;
  hasReadingWriting: boolean;
  hasMath: boolean;
  hasAnswerKey: boolean;
  isStandardSat: boolean;
  estimatedQuestions?: number;
};

export type ModelOutput = {
  detectedTitle?: string;
  questions?: ExtractedQuestion[];
  answerKeyTable?: AnswerKeyEntry[];
};

function toBase64(input: Buffer | Uint8Array | string): string {
  if (typeof input === "string") return input;
  if (Buffer.isBuffer(input)) return input.toString("base64");
  return Buffer.from(input).toString("base64");
}

async function callModel(
  apiKey: string,
  model: string,
  prompt: string,
  pdfBase64: string,
  maxTokens = 65536,
  timeoutMs = 50_000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
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
    clearTimeout(timer);
  }
}

async function executeWithFallback(
  prompt: string,
  pdfBase64: string,
  maxTokens = 65536
): Promise<string> {
  const keys = keyPool();
  if (keys.length === 0) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured in .env.local. Add your OpenRouter API key to process PDFs."
    );
  }

  try {
    return await callModel(keys[0], PRIMARY_MODEL, prompt, pdfBase64, maxTokens);
  } catch (primaryErr) {
    console.warn(`Primary model ${PRIMARY_MODEL} failed, attempting ${FALLBACK_MODEL}:`, primaryErr);
    return await callModel(
      keys[keys.length - 1],
      FALLBACK_MODEL,
      prompt,
      pdfBase64,
      maxTokens
    );
  }
}

/**
 * Reconcile answerKeyTable onto the extracted questions.
 * Matches by section, module, and question number.
 */
export function reconcileAnswerKeys(
  questions: ExtractedQuestion[],
  table: AnswerKeyEntry[]
): void {
  if (!table || !Array.isArray(table) || table.length === 0) return;

  const keyMap = new Map<string, AnswerKeyEntry>();
  for (const entry of table) {
    if (!entry.number || !entry.answer) continue;
    const sec = String(entry.section ?? "").toLowerCase().includes("math")
      ? "math"
      : "rw";
    const mod = String(entry.module ?? "1").trim();
    const num = String(entry.number).trim();

    keyMap.set(`${sec}-${mod}-${num}`, entry);
    // Also store without module in case module was not partitioned in the table
    keyMap.set(`${sec}-${num}`, entry);
  }

  for (const q of questions) {
    const sec = String(q.section ?? "").toLowerCase().includes("math")
      ? "math"
      : "rw";
    const mod = String(q.module ?? "1").trim();
    const num = String(q.number ?? "").trim();

    const lookupKey = `${sec}-${mod}-${num}`;
    const fallbackKey = `${sec}-${num}`;
    const foundEntry = keyMap.get(lookupKey) ?? keyMap.get(fallbackKey);

    if (foundEntry && foundEntry.answer) {
      const foundAns = foundEntry.answer.trim();
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

      if (!q.rationale && foundEntry.rationale) {
        q.rationale = foundEntry.rationale;
      }
    }
  }
}

/**
 * 1. Rapid Structural Discovery (<5 seconds)
 * Detects title, section presence, answer key presence, and format.
 */
export async function discoverPdfStructure(
  pdfInput: Buffer | Uint8Array | string
): Promise<PdfStructure> {
  const pdfBase64 = toBase64(pdfInput);
  const prompt = `Analyze this standardized test PDF (SAT, PSAT, or other test booklet).
Return a strict JSON object:
{
  "detectedTitle": "string (e.g. test title from cover or header)",
  "hasReadingWriting": boolean (true if Reading and Writing section is present),
  "hasMath": boolean (true if Math section is present),
  "hasAnswerKey": boolean (true if an answer key table, scoring table, or scoring guide is present),
  "isStandardSat": boolean (true if 2-section SAT or PSAT structure),
  "estimatedQuestions": number (total questions count estimate)
}
Return ONLY the JSON object. Do not wrap in markdown fences.`;

  const raw = await executeWithFallback(prompt, pdfBase64, 1024);
  const parsed = parseModelJson<PdfStructure>(raw);

  return {
    detectedTitle: parsed.detectedTitle || "Uploaded Practice Test",
    hasReadingWriting: parsed.hasReadingWriting !== false,
    hasMath: parsed.hasMath !== false,
    hasAnswerKey: parsed.hasAnswerKey !== false,
    isStandardSat: parsed.isStandardSat !== false,
    estimatedQuestions: parsed.estimatedQuestions || 98,
  };
}

/**
 * 2. Extract Reading and Writing Questions (~10-18 seconds)
 */
export async function extractReadingWritingQuestions(
  pdfInput: Buffer | Uint8Array | string
): Promise<ExtractedQuestion[]> {
  const pdfBase64 = toBase64(pdfInput);
  const prompt = `You are an elite Digital SAT test extraction engine.
TASK: Extract ONLY the Reading and Writing questions (Module 1 and Module 2) from this practice test PDF.
DO NOT extract Math questions.

CRITICAL RULES:
1. Stimulus vs Stem:
   - "stimulus" is ONLY the reading passage, excerpt, or notes. Empty string if none.
   - "stem" is ONLY the interrogative question sentence (rendered in clean HTML).
   - NEVER merge the stimulus into the stem. They render in separate UI panes.
2. Multiple Choice:
   - Provide "choices" array with 4 items: { "label": "A"|"B"|"C"|"D", "content": "<HTML>" }.
3. Answer keys:
   - If the correct answer letter is printed, marked, or bolded, include "correct": "A"|"B"|"C"|"D" and "keySource": "paper".
   - If an explanation is printed, include it in "rationale".
4. Modules:
   - Digital SAT RW has Module 1 and Module 2. Numbering usually restarts at 1 when Module 2 begins.

Output format: Return a strict JSON object:
{
  "questions": [
    {
      "number": 1,
      "section": "Reading and Writing",
      "module": 1,
      "format": "mc",
      "difficulty": "E" | "M" | "H",
      "stimulus": "<HTML passage>",
      "stem": "<HTML question stem>",
      "choices": [
        { "label": "A", "content": "<HTML>" },
        { "label": "B", "content": "<HTML>" },
        { "label": "C", "content": "<HTML>" },
        { "label": "D", "content": "<HTML>" }
      ],
      "correct": "A",
      "keySource": "paper",
      "rationale": "<HTML explanation if present>"
    }
  ]
}
Return ONLY the JSON object. Do not wrap in markdown fences.`;

  const raw = await executeWithFallback(prompt, pdfBase64, 32768);
  const parsed = parseModelJson<{ questions?: ExtractedQuestion[] }>(raw);
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}

/**
 * 3. Extract Math Questions (~10-18 seconds)
 */
export async function extractMathQuestions(
  pdfInput: Buffer | Uint8Array | string
): Promise<ExtractedQuestion[]> {
  const pdfBase64 = toBase64(pdfInput);
  const prompt = `You are an elite Digital SAT test extraction engine.
TASK: Extract ONLY the Math questions (Module 1 and Module 2) from this practice test PDF.
DO NOT extract Reading and Writing questions.

CRITICAL RULES:
1. Formats:
   - Multiple-choice (format: "mc") with 4 choices A, B, C, D.
   - Student-Produced Response (format: "spr", also known as grid-in) with NO choices, where students enter a numerical or fractional answer.
2. Math equations:
   - Format cleanly using standard HTML / MathML / unicode (e.g. <math><msup><mi>x</mi><mn>2</mn></msup></math> or x² or standard fractions). Do not leave formulas blank.
3. Answer keys:
   - If marked or printed:
     * For MC: "correct": "A"|"B"|"C"|"D", "keySource": "paper".
     * For SPR: "accepted": ["<value>"], "keySource": "paper".
   - If an explanation is printed, include it in "rationale".
4. Modules:
   - Digital SAT Math has Module 1 and Module 2.

Output format: Return a strict JSON object:
{
  "questions": [
    {
      "number": 1,
      "section": "Math",
      "module": 1,
      "format": "mc" | "spr",
      "difficulty": "E" | "M" | "H",
      "stimulus": "<HTML preamble or figure description if any, otherwise empty string>",
      "stem": "<HTML question stem>",
      "choices": [
        { "label": "A", "content": "<HTML>" },
        { "label": "B", "content": "<HTML>" },
        { "label": "C", "content": "<HTML>" },
        { "label": "D", "content": "<HTML>" }
      ],
      "correct": "A",
      "accepted": ["12"],
      "keySource": "paper",
      "rationale": "<HTML explanation if present>"
    }
  ]
}
Return ONLY the JSON object. Do not wrap in markdown fences.`;

  const raw = await executeWithFallback(prompt, pdfBase64, 32768);
  const parsed = parseModelJson<{ questions?: ExtractedQuestion[] }>(raw);
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}

/**
 * 4. Extract Answer Key Table (~4-8 seconds)
 */
export async function extractAnswerKeyTable(
  pdfInput: Buffer | Uint8Array | string
): Promise<AnswerKeyEntry[]> {
  const pdfBase64 = toBase64(pdfInput);
  const prompt = `You are an elite Digital SAT scoring engine.
TASK: Locate and extract ONLY the Answer Key table, Scoring Guide, or Answers list from this test PDF (typically found at the end of modules, at the end of the test booklet, or in a scoring guide/appendix).

Find all answers for Reading and Writing (Modules 1 and 2) and Math (Modules 1 and 2).

Output format: Return a strict JSON object:
{
  "answerKeyTable": [
    {
      "section": "Reading and Writing" | "Math",
      "module": 1 | 2,
      "number": 1,
      "answer": "A",
      "rationale": "<HTML explanation if present>"
    }
  ]
}
Return ONLY the JSON object. Do not wrap in markdown fences.`;

  const raw = await executeWithFallback(prompt, pdfBase64, 8192);
  const parsed = parseModelJson<{ answerKeyTable?: AnswerKeyEntry[] }>(raw);
  return Array.isArray(parsed.answerKeyTable) ? parsed.answerKeyTable : [];
}

/**
 * Fallback for non-standard SAT tests or single-pass extraction
 */
export async function extractGeneralQuestions(
  pdfInput: Buffer | Uint8Array | string,
  hasKey: boolean
): Promise<{ questions: ExtractedQuestion[]; answerKeyTable?: AnswerKeyEntry[] }> {
  const pdfBase64 = toBase64(pdfInput);
  const prompt = `You are an elite test extraction engine.
TASK: Extract all practice test questions and any answer key tables from this PDF.
${hasKey ? "Look for answer keys and scoring tables in the PDF and include them." : ""}

Output format: Return a strict JSON object:
{
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
      "accepted": ["12"],
      "keySource": "paper",
      "rationale": "<HTML explanation>"
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

  const raw = await executeWithFallback(prompt, pdfBase64, 32768);
  const parsed = parseModelJson<ModelOutput>(raw);
  return {
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    answerKeyTable: Array.isArray(parsed.answerKeyTable) ? parsed.answerKeyTable : [],
  };
}

/**
 * 5. Finalize Test Form and Solve Any Missing Keys (<2 seconds)
 */
export async function finalizePdfTest(params: {
  id: string;
  title: string;
  collection?: string;
  source?: string;
  questions: ExtractedQuestion[];
  answerKeyTable?: AnswerKeyEntry[];
  hasKey?: boolean;
  onProgress?: (message: string) => void;
}): Promise<ExtractPdfResult> {
  const { questions, answerKeyTable, id, title, hasKey = true, onProgress } = params;

  if (!questions || questions.length === 0) {
    throw new Error(
      "Could not detect any practice questions in the uploaded PDF. Ensure the file contains SAT Reading/Writing or Math questions."
    );
  }

  // Reconcile answer keys if table provided
  if (hasKey && answerKeyTable && answerKeyTable.length > 0) {
    reconcileAnswerKeys(questions, answerKeyTable);
  }

  onProgress?.("Structuring modules and validating test format…");
  const imported = importExtracted(questions, {
    id,
    name: title,
  });

  const form = imported.form;
  const warnings = [...imported.warnings];
  const keysDetectedFromPdf = imported.paperKeys;
  let keysSolvedByAi = 0;

  // Solve any remaining missing keys with AI
  if (imported.missingKeys > 0) {
    onProgress?.(`Solving ${imported.missingKeys} missing answer key(s) with AI…`);
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

/**
 * Full sequential extraction pipeline (backwards compatible for direct calls)
 */
export async function extractPdfTest(
  pdfBuffer: Buffer | Uint8Array,
  options: ExtractPdfOptions
): Promise<ExtractPdfResult> {
  options.onProgress?.("Analyzing PDF structure…");
  const structure = await discoverPdfStructure(pdfBuffer);

  let allQuestions: ExtractedQuestion[] = [];
  let answerKeyTable: AnswerKeyEntry[] = [];

  if (structure.isStandardSat) {
    if (structure.hasReadingWriting) {
      options.onProgress?.("Extracting Reading and Writing questions…");
      const rwQuestions = await extractReadingWritingQuestions(pdfBuffer);
      allQuestions.push(...rwQuestions);
    }
    if (structure.hasMath) {
      options.onProgress?.("Extracting Math questions…");
      const mathQuestions = await extractMathQuestions(pdfBuffer);
      allQuestions.push(...mathQuestions);
    }
  } else {
    options.onProgress?.("Extracting practice questions…");
    const general = await extractGeneralQuestions(pdfBuffer, options.hasKey);
    allQuestions = general.questions;
    if (general.answerKeyTable) answerKeyTable = general.answerKeyTable;
  }

  if (options.hasKey && structure.hasAnswerKey && answerKeyTable.length === 0) {
    options.onProgress?.("Extracting answer keys…");
    answerKeyTable = await extractAnswerKeyTable(pdfBuffer);
  }

  return finalizePdfTest({
    id: options.id,
    title: options.title || structure.detectedTitle || "Uploaded SAT Practice Test",
    collection: options.collection,
    source: options.source,
    questions: allQuestions,
    answerKeyTable,
    hasKey: options.hasKey,
    onProgress: options.onProgress,
  });
}
