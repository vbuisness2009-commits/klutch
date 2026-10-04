/**
 * Post-upload answer-key solver. Batches items through Gemini 3.1 Pro Preview
 * using the May-era SAT accuracy prompts, with retries and a Pro fallback.
 */

import "server-only";

import type { Item, SectionId, TestForm } from "./types";
import { checkSprAnswer, sprEquivalents } from "./authoring";
import {
  SAT_SOLVER_ACCURACY_LINE,
  SAT_SOLVER_MATH_PROMPT,
  SAT_SOLVER_RW_PROMPT,
  SAT_SOLVER_SYSTEM,
  SOLVER_MODEL,
  SOLVER_FALLBACK_MODEL,
} from "./solvePrompt";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MC_CHUNK = 5;
const SPR_CHUNK = 3;
const MAX_PASSES = 3;
const TIMEOUT_MS = 180_000;

export type SolveProgress = (msg: string) => void;

export type SolveStats = {
  total: number;
  needed: number;
  solved: number;
  failed: number;
  apiCalls: number;
  model: string;
};

type WorkItem = {
  sectionId: SectionId;
  /** Pointer into the live form so we can write answers back. */
  item: Item;
  n: number;
};

function keyPool(): string[] {
  return (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function cleanForAI(html: string): string {
  if (!html) return "";
  let text = html;
  text = text.replace(
    /<math[^>]*alttext="([^"]*)"[^>]*>[\s\S]*?<\/math>/gi,
    " $1 "
  );
  text = text.replace(/<m[ions][^>]*>([^<]*)<\/m[ions]>/g, "$1");
  text = text.replace(/\[IMAGE:[^\]]*\]/gi, "[figure]");
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, "[figure]");
  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "[$1]");
  text = text.replace(/<img[^>]*>/gi, "[image]");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#?\w+;/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

function itemNeedsSolve(item: Item): boolean {
  if (item.keySource === "paper" || item.keySource === "solved") {
    if (item.format === "spr") return item.accepted.length === 0;
    return false;
  }
  if (item.format === "spr") return item.accepted.length === 0;
  // missing / unset — authored without a key
  return item.keySource === "missing" || item.keySource == null;
}

function applyAnswer(item: Item, raw: string): boolean {
  if (item.format === "mc") {
    const letter = raw.trim().toUpperCase().match(/[A-D]/)?.[0];
    if (!letter || !item.choices.some((c) => c.id === letter)) return false;
    item.correct = letter as "A" | "B" | "C" | "D";
    item.keySource = "solved";
    return true;
  }

  const value = raw.trim();
  if (!value) return false;
  const spr = /^[A-D]$/i.test(value)
    ? value
    : value.replace(/^[A-D][).:\s]+/i, "");
  if (!checkSprAnswer(spr).ok) return false;
  item.accepted = sprEquivalents([spr]);
  item.keySource = "solved";
  return true;
}

function buildPayload(items: WorkItem[]) {
  return items.map((w, i) => {
    const it = w.item;
    const obj: Record<string, unknown> = {
      n: i + 1,
      id: it.id,
      format: it.format,
    };
    if (it.stimulus) obj.stimulus = cleanForAI(it.stimulus);
    obj.question = cleanForAI(it.stem);
    if (it.format === "mc") {
      obj.options = Object.fromEntries(
        it.choices.map((c) => [c.id, cleanForAI(c.text)])
      );
    } else {
      obj.format = "spr";
      obj.note = "Student-produced response — return the exact accepted value.";
    }
    return obj;
  });
}

function parseAnswers(
  content: string,
  count: number
): Map<number, string> {
  const answers = new Map<number, string>();
  if (!content) return answers;

  let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  const store = (key: unknown, val: unknown) => {
    const num = parseInt(String(key), 10);
    if (!num || num < 1 || num > count) return;
    const valStr = String(val).trim();
    if (!valStr) return;
    answers.set(num, valStr);
  };

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    for (const [k, v] of Object.entries(parsed)) store(k, v);
  } catch {
    for (const m of content.matchAll(
      /"?(\d+)"?\s*:\s*"?(?:([A-Da-d])|([^"\n,}]+))"?/g
    )) {
      store(m[1], (m[2] || m[3] || "").trim());
    }
  }

  return answers;
}

