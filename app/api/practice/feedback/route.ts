/**
 * POST /api/practice/feedback
 *
 * Accepts a compact session analytics payload and returns constructive AI
 * coaching. Modes:
 *   - summary: overall feedback (used as the chatbot's first message)
 *   - chat: follow-up Q&A with the same analytics context in the system prompt
 *
 * Prefer item ids / domains / correctness / times over full stems. Stem
 * snippets are optional and already truncated by the client.
 */

import { NextResponse } from "next/server";
import type { FeedbackPayload } from "@/lib/testEngine/analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function keyPool(): string[] {
  return (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

type ChatMessage = { role: "user" | "assistant"; content: string };

type Body = {
  mode?: "summary" | "chat";
  analytics: FeedbackPayload;
  messages?: ChatMessage[];
};

function systemPrompt(analytics: FeedbackPayload): string {
  const scoreLine = analytics.score
    ? `Total ${analytics.score.total} ± ${analytics.score.totalMargin}. Sections: ${analytics.score.sections
        .map(
          (s) =>
            `${s.name} ${s.score} (${s.correct}/${s.total}, ${s.route} route)`
        )
        .join("; ")}.`
    : "Form is not scorable (no answer key).";

  const compact = analytics.items.map((i) => ({
    id: i.itemId,
    sec: i.sectionId,
    mod: i.moduleNum,
    route: i.route,
    n: i.numberInModule,
    domain: i.domain,
    skill: i.skill,
    diff: i.difficulty,
    fmt: i.format,
    pretest: i.pretest || undefined,
    ans: i.response ?? null,
    correct: i.correct,
    flagged: i.flagged || undefined,
    timeSec: i.timeSec,
    changes: i.answerChanges || undefined,
    slow: i.excessive || undefined,
    slowWhy: i.excessiveReason,
    snippet: i.stemSnippet,
  }));

  return [
    "You are Klutch, a constructive SAT coach. Be specific, calm, and useful.",
    "Use the student's session analytics below. Do not invent scores or item results.",
    "Do not reproduce long copyrighted passage or question text. Refer to items by id, section, module number, domain, and skill.",
    "When discussing a miss, explain the skill pattern and what to practice next.",
    "Pacing: each item has expectedMinSec–expectedMaxSec and paceProfile (sprint/steady/deep). Slow means over that item's maxSec — not relative to other answers. Vocab/sprint: 10–15s is normal.",
    "Keep summary feedback to about 3–6 short paragraphs or tight bullets. Chat replies stay concise.",
    "",
    `Form: ${analytics.formName} (${analytics.formId})`,
    scoreLine,
    `Totals: ${JSON.stringify(analytics.totals)}`,
    `Timing heuristic: ${analytics.heuristicNote}`,
    `Routes: ${JSON.stringify(analytics.routes)}`,
    "Items (compact JSON):",
    JSON.stringify(compact),
  ].join("\n");
}

const SUMMARY_USER =
  "Write overall constructive feedback for this practice attempt. Cover strengths, misses by domain/skill, pacing (especially slow items), and 2–3 concrete next steps. Do not ask me a question at the end.";

async function callOpenRouter(
  apiKey: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "http-referer": "https://klutch.local",
      "x-title": "Klutch practice feedback",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const json = await res.json();
  return String(json.choices?.[0]?.message?.content ?? "").trim();
}

export async function POST(req: Request) {
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.analytics?.formId || !Array.isArray(body.analytics.items)) {
    return NextResponse.json(
      { error: "analytics payload with formId and items is required." },
      { status: 400 }
    );
  }

  const mode = body.mode === "chat" ? "chat" : "summary";
  const system = systemPrompt(body.analytics);

  const messages: { role: string; content: string }[] = [
    { role: "system", content: system },
  ];

  if (mode === "summary") {
    messages.push({ role: "user", content: SUMMARY_USER });
  } else {
    const history = (body.messages ?? []).filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    );
    if (history.length === 0) {
      return NextResponse.json(
        { error: "messages required for chat mode." },
        { status: 400 }
      );
    }
    // Cap history so the request stays small.
    for (const m of history.slice(-12)) {
      messages.push({ role: m.role, content: m.content.slice(0, 4000) });
    }
  }

  try {
    const content = await callOpenRouter(keys[0], messages);
    if (!content) {
      return NextResponse.json(
        { error: "Empty model response." },
        { status: 502 }
      );
    }
    return NextResponse.json({ mode, content, model: MODEL });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Feedback request failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
