import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import {
  ACCURATE_EXTRACT_MODE,
  EXTRACT_PROMPT,
  FIGURE_AUDIT_PROMPT,
} from "@/lib/pdf/extractPrompt";
import { saveLastExtract } from "@/lib/pdf/lastExtract";
import {
  mergeFigures,
  remapFigurePage,
  remapQuestionImagePages,
  isConcretePassBHit,
  type FigureHit,
} from "@/lib/pdf/mergeFigures";
import { parseModelJson } from "@/lib/pdf/parseModelJson";
import type { ExtractedQuestion } from "@/lib/testEngine/importExtracted";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const FLASH_MODEL = "google/gemini-2.5-flash";
const PRO_MODEL = "google/gemini-2.5-pro";

/**
 * Chunks are sent concurrently, not one after another. A 120-page paper is
 * 30 chunks: sequentially that is 30 round trips stacked end to end and takes
 * many minutes, concurrently it is roughly the latency of the slowest chunk.
 *
 * Smaller chunks are also faster per request and keep the model's attention on
 * fewer pages, which improves extraction quality as well as wall time.
 */
const PASS_A_PAGES = 4;
const PASS_B_PAGES = 2;
const CONCURRENCY = 8;
const MAX_ATTEMPTS = 3;
/** Pro can sit open forever without this; fail the chunk and keep going. */
const CHUNK_TIMEOUT_MS = 120_000;
/** Soft wall budget for Accurate mode (leave headroom under maxDuration). */
const ACCURATE_BUDGET_MS = 170_000;

/** Comma-separated keys are rotated so parallel requests spread rate limits. */
function keyPool(): string[] {
  return (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

type Chunk = { base64: string; firstPage: number; pages: number };

async function chunkPdf(
  bytes: Uint8Array,
  pagesPerChunk: number
): Promise<{ chunks: Chunk[]; total: number }> {
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const chunks: Chunk[] = [];

  for (let start = 0; start < total; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, total);
    const doc = await PDFDocument.create();
    const copied = await doc.copyPages(
      src,
      Array.from({ length: end - start }, (_, i) => start + i)
    );
    for (const p of copied) doc.addPage(p);
    chunks.push({
      base64: Buffer.from(await doc.save()).toString("base64"),
      firstPage: start + 1,
      pages: end - start,
    });
  }
  return { chunks, total };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CallOptions = {
  chunk: Chunk;
  keys: string[];
  keyOffset: number;
  model: string;
  prompt: string;
  pageHint: string;
};

async function callOpenRouter({
  chunk,
  keys,
  keyOffset,
  model,
  prompt,
  pageHint,
}: CallOptions): Promise<string> {
  let lastError = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Rotate keys across both chunks and retries so a rate-limited key is not
    // hit again immediately.
    const apiKey = keys[(keyOffset + attempt) % keys.length];
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), CHUNK_TIMEOUT_MS);

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: abort.signal,
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${prompt}\n\n${pageHint}`,
                },
                {
                  type: "file",
                  file: {
                    filename: "pages.pdf",
                    file_data: `data:application/pdf;base64,${chunk.base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = `${res.status}`;
        await sleep(600 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
      }

      const json = await res.json();
      return String(json.choices?.[0]?.message?.content ?? "");
    } catch (e) {
      if (abort.signal.aborted) {
        lastError = `timed out after ${CHUNK_TIMEOUT_MS / 1000}s`;
      } else {
        lastError = e instanceof Error ? e.message : "failed";
      }
      if (attempt < MAX_ATTEMPTS - 1) await sleep(400 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(lastError || "failed");
}

async function extractQuestionsChunk(
  chunk: Chunk,
  keys: string[],
  keyOffset: number,
  model: string
): Promise<ExtractedQuestion[]> {
  let lastParseError = "";
  // Network retries live inside callOpenRouter; also retry when the model
  // returns unparseable JSON so a bad escape does not blank a 4-page range.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callOpenRouter({
        chunk,
        keys,
        keyOffset: keyOffset + attempt,
        model,
        prompt: EXTRACT_PROMPT,
        pageHint: `These pages begin at PDF page ${chunk.firstPage}. Use real PDF page numbers in any [IMAGE: ...] placeholder.${
          attempt > 0
            ? "\n\nPrevious reply was not valid JSON. Reply with ONLY a JSON object {\"questions\":[...]} and no markdown fences."
            : ""
        }`,
      });
      const parsed = parseModelJson(raw) as { questions?: unknown[] };
      const list = Array.isArray(parsed.questions) ? parsed.questions : [];
      return list.map((q) =>
        remapQuestionImagePages(
          q as ExtractedQuestion,
          chunk.firstPage,
          chunk.pages
        )
      );
    } catch (e) {
      lastParseError = e instanceof Error ? e.message : "parse failed";
      if (attempt < MAX_ATTEMPTS - 1) await sleep(400 * (attempt + 1));
    }
  }
  throw new Error(lastParseError || "failed");
}

function normalizeFigure(raw: unknown): FigureHit | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const page = Number(o.page);
  const description = String(o.description ?? "").trim();
  if (!Number.isFinite(page) || page < 1 || !description) return null;
  const hit: FigureHit = { page, description };
  if (o.questionNumber != null && String(o.questionNumber).trim()) {
    hit.questionNumber = String(o.questionNumber).trim();
  }
  if (typeof o.section === "string" && o.section.trim()) {
    hit.section = o.section.trim();
  }
  if (o.module != null && Number.isFinite(Number(o.module))) {
    hit.module = Number(o.module);
  }
  if (typeof o.kind === "string" && o.kind.trim()) {
    hit.kind = o.kind.trim();
  }
  if (o.choiceLabel != null && String(o.choiceLabel).trim()) {
    hit.choiceLabel = String(o.choiceLabel).trim();
  }
  return hit;
}