async function solveBatch(
  apiKey: string,
  sectionId: SectionId,
  batch: WorkItem[],
  model: string,
  temperature: number
): Promise<{ answers: Map<number, string>; error?: string }> {
  const modulePrompt =
    sectionId === "math" ? SAT_SOLVER_MATH_PROMPT : SAT_SOLVER_RW_PROMPT;
  const payload = buildPayload(batch);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://klutch.local",
        "x-title": "Klutch SAT solver",
      },
      body: JSON.stringify({
        model,
        temperature,
        // Gemini 3.x on OpenRouter spends the shared budget on hidden
        // reasoning first — without a high max_tokens (and a reasoning
        // cap), content comes back empty and we solve 0 keys.
        max_tokens: 8192,
        reasoning: { max_tokens: 4096 },
        messages: [
          { role: "system", content: SAT_SOLVER_SYSTEM },
          {
            role: "user",
            content: `${modulePrompt}\n\n${SAT_SOLVER_ACCURACY_LINE}\n\nQuestions to solve:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        answers: new Map(),
        error: `API ${res.status}: ${(await res.text()).slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | { type?: string; text?: string }[];
        };
      }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    const content = Array.isArray(raw)
      ? raw
          .map((p) => (typeof p === "string" ? p : p?.text ?? ""))
          .join("")
      : raw || "";
    if (!content.trim()) {
      return { answers: new Map(), error: "Empty model response." };
    }

    return { answers: parseAnswers(content, batch.length) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      answers: new Map(),
      error: msg.includes("abort") ? "Timed out after 3 minutes." : msg,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function collectWork(form: TestForm): WorkItem[] {
  const out: WorkItem[] = [];
  for (const section of form.sections) {
    // Module 1 plus both module-2 routes (deduped when they share items).
    const pools = [section.module1.items, section.module2.upper.items, section.module2.lower.items];
    const seen = new Set<string>();
    for (const items of pools) {
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        if (!itemNeedsSolve(item)) continue;
        out.push({
          sectionId: section.id,
          item,
          n: out.length + 1,
        });
      }
    }
  }
  return out;
}

function formIsFullyKeyed(form: TestForm): boolean {
  for (const section of form.sections) {
    for (const items of [section.module1.items, section.module2.upper.items, section.module2.lower.items]) {
      for (const item of items) {
        if (itemNeedsSolve(item)) return false;
      }
    }
  }
  return true;
}

/**
 * Fills missing answer keys on a TestForm in place. Returns whether the form
 * is fully scorable afterwards.
 *
 * @param opts.limit  Cap how many missing items to attempt this call (resume-safe).
 * @param opts.onCheckpoint  Called after each successful batch so callers can persist.
 */
export async function solveFormAnswers(
  form: TestForm,
  onProgress?: SolveProgress,
  opts?: {
    limit?: number;
    onCheckpoint?: () => void | Promise<void>;
  }
): Promise<{ scorable: boolean; stats: SolveStats; warnings: string[] }> {
  const keys = keyPool();
  const warnings: string[] = [];
  const stats: SolveStats = {
    total: 0,
    needed: 0,
    solved: 0,
    failed: 0,
    apiCalls: 0,
    model: SOLVER_MODEL,
  };

  const uniqueIds = new Set<string>();
  for (const section of form.sections) {
    for (const items of [section.module1.items, section.module2.upper.items]) {
      for (const it of items) uniqueIds.add(it.id);
    }
  }
  stats.total = uniqueIds.size;

  if (keys.length === 0) {
    warnings.push(
      "OPENROUTER_API_KEY is not set, so answers were not solved after upload."
    );
    return { scorable: formIsFullyKeyed(form), stats, warnings };
  }

  const allMissing = collectWork(form);
  stats.needed = allMissing.length;

  if (allMissing.length === 0) {
    onProgress?.("All items already have answer keys.");
    return { scorable: true, stats, warnings };
  }

  const limit = opts?.limit && opts.limit > 0 ? opts.limit : allMissing.length;
  let remaining = allMissing.slice(0, limit);

  onProgress?.(
    `Solving ${remaining.length}/${allMissing.length} missing items with ${SOLVER_MODEL}…`
  );

  let keyIndex = 0;

  for (let pass = 1; pass <= MAX_PASSES && remaining.length > 0; pass++) {
    const bySection = {
      rw: remaining.filter((w) => w.sectionId === "rw"),
      math: remaining.filter((w) => w.sectionId === "math"),
    } as const;

    for (const sectionId of ["rw", "math"] as const) {
      const group = bySection[sectionId];
      if (group.length === 0) continue;

      const chunkSize =
        pass === 1
          ? sectionId === "math"
            ? SPR_CHUNK
            : MC_CHUNK
          : Math.max(
              1,
              Math.floor((sectionId === "math" ? SPR_CHUNK : MC_CHUNK) / pass)
            );
      const temperature = pass === 1 ? 0 : Math.min(0.25, (pass - 1) * 0.1);
      const model = pass >= 3 ? SOLVER_FALLBACK_MODEL : SOLVER_MODEL;

      const batches: WorkItem[][] = [];
      for (let i = 0; i < group.length; i += chunkSize) {
        batches.push(group.slice(i, i + chunkSize));
      }

      onProgress?.(
        `${sectionId.toUpperCase()} pass ${pass}: ${group.length} left → ${batches.length} batches (${model})`
      );

      const concurrency = Math.min(2, keys.length, batches.length);
      let cursor = 0;

      const worker = async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= batches.length) return;
          const batch = batches[idx]!;
          const apiKey = keys[keyIndex++ % keys.length]!;
          stats.apiCalls++;

          let result = await solveBatch(
            apiKey,
            sectionId,
            batch,
            model,
            temperature
          );

          if (result.error && model !== SOLVER_FALLBACK_MODEL) {
            stats.apiCalls++;
            result = await solveBatch(
              apiKey,
              sectionId,
              batch,
              SOLVER_FALLBACK_MODEL,
              temperature
            );
          }

          if (result.error) {
            onProgress?.(`Batch failed: ${result.error.slice(0, 100)}`);
            if (warnings.length < 8) {
              warnings.push(`Solver batch failed: ${result.error.slice(0, 160)}`);
            }
            continue;
          }

          if (result.answers.size === 0) {
            if (warnings.length < 8) {
              warnings.push(
                "Solver returned no parseable answers for a batch (empty or non-JSON)."
              );
            }
            continue;
          }

          let batchHits = 0;
          for (const [num, ans] of result.answers) {
            const entry = batch[num - 1];
            if (!entry || !itemNeedsSolve(entry.item)) continue;
            if (applyAnswer(entry.item, ans)) {
              stats.solved++;
              batchHits++;
            }
          }
          if (batchHits > 0 && opts?.onCheckpoint) {
            await opts.onCheckpoint();
          }
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => worker()));
    }

    remaining = collectWork(form).filter((w) =>
      remaining.some((r) => r.item.id === w.item.id)
    );
    onProgress?.(
      `Pass ${pass} done — ${remaining.length} of this chunk still missing.`
    );
  }

  // Mirror solved keys onto the lower route clone when it shares the same ids.
  const byId = new Map<string, Item>();
  for (const section of form.sections) {
    for (const it of section.module2.upper.items) {
      if (!itemNeedsSolve(it)) byId.set(it.id, it);
    }
  }
  for (const section of form.sections) {
    for (const it of section.module2.lower.items) {
      if (!itemNeedsSolve(it)) continue;
      const src = byId.get(it.id);
      if (!src) continue;
      if (src.format === "mc" && it.format === "mc") {
        it.correct = src.correct;
        it.rationale = src.rationale;
        it.keySource = src.keySource;
      } else if (src.format === "spr" && it.format === "spr") {
        it.accepted = [...src.accepted];
        it.rationale = src.rationale;
        it.keySource = src.keySource;
      }
    }
  }

  const stillMissing = collectWork(form).length;
  stats.failed = stillMissing;
  const scorable = formIsFullyKeyed(form);
  onProgress?.(
    scorable
      ? `Solved ${stats.solved} this round — form is scorable.`
      : `Solved ${stats.solved} this round; ${stillMissing} still open overall.`
  );

  return { scorable, stats, warnings };
}
