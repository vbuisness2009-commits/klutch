"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildMock, estimateScore, mockLengths, type MockConfig, type MockLength, type PoolItem } from "@/lib/apMock";
import { mockKey, readStore, writeStore } from "@/lib/apProgress";
import { Markdown } from "@/components/ap/Markdown";
import { McqBody, typingTarget } from "@/components/ap/Choices";

type Phase = "setup" | "loading" | "running" | "done";

/** Saved so a student can resume after a reload. */
type MockState = {
  items: PoolItem[];
  answers: Record<number, string>;
  flagged: number[];
  startedAt: number;
  minutes: number;
  finishedAt: number | null;
};

const btn =
  "rounded bg-mint px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 disabled:cursor-not-allowed disabled:opacity-40";
const ghost = "rounded border border-white/15 px-3.5 py-2 text-sm text-zinc-200 transition hover:border-white/35 hover:text-white";

export function MockExam({ config }: { config: MockConfig }) {
  const lengths = useMemo(() => mockLengths(config), [config]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [state, setState] = useState<MockState | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const topRef = useRef<HTMLDivElement>(null);

  // Resume a saved exam.
  useEffect(() => {
    const saved = readStore<MockState | null>(mockKey(config.slug), null);
    if (saved?.items?.length) {
      setState(saved);
      setPhase(saved.finishedAt ? "done" : "running");
    }
  }, [config.slug]);

  const persist = useCallback(
    (s: MockState | null) => {
      setState(s);
      writeStore(mockKey(config.slug), s);
    },
    [config.slug]
  );

  const finish = useCallback(() => {
    if (!state || state.finishedAt) return;
    persist({ ...state, finishedAt: Date.now() });
    setPhase("done");
    topRef.current?.scrollIntoView({ block: "start" });
  }, [state, persist]);

  // Timer.
  const deadline = state ? state.startedAt + state.minutes * 60_000 : 0;
  const left = Math.max(0, deadline - now);
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === "running" && state && left === 0) finish();
  }, [phase, state, left, finish]);

  const start = async (len: MockLength) => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/ap/${config.slug}/mock`);
      if (!res.ok) throw new Error(String(res.status));
      const { pool } = (await res.json()) as { pool: PoolItem[] };
      const items = buildMock(pool, config.units, len.count);
      if (!items.length) throw new Error("empty");
      persist({ items, answers: {}, flagged: [], startedAt: Date.now(), minutes: len.minutes, finishedAt: null });
      setNow(Date.now());
      setIndex(0);
      setPhase("running");
    } catch {
      setError("Couldn't load the questions. Check your connection and try again.");
      setPhase("setup");
    }
  };

  const restart = () => {
    persist(null);
    setIndex(0);
    setPhase("setup");
  };

  // Keyboard: letters pick, arrows move.
  useEffect(() => {
    if (phase !== "running" || !state) return;
    const onKey = (e: KeyboardEvent) => {
      if (typingTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const item = state.items[index];
      const k = e.key.toUpperCase();
      if (item.q.choices.some((c) => c.id === k)) {
        persist({ ...state, answers: { ...state.answers, [index]: k } });
      } else if (e.key === "ArrowRight") {
        setIndex((i) => Math.min(state.items.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, state, index, persist]);

  if (!lengths.length) {
    return (
      <div className="panel max-w-3xl p-6 text-sm text-zinc-300">
        A timed practice exam isn&rsquo;t available for this subject yet. Use the unit practice sets instead.
      </div>
    );
  }

  if (phase === "setup" || phase === "loading") {
    return (
      <div ref={topRef} className="max-w-3xl space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-white">Practice exam</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
            A timed multiple-choice section drawn from this subject&rsquo;s Exam level and Hardest questions, weighted by
            unit like the real exam. Answers are revealed at the end. Your progress is saved in this browser, so you can
            leave and come back.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {lengths.map((l) => (
            <button
              key={l.key}
              type="button"
              disabled={phase === "loading"}
              onClick={() => start(l)}
              className="panel p-5 text-left transition hover:border-mint/60 disabled:opacity-50"
            >
              <span className="block text-[15px] font-semibold text-white">{l.label}</span>
              <span className="nums mt-1 block text-[13px] text-zinc-400">
                {l.count} questions &middot; {l.minutes} minutes
              </span>
              {l.key === "full" && <span className="mt-2 block text-[12px] text-zinc-500">Same length and timing as the real section.</span>}
            </button>
          ))}
        </div>
        {phase === "loading" && <p className="text-[13px] text-zinc-400">Building your exam&hellip;</p>}
        {error && <p className="text-[13px] text-rose-300">{error}</p>}
        <p className="nums text-[12px] text-zinc-600">{config.available} questions in the pool across {config.units.length} units.</p>
      </div>
    );
  }

  if (!state) return null;
  const total = state.items.length;
  const answered = Object.keys(state.answers).length;

  if (phase === "done") {
    const correct = state.items.filter((it, k) => state.answers[k] === it.q.answer).length;
    const percent = Math.round((correct / total) * 100);
    const est = estimateScore(percent, config.cutoffs);
    const byUnit = config.units
      .map((u) => {
        const ks = state.items.map((it, k) => (it.unit === u.number ? k : -1)).filter((k) => k >= 0);
        return { u, n: ks.length, right: ks.filter((k) => state.answers[k] === state.items[k].q.answer).length };
      })
      .filter((r) => r.n > 0);
    return (
      <div ref={topRef} className="max-w-3xl space-y-10">
        <div className="panel p-6">
          <p className="text-[13px] text-zinc-500">Your result</p>
          <p className="nums mt-1 text-3xl font-semibold text-white">
            {correct} / {total} <span className="text-lg text-zinc-400">({percent}%)</span>
          </p>
          {est !== null ? (
            <p className="mt-2 text-[14px] text-zinc-300">
              Estimated AP score on this section: <span className="font-semibold text-mint">{est}</span>
              <span className="text-zinc-500"> (rough estimate from multiple choice only)</span>
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-zinc-500">No score estimate: cut points for this exam aren&rsquo;t published.</p>
          )}
          <button type="button" onClick={restart} className={`${btn} mt-5`}>
            Start a new practice exam
          </button>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold text-white">By unit</h3>
          <ol className="mt-3">
            {byUnit.map(({ u, n, right }) => (
              <li key={u.number} className="flex items-baseline gap-4 border-b border-white/[0.07] py-2.5 text-[13px]">
                <span className="nums w-6 flex-shrink-0 text-zinc-600">{u.number}</span>
                <span className="flex-1 text-zinc-200">{u.title}</span>
                <span className={`nums flex-shrink-0 ${right / n >= 0.7 ? "text-mint" : right / n >= 0.5 ? "text-zinc-300" : "text-rose-300"}`}>
                  {right}/{n}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-10">
          <h3 className="text-[15px] font-semibold text-white">Review</h3>
          {state.items.map((it, k) => {
            const pick = state.answers[k];
            const ok = pick === it.q.answer;
            return (
              <div key={k} className="border-t border-white/[0.07] pt-6">
                <p className="nums mb-3 text-[12px] text-zinc-500">
                  Question {k + 1} &middot; Unit {it.unit} &middot;{" "}
                  <span className={ok ? "text-mint" : "text-rose-300"}>{pick ? (ok ? "Correct" : `You chose ${pick}`) : "Not answered"}</span>
                </p>
                <McqBody q={it.q} name={`review-${k}`} selected={pick} onSelect={() => {}} reveal />
                <div className="mt-4 text-[14px] text-zinc-300">
                  <Markdown source={it.q.explanation} />
                  {pick && !ok && it.q.distractors?.[pick as keyof typeof it.q.distractors] && (
                    <p className="mt-2 text-zinc-400">
                      Why {pick} is tempting: {it.q.distractors[pick as keyof typeof it.q.distractors]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Running.
  const item = state.items[index];
  const flagged = state.flagged.includes(index);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  return (
    <div ref={topRef} className="max-w-3xl">
      <div className="sticky top-16 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-ink-950/95 px-1 py-3 backdrop-blur">
        <span className="nums text-[13px] text-zinc-400">
          Question {index + 1} of {total} &middot; {answered} answered
        </span>
        <span className={`nums text-[15px] font-semibold ${left < 5 * 60_000 ? "text-rose-300" : "text-white"}`} aria-live="off">
          {mm}:{String(ss).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => {
            if (answered < total && !window.confirm(`You have ${total - answered} unanswered. Submit anyway?`)) return;
            finish();
          }}
          className={btn}
        >
          Submit
        </button>
      </div>

      <nav aria-label="Questions" className="mt-4 flex flex-wrap gap-1.5">
        {state.items.map((_, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setIndex(k)}
            aria-current={k === index ? "step" : undefined}
            className={`nums h-8 w-8 rounded text-[12px] transition ${
              k === index
                ? "bg-white text-ink-950"
                : state.answers[k]
                  ? "bg-mint/20 text-mint"
                  : "border border-white/12 text-zinc-400 hover:border-white/30"
            } ${state.flagged.includes(k) ? "ring-1 ring-amber-300" : ""}`}
          >
            {k + 1}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        <McqBody
          q={item.q}
          name={`mock-${index}`}
          selected={state.answers[index]}
          onSelect={(id) => persist({ ...state, answers: { ...state.answers, [index]: id } })}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className={ghost} disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Previous
        </button>
        <button type="button" className={ghost} disabled={index === total - 1} onClick={() => setIndex(index + 1)}>
          Next
        </button>
        <button
          type="button"
          className={`${ghost} ${flagged ? "border-amber-300/60 text-amber-200" : ""}`}
          onClick={() =>
            persist({ ...state, flagged: flagged ? state.flagged.filter((k) => k !== index) : [...state.flagged, index] })
          }
        >
          {flagged ? "Unflag" : "Flag for review"}
        </button>
        <span className="hidden text-[12px] text-zinc-600 sm:inline">Letter keys pick, arrows move</span>
      </div>
    </div>
  );
}
