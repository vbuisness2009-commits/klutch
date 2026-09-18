/**
 * Assign expectedPace bands by asking a model to work through each item
 * briefly and set a fluent-student time range (sprint / steady / deep).
 */

import { NextResponse } from "next/server";
import { getTest, saveTest } from "@/lib/testEngine/store";
import type { ExpectedPace, Item, PaceProfile, SectionId } from "@/lib/testEngine/types";
import { ensureHeuristicPaces, inferPaceHeuristic } from "@/lib/testEngine/pace";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function keyPool(): string[] {
  return (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function plain(html: string, max = 400): string {
  const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

type PaceHit = {
  id: string;
  minSec: number;
  maxSec: number;
  profile: PaceProfile;
  note: string;
};

const SYSTEM = `You set target active-time bands for digital SAT items.
A fluent student on test day — not a beginner, not racing blindly.

Profiles:
- sprint: must move fast (Words in Context / vocab, easy conventions, trivial algebra). 10–15s on vocab is NORMAL, not fast. Max often 18–28s.
- steady: typical operational items. Often 25–70s.
- deep: figures, multi-step math, long evidence passages. Often 45–120s.

Return ONLY JSON: {"paces":[{"id":"...","minSec":10,"maxSec":22,"profile":"sprint","note":"Words in Context"}]}
Rules: maxSec > minSec; bands are contiguous ranges (width 8–40s typical); never invent ids; never treat vocab as deep.`;

async function assignChunk(
  apiKey: string,
  sectionId: SectionId,
  items: Item[]
): Promise<Map<string, ExpectedPace>> {
  const payload = items.map((it) => ({
    id: it.id,
    section: sectionId,
    difficulty: it.difficulty,
    domain: it.domain,
    stimulus: plain(it.stimulus ?? "", 280),
    stem: plain(it.stem, 280),
    hasFigure: /\[IMAGE:/.test(`${it.stimulus ?? ""}${it.stem}`),
  }));

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "http-referer": "https://klutch.local",
      "x-title": "Klutch pace assignment",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Assign pace bands for these ${sectionId.toUpperCase()} items:\n${JSON.stringify(payload)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const json = await res.json();
  let raw = String(json.choices?.[0]?.message?.content ?? "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) raw = fenced[1].trim();
  const parsed = JSON.parse(raw) as { paces?: PaceHit[] };
  const out = new Map<string, ExpectedPace>();
  for (const p of parsed.paces ?? []) {
    if (!p?.id || !Number.isFinite(p.minSec) || !Number.isFinite(p.maxSec)) continue;
    const profile: PaceProfile =
      p.profile === "sprint" || p.profile === "deep" ? p.profile : "steady";
    const minSec = Math.max(5, Math.round(p.minSec));
    const maxSec = Math.max(minSec + 5, Math.round(p.maxSec));
    out.set(p.id, {
      minSec,
      maxSec,
      profile,
      note: String(p.note || profile).slice(0, 120),
      source: "ai",
    });
  }
  return out;
}

function applyPaces(
  items: Item[],
  sectionId: SectionId,
  map: Map<string, ExpectedPace>
): Item[] {
  return items.map((it) => ({
    ...it,
    expectedPace: map.get(it.id) ?? inferPaceHeuristic(it, sectionId),
  }));
}

/**
 * POST { formId, mode?: "ai" | "heuristic" }
 * Rewrites the stored form with expectedPace on every item.
 */
export async function POST(req: Request) {
  let body: { formId?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const formId = body.formId?.trim();
  if (!formId) {
    return NextResponse.json({ error: "formId required." }, { status: 400 });
  }

  const stored = await getTest(formId);
  if (!stored) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const mode = body.mode === "heuristic" ? "heuristic" : "ai";
  const keys = keyPool();

  if (mode === "heuristic" || keys.length === 0) {
    const form = ensureHeuristicPaces(stored.form);
    await saveTest({ ...stored, form });
    return NextResponse.json({
      formId,
      mode: "heuristic",
      reason: keys.length === 0 ? "no OPENROUTER_API_KEY" : undefined,
      items: form.sections.reduce(
        (n, s) => n + s.module1.items.length + s.module2.upper.items.length,
        0
      ),
    });
  }

  const apiKey = keys[0];
  const map = new Map<string, ExpectedPace>();

  try {
    for (const section of stored.form.sections) {
      // Dedupe by id across lower/upper when they share items.
      const seen = new Set<string>();
      const unique: Item[] = [];
      for (const it of [
        ...section.module1.items,
        ...section.module2.lower.items,
        ...section.module2.upper.items,
      ]) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        unique.push(it);
      }

      const chunkSize = 12;
      for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        const hits = await assignChunk(apiKey, section.id, chunk);
        for (const [id, pace] of hits) map.set(id, pace);
      }
    }
  } catch (e) {
    const form = ensureHeuristicPaces(stored.form);
    await saveTest({ ...stored, form });
    return NextResponse.json({
      formId,
      mode: "heuristic",
      error: e instanceof Error ? e.message : "AI pace failed; used heuristic.",
      items: map.size,
    });
  }

  const form = {
    ...stored.form,
    sections: stored.form.sections.map((section) => ({
      ...section,
      module1: {
        ...section.module1,
        items: applyPaces(section.module1.items, section.id, map),
      },
      module2: {
        lower: {
          ...section.module2.lower,
          items: applyPaces(section.module2.lower.items, section.id, map),
        },
        upper: {
          ...section.module2.upper,
          items: applyPaces(section.module2.upper.items, section.id, map),
        },
      },
    })),
  };

  await saveTest({ ...stored, form });
  return NextResponse.json({
    formId,
    mode: "ai",
    aiLabeled: map.size,
    model: MODEL,
  });
}
