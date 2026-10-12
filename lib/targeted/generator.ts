import "server-only";

import { parseModelJson } from "../pdf/parseModelJson";
import {
  saveTargetedSetToBank,
  getTargetedSetFromBank,
  slugifyTopic,
  type TargetedQuestionItem,
  type TargetedQuestionSet,
} from "./store";

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

type GeneratedQuestionRaw = {
  number: number;
  difficulty: "E" | "M" | "H";
  stem: string;
  stimulus?: string;
  format?: "mc" | "spr";
  choices?: { label: "A" | "B" | "C" | "D"; content: string }[];
  correct?: "A" | "B" | "C" | "D";
  accepted?: string[];
  rationale: string;
  desmosHint?: string;
};

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://klutchtestprep.com",
        "x-title": "Klutch Targeted Practice Generator",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 16384,
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

async function fetchTierBatch(
  section: "math" | "rw",
  topic: string,
  domain: string,
  difficulty: "E" | "M" | "H",
  count = 10
): Promise<GeneratedQuestionRaw[]> {
  const diffLabel =
    difficulty === "E"
      ? "EASY (Foundational SAT level: clear syntax, standard values, 1-2 steps)"
      : difficulty === "M"
      ? "MEDIUM (Typical Digital SAT core level: intermediate multi-step, contextual wording, realistic distractors)"
      : "HARD (High-discrimination 700+ level: tricky edge cases, dense phrasing, non-obvious traps, multi-step algebra or subtle reading nuances)";

  const isMath = section === "math";

  const prompt = `You are a premier College Board Digital SAT assessment specialist creating a focused practice set.
TARGET TOPIC: "${topic}"
DOMAIN: "${domain}"
SECTION: "${isMath ? "Math" : "Reading & Writing"}"
DIFFICULTY TIER: ${diffLabel}
REQUIRED QUANTITY: EXACTLY ${count} questions (numbered 1 to ${count})

CRITICAL 1:1 ACCURACY RULES:
- Output strict, valid JSON ONLY.
- Output NO double quotes inside strings; use single quotes (') for text excerpts.
${
  isMath
    ? `- For Math, provide realistic SAT questions. At least 2 of the 10 questions should be Student-Produced Response (format: "spr", no choices, "accepted": ["numeric"]).
- Write math equations in clean standard format like "2x^2 - 8x + 3 = 0" or "f(x) = 3(x - 2)^2".
- "correct" must be strictly "A", "B", "C", or "D" for multiple choice.
- "rationale" MUST start with "Choice <letter> is correct because..." (or for SPR, state the exact numeric answer with full arithmetic proof).
- Include "desmosHint": 1 sentence explaining how to solve or check this with the Desmos graphing calculator.`
    : `- For Reading & Writing, provide authentic short passages (25-75 words), stems, and 4 choices (A, B, C, D).
- "correct" must be strictly "A", "B", "C", or "D".
- "rationale" MUST start with "Choice <letter> is correct because..." proving why other choices fail.`
}

Output format:
{
  "questions": [
    {
      "number": 1,
      "difficulty": "${difficulty}",
      ${isMath ? `"format": "mc",` : ""}
      ${!isMath ? `"stimulus": "Passage text...",` : ""}
      "stem": "Question stem text...",
      "choices": [
        { "label": "A", "content": "..." },
        { "label": "B", "content": "..." },
        { "label": "C", "content": "..." },
        { "label": "D", "content": "..." }
      ],
      "correct": "A",
      "rationale": "Choice A is correct because...",
      ${isMath ? `"desmosHint": "Type the equation into Desmos line 1..."` : ""}
    }
  ]
}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await callOpenRouter(prompt);
      const parsed = parseModelJson<{ questions: GeneratedQuestionRaw[] }>(res);
      const questions = parsed.questions || [];
      if (questions.length >= count - 2) {
        return questions.slice(0, count);
      }
    } catch (e: any) {
      if (attempt === 2) throw e;
    }
  }

  return [];
}

function reconcileRawItem(
  q: GeneratedQuestionRaw,
  idx: number,
  tier: "E" | "M" | "H",
  setId: string
): TargetedQuestionItem {
  const isSpr = q.format === "spr" || (!q.choices && q.accepted);
  const id = `${setId}-q${String(idx + 1).padStart(2, "0")}`;

  if (isSpr) {
    const rawAccepted = (q.accepted || []).map((a) => String(a).trim());
    const valid = rawAccepted.filter(
      (a) => a && !["<exact>", "a", "b", "c", "d"].includes(a.toLowerCase()) && /^[-+]?\d+(\.\d+)?(\/\d+)?$/.test(a)
    );
    let accepted = valid;
    if (accepted.length === 0) {
      const numMatch = q.rationale.match(/(?:equals|is|=\s*)\s*([-+]?\d+(?:\.\d+)?(?:\/\d+)?)/i);
      accepted = numMatch ? [numMatch[1]] : ["1"];
    }

    return {
      id,
      number: idx + 1,
      difficulty: tier,
      stem: q.stem,
      stimulus: q.stimulus,
      format: "spr",
      correct: accepted[0],
      accepted,
      rationale: q.rationale,
      desmosHint: q.desmosHint,
    };
  }

  // Multiple Choice
  const rawChoices = q.choices || [];
  const letters: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  const choices = letters.map((L, cIdx) => {
    const c = rawChoices[cIdx];
    const text = c?.content || (c as any)?.text || (c?.label && c.label.length > 2 ? c.label : "") || `Option ${L}`;
    return { id: L, text };
  });

  const rationale = (q.rationale || "").trim();
  const match = rationale.match(/Choice\s+([A-D])\s+is\s+correct/i);
  let correct = (q.correct?.toUpperCase() as "A" | "B" | "C" | "D") || "A";
  if (match && ["A", "B", "C", "D"].includes(match[1].toUpperCase())) {
    correct = match[1].toUpperCase() as "A" | "B" | "C" | "D";
  }

  let finalRationale = rationale;
  if (!rationale.toLowerCase().includes(`choice ${correct.toLowerCase()} is correct`)) {
    finalRationale = `Choice ${correct} is correct. ${rationale.replace(/^Choice\s+[A-D]\s+is\s+correct[.:]?\s*/i, "")}`.trim();
  }

  return {
    id,
    number: idx + 1,
    difficulty: tier,
    stem: q.stem,
    stimulus: q.stimulus,
    format: "mc",
    choices,
    correct,
    rationale: finalRationale,
    desmosHint: q.desmosHint,
  };
}

/**
 * Get or synthesize a 30-question targeted practice set (10 Easy, 10 Medium, 10 Hard)
 * Reuses from Postgres bank if already created, or synthesizes and saves to the bank permanently.
 */
export async function getOrGenerateTargetedSet(options: {
  section: "math" | "rw";
  topic: string;
  domain?: string;
  skill?: string;
}): Promise<{ set: TargetedQuestionSet; isNew: boolean }> {
  const { section, topic, domain = "Targeted Skill", skill = topic } = options;
  const slug = slugifyTopic(topic);
  const setId = `targeted-${section}-${slug}`;

  // 1. Check if this targeted set already exists in the bank
  const existing = await getTargetedSetFromBank(setId);
  if (existing && existing.questions.length >= 25) {
    return { set: existing, isNew: false };
  }

  // 2. Synthesize 10 Easy, 10 Medium, and 10 Hard in parallel
  const [easyRaw, medRaw, hardRaw] = await Promise.all([
    fetchTierBatch(section, topic, domain, "E", 10),
    fetchTierBatch(section, topic, domain, "M", 10),
    fetchTierBatch(section, topic, domain, "H", 10),
  ]);

  const questions: TargetedQuestionItem[] = [];
  let numCounter = 0;

  // Process Easy
  easyRaw.forEach((q) => {
    questions.push(reconcileRawItem(q, numCounter++, "E", setId));
  });

  // Process Medium
  medRaw.forEach((q) => {
    questions.push(reconcileRawItem(q, numCounter++, "M", setId));
  });

  // Process Hard
  hardRaw.forEach((q) => {
    questions.push(reconcileRawItem(q, numCounter++, "H", setId));
  });

  const now = new Date().toISOString();
  const set: TargetedQuestionSet = {
    id: setId,
    section,
    domain,
    topic,
    skill,
    easyCount: easyRaw.length,
    mediumCount: medRaw.length,
    hardCount: hardRaw.length,
    totalQuestions: questions.length,
    questions,
    createdAt: now,
    updatedAt: now,
  };

  // 3. Save to bank permanently for all other students to reuse
  await saveTargetedSetToBank(set);

  return { set, isNew: true };
}