async function auditFiguresChunk(
  chunk: Chunk,
  keys: string[],
  keyOffset: number,
  model: string
): Promise<FigureHit[]> {
  const raw = await callOpenRouter({
    chunk,
    keys,
    keyOffset,
    model,
    prompt: FIGURE_AUDIT_PROMPT,
    pageHint: `These pages begin at PDF page ${chunk.firstPage}. Use absolute PDF page numbers in every "page" field.`,
  });
  const parsed = parseModelJson(raw) as { figures?: unknown[] };
  const list = Array.isArray(parsed.figures) ? parsed.figures : [];
  return list
    .map(normalizeFigure)
    .filter((f): f is FigureHit => f != null)
    .map((f) => remapFigurePage(f, chunk.firstPage, chunk.pages));
}

/** Runs tasks with a bounded number in flight at once. */
async function pooled<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

function isAccurateMode(model: string): boolean {
  return (
    model === ACCURATE_EXTRACT_MODE ||
    model === "accurate-flash-pro" ||
    /flash\+pro/i.test(model)
  );
}

export async function POST(request: Request) {
  const keys = keyPool();
  if (keys.length === 0) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY is not set. Add it to .env.local and restart the server.",
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Send the PDF as multipart form data." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const model = (form.get("model") as string) || DEFAULT_MODEL;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF was uploaded." }, { status: 400 });
  }

  const started = Date.now();
  const accurate = isAccurateMode(model);
  const bytes = new Uint8Array(await file.arrayBuffer());

  let passA;
  try {
    passA = await chunkPdf(bytes, PASS_A_PAGES);
  } catch {
    return NextResponse.json({ error: "That file is not a readable PDF." }, { status: 422 });
  }

  const failures: string[] = [];
  const passAModel = accurate ? FLASH_MODEL : model;
  const passAStarted = Date.now();

  // Results are kept per chunk so page order survives concurrent completion.
  const perChunk: ExtractedQuestion[][] = new Array(passA.chunks.length)
    .fill(null)
    .map(() => []);

  await pooled(passA.chunks, CONCURRENCY, async (chunk, i) => {
    try {
      perChunk[i] = await extractQuestionsChunk(chunk, keys, i, passAModel);
    } catch (e) {
      const label = accurate ? "Pass A " : "";
      failures.push(
        `${label}pages ${chunk.firstPage}–${chunk.firstPage + chunk.pages - 1}: ${
          e instanceof Error ? e.message : "failed"
        }`
      );
    }
  });

  let questions = perChunk.flat();
  const passASeconds = Math.round((Date.now() - passAStarted) / 100) / 10;

  let passBSeconds: number | undefined;
  let passBUsedFlash = false;
  let figureCount = 0;

  if (accurate && questions.length > 0) {
    const passBStarted = Date.now();
    let passB;
    try {
      passB = await chunkPdf(bytes, PASS_B_PAGES);
    } catch {
      failures.push("Pass B: could not re-chunk PDF for figure audit.");
      passB = null;
    }

    if (passB) {
      const figuresPerChunk: FigureHit[][] = new Array(passB.chunks.length)
        .fill(null)
        .map(() => []);

      await pooled(passB.chunks, CONCURRENCY, async (chunk, i) => {
        // Prefer Pro; fall back to Flash when the soft wall budget is tight.
        const remaining = ACCURATE_BUDGET_MS - (Date.now() - started);
        const modelForChunk =
          remaining < CHUNK_TIMEOUT_MS ? FLASH_MODEL : PRO_MODEL;
        if (modelForChunk === FLASH_MODEL) passBUsedFlash = true;

        try {
          figuresPerChunk[i] = await auditFiguresChunk(
            chunk,
            keys,
            i + passA.chunks.length,
            modelForChunk
          );
        } catch (e) {
          failures.push(
            `Pass B pages ${chunk.firstPage}–${chunk.firstPage + chunk.pages - 1}: ${
              e instanceof Error ? e.message : "failed"
            }`
          );
        }
      });

      const figures = figuresPerChunk
        .flat()
        .filter(isConcretePassBHit);
      figureCount = figures.length;
      questions = mergeFigures(questions, figures);
      passBSeconds = Math.round((Date.now() - passBStarted) / 100) / 10;
    }
  }

  const passBModelLabel = passBUsedFlash
    ? `${PRO_MODEL}→${FLASH_MODEL}`
    : PRO_MODEL;

  const savedModel = accurate
    ? `${ACCURATE_EXTRACT_MODE} (${FLASH_MODEL} + ${passBModelLabel})`
    : model;

  if (questions.length > 0) {
    await saveLastExtract({
      savedAt: new Date().toISOString(),
      pageCount: passA.total,
      model: savedModel,
      questions,
      failures,
    });
  }

  return NextResponse.json({
    questions,
    pageCount: passA.total,
    chunks: passA.chunks.length,
    concurrency: CONCURRENCY,
    keys: keys.length,
    seconds: Math.round((Date.now() - started) / 100) / 10,
    failures,
    mode: accurate ? ACCURATE_EXTRACT_MODE : "single",
    pass: accurate ? "done" : undefined,
    passes: accurate
      ? {
          a: {
            label: "Pass A",
            model: passAModel,
            seconds: passASeconds,
            chunks: passA.chunks.length,
            pagesPerChunk: PASS_A_PAGES,
          },
          b: {
            label: "Pass B",
            model: passBModelLabel,
            seconds: passBSeconds ?? 0,
            chunks: Math.ceil(passA.total / PASS_B_PAGES),
            pagesPerChunk: PASS_B_PAGES,
            figures: figureCount,
          },
        }
      : undefined,
  });
}
