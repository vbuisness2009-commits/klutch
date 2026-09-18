"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Question = {
  id: string;
  passage?: string;
  prompt: string;
  choices: { id: "A" | "B" | "C" | "D"; text: string }[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  topic: string;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    passage:
      "Marine biologists studying kelp forests off the California coast have observed that sea otters play a critical role in maintaining ecosystem balance. Otters feed on sea urchins, which in turn feed on kelp. When otter populations decline, urchin populations explode, resulting in the destruction of kelp forests, a phenomenon researchers call an \"urchin barren.\"",
    prompt:
      "Which choice best states the main idea of the text?",
    choices: [
      { id: "A", text: "Sea otters and sea urchins compete directly for the same food source." },
      { id: "B", text: "The presence of sea otters is essential to preserving kelp forest ecosystems." },
      { id: "C", text: "Kelp forests off the California coast are the most biodiverse marine habitat." },
      { id: "D", text: "Marine biologists disagree about the cause of urchin barrens." },
    ],
    correct: "B",
    explanation:
      "The passage explains that otters keep urchin populations in check, and without otters, urchins destroy the kelp. That means otters are essential for kelp forest preservation, which is choice B.",
    topic: "Reading: central ideas",
  },
  {
    id: "q2",
    prompt:
      "If 3x + 2 = 17, what is the value of 6x − 4?",
    choices: [
      { id: "A", text: "22" },
      { id: "B", text: "26" },
      { id: "C", text: "30" },
      { id: "D", text: "34" },
    ],
    correct: "B",
    explanation:
      "Solve 3x + 2 = 17 → 3x = 15 → x = 5. Then 6x − 4 = 6(5) − 4 = 30 − 4 = 26.",
    topic: "Math: linear equations",
  },
  {
    id: "q3",
    passage:
      "Although the composer's late works were _____ by his contemporaries, later generations of musicians recognized them as revolutionary contributions to modern orchestral music.",
    prompt:
      "Which choice best completes the text with the most logical and precise word?",
    choices: [
      { id: "A", text: "celebrated" },
      { id: "B", text: "misunderstood" },
      { id: "C", text: "duplicated" },
      { id: "D", text: "commissioned" },
    ],
    correct: "B",
    explanation:
      "The word \"Although\" signals contrast between how contemporaries saw the work and how later musicians did. Since later generations recognized it as revolutionary, contemporaries must have failed to appreciate it, so \"misunderstood\" fits.",
    topic: "Writing: word in context",
  },
];

export default function PracticeDemo() {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [showExplain, setShowExplain] = useState(false);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [eliminated, setEliminated] = useState<Record<string, string[]>>({});
  const [secondsLeft, setSecondsLeft] = useState(32 * 60); // 32-minute module

  const q = QUESTIONS[idx];
  const selected = answers[q.id];
  const isCorrect = selected === q.correct;

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  const toggleElim = (choice: string) => {
    setEliminated((prev) => {
      const cur = prev[q.id] || [];
      return {
        ...prev,
        [q.id]: cur.includes(choice)
          ? cur.filter((c) => c !== choice)
          : [...cur, choice],
      };
    });
  };

  const next = () => {
    setShowExplain(false);
    setIdx((i) => Math.min(QUESTIONS.length - 1, i + 1));
  };
  const prev = () => {
    setShowExplain(false);
    setIdx((i) => Math.max(0, i - 1));
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-ink-900">
      {/* Test-taker top bar */}
      <div className="border-b border-white/10 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-semibold text-white">
                Reading and Writing, Module 1
              </div>
              <div className="text-xs text-zinc-500">
                Sample questions, not from a past paper
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm tabular-nums text-white">
              {timeStr}
            </div>
            <button
              onClick={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                flagged[q.id]
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
              aria-pressed={!!flagged[q.id]}
            >
              {flagged[q.id] ? "Flagged" : "Flag for review"}
            </button>
            <Link
              href="/"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-white/10"
            >
              Exit
            </Link>
          </div>
        </div>
      </div>

      {/* Main question area */}
      <div className="flex-1">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 lg:grid-cols-2">
          {/* Passage / left pane */}
          <div className="min-h-[400px] border-white/10 p-6 lg:border-r lg:p-10">
            {q.passage ? (
              <div className="prose prose-invert max-w-none text-[17px] leading-[1.75] text-zinc-100">
                <p>{q.passage}</p>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                No passage for this question.
              </div>
            )}
          </div>

          {/* Question / right pane */}
          <div className="p-6 lg:p-10">
            <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
              <span className="rounded-md bg-white/5 px-2 py-1 font-mono">
                Question {idx + 1} of {QUESTIONS.length}
              </span>
              <span>{q.topic}</span>
            </div>

            <p className="text-[17px] font-medium leading-relaxed text-white">
              {q.prompt}
            </p>

            <div className="mt-6 space-y-2.5">
              {q.choices.map((c) => {
                const isSelected = selected === c.id;
                const isElim = (eliminated[q.id] || []).includes(c.id);
                return (
                  <div key={c.id} className="flex items-start gap-2">
                    <button
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: c.id }))
                      }
                      disabled={isElim}
                      className={`group relative flex flex-1 items-start gap-3 rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? "border-mint bg-mint/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/5"
                      } ${isElim ? "opacity-40 line-through" : ""}`}
                    >
                      <span
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                          isSelected
                            ? "border-mint bg-mint text-ink-950"
                            : "border-white/20 bg-white/5 text-zinc-300"
                        }`}
                      >
                        {c.id}
                      </span>
                      <span className="text-sm leading-relaxed text-white">
                        {c.text}
                      </span>
                    </button>
                    <button
                      onClick={() => toggleElim(c.id)}
                      className={`flex h-11 w-11 items-center justify-center rounded-lg border text-xs font-bold transition ${
                        isElim
                          ? "border-rose-400/60 bg-rose-500/10 text-rose-300"
                          : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
                      }`}
                      title="Cross out"
                      aria-label={`Cross out ${c.id}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Explanation panel */}
            {showExplain && selected && (
              <div
                className={`mt-6 rounded-xl border p-5 ${
                  isCorrect
                    ? "border-mint/40 bg-mint/5"
                    : "border-rose-400/40 bg-rose-500/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                      isCorrect
                        ? "bg-mint text-ink-950"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {isCorrect ? "Correct" : "Not quite"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Answer: <span className="font-mono font-bold text-white">{q.correct}</span>
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t border-white/10 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIdx(i);
                  setShowExplain(false);
                }}
                className={`h-8 w-8 rounded-md border text-xs font-bold transition ${
                  i === idx
                    ? "border-mint bg-mint text-ink-950"
                    : answers[QUESTIONS[i].id]
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 text-zinc-500 hover:bg-white/5"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={idx === 0}
              className="rounded border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              Back
            </button>
            {selected && !showExplain ? (
              <button
                onClick={() => setShowExplain(true)}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Check answer
              </button>
            ) : null}
            <button
              onClick={next}
              disabled={idx === QUESTIONS.length - 1}
              className="rounded bg-mint px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
