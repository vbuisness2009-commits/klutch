"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AP_TIERS, type ApFrq, type ApMcq, type ApQuestion, type ApTier } from "@/lib/apSchema";
import {
  progressKey,
  qKey,
  readStore,
  writeStore,
  type FrqRecord,
  type QuestionRecord,
  type SubjectProgress,
} from "@/lib/apProgress";
import { Markdown } from "@/components/ap/Markdown";
import { McqBody, typingTarget } from "@/components/ap/Choices";

type TierFilter = ApTier | "All";
type TypeFilter = "all" | "mcq" | "frq";

/**
 * One unit's practice: a question at a time, filtered by tier. MCQs are
 * checked on the spot with the explanation and, for a wrong pick, why that
 * choice was tempting. FRQs are written out, then scored by the student
 * against the rubric. Everything is saved per question in localStorage.
 */
export function PracticeSet({ slug, unit, questions }: { slug: string; unit: number; questions: ApQuestion[] }) {
  const [tier, setTier] = useState<TierFilter>("All");
  const [type, setType] = useState<TypeFilter>("all");
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<SubjectProgress>({});
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProgress(readStore<SubjectProgress>(progressKey(slug), {}));
  }, [slug]);

  const save = useCallback(
    (id: string, rec: QuestionRecord | null) => {
      // Re-read before writing so another open unit tab isn't clobbered.
      const p = readStore<SubjectProgress>(progressKey(slug), {});
      if (rec) p[qKey(unit, id)] = rec;
      else delete p[qKey(unit, id)];
      writeStore(progressKey(slug), p);
      setProgress({ ...p });
    },
    [slug, unit]
  );

  const hasMcq = questions.some((q) => q.type === "mcq");
  const hasFrq = questions.some((q) => q.type === "frq");

  const list = useMemo(
    () =>
      questions.filter(
        (q) => (tier === "All" || q.tier === tier) && (type === "all" || q.type === type)
      ),
    [questions, tier, type]
  );
  const q = list[Math.min(index, list.length - 1)];
  const rec = q ? progress[qKey(unit, q.id)] : undefined;

  const mcqDone = list.filter((x) => x.type === "mcq" && progress[qKey(unit, x.id)]?.kind === "mcq");
  const correct = mcqDone.filter((x) => (progress[qKey(unit, x.id)] as { correct?: boolean }).correct).length;

  const go = (k: number) => {
    setIndex(Math.max(0, Math.min(list.length - 1, k)));
    topRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const resetAll = () => {
    const p = readStore<SubjectProgress>(progressKey(slug), {});
    for (const x of questions) delete p[qKey(unit, x.id)];
    writeStore(progressKey(slug), p);
    setProgress({ ...p });
  };

  if (!questions.length) {
    return <Empty>No practice questions for this unit yet.</Empty>;
  }

  const tierCount = (t: TierFilter) =>
    questions.filter((x) => (t === "All" || x.tier === t) && (type === "all" || x.type === type)).length;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented
          label="Difficulty"
          value={tier}
          options={(["All", ...AP_TIERS] as TierFilter[]).map((t) => ({
            value: t,
            label: t,
            count: tierCount(t),
          }))}
          onChange={(v) => {
            setTier(v);
            setIndex(0);
          }}
        />
        {hasMcq && hasFrq && (
          <Segmented
            label="Type"
            value={type}
            options={[
              { value: "all", label: "All" },
              { value: "mcq", label: "Multiple choice" },
              { value: "frq", label: "Free response" },
            ]}
            onChange={(v) => {
              setType(v);
              setIndex(0);
            }}
          />
        )}
      </div>

      <div className="nums mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12px] text-zinc-500">
        <span aria-live="polite">
          {mcqDone.length > 0 ? (
            <>
              <span className="text-mint">{correct}</span> of {mcqDone.length} correct
              {list.filter((x) => x.type === "mcq").length > mcqDone.length &&
                ` · ${list.filter((x) => x.type === "mcq").length - mcqDone.length} to go`}
            </>
          ) : (
            "Nothing answered in this set yet"
          )}
        </span>
        {Object.keys(progress).some((k) => k.startsWith(`${unit}/`)) && (
          <button type="button" onClick={resetAll} className="text-zinc-500 underline-offset-4 hover:text-white hover:underline">
            Reset this unit
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <Empty>No questions at this level.</Empty>
      ) : (
        <>
          <Navigator
            list={list}
            current={Math.min(index, list.length - 1)}
            status={(x) => {
              const r = progress[qKey(unit, x.id)];
              if (!r) return "none";
              if (r.kind === "mcq") return r.correct ? "right" : "wrong";
              return r.revealed ? "done" : "draft";
            }}
            onPick={go}
          />

          <div className="mt-6 border-t border-white/[0.07] pt-6">
            <div className="nums flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] text-zinc-500">
              <span className="font-semibold text-zinc-300">
                Question {Math.min(index, list.length - 1) + 1} of {list.length}
              </span>
              <span>{q.tier}</span>
              {q.topic && <span>{q.topic}</span>}
              {q.skill && <span className="text-zinc-600">{q.skill}</span>}
            </div>

            <div className="mt-4">
              {q.type === "mcq" ? (
                <McqCard
                  key={q.id}
                  q={q}
                  rec={rec?.kind === "mcq" ? rec : undefined}
                  onCheck={(choice) => save(q.id, { kind: "mcq", choice, correct: choice === q.answer, at: Date.now() })}
                  onRetry={() => save(q.id, null)}
                  onNext={index < list.length - 1 ? () => go(index + 1) : undefined}
                />
              ) : (
                <FrqCard
                  key={q.id}
                  q={q}
                  rec={rec?.kind === "frq" ? rec : undefined}
                  onSave={(r) => save(q.id, r)}
                />
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="text-[13px] text-zinc-400 transition hover:text-white disabled:opacity-30"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={index >= list.length - 1}
                className="text-[13px] font-medium text-zinc-200 transition hover:text-white disabled:opacity-30"
              >
                Next question
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function McqCard({
  q,
  rec,
  onCheck,
  onRetry,
  onNext,
}: {
  q: ApMcq;
  rec: { choice: string; correct: boolean } | undefined;
  onCheck: (choice: string) => void;
  onRetry: () => void;
  onNext?: () => void;
}) {
  const [choice, setChoice] = useState<string | undefined>(rec?.choice);
  const checked = Boolean(rec);
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Letter keys pick a choice; Enter is handled by the form.
  useEffect(() => {
    if (checked) return;
    const onKey = (e: KeyboardEvent) => {
      if (typingTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (q.choices.some((c) => c.id === k)) {
        setChoice(k);
        formRef.current?.querySelector<HTMLInputElement>(`input[value="${k}"]`)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checked, q.choices]);

  useEffect(() => {
    if (checked) (nextRef.current ?? feedbackRef.current)?.focus({ preventScroll: true });
  }, [checked]);

  const shown = rec?.choice ?? choice;
  const distractor = rec && !rec.correct ? q.distractors?.[rec.choice as keyof NonNullable<ApMcq["distractors"]>] : undefined;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (!checked && choice) onCheck(choice);
      }}
    >
      <McqBody q={q} name={`q-${q.id}`} selected={shown} onSelect={setChoice} reveal={checked} />

      {!checked ? (
        <div className="mt-5 flex items-center gap-4">
          <button
            type="submit"
            disabled={!choice}
            className="rounded bg-mint px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Check answer
          </button>
          <span className="hidden text-[12px] text-zinc-600 sm:inline">
            Keys {q.choices.map((c) => c.id).join(" ")} to pick, Enter to check
          </span>
        </div>
      ) : (
        <div ref={feedbackRef} tabIndex={-1} className="mt-6 focus:outline-none" aria-live="polite">
          <p className={`text-sm font-semibold ${rec!.correct ? "text-mint" : "text-rose-300"}`}>
            {rec!.correct ? "Correct." : `Not quite. The answer is ${q.answer}.`}
          </p>
          {distractor && (
            <div className="mt-3 border-l-2 border-rose-400/40 pl-4">
              <p className="text-[12px] font-semibold text-zinc-400">Why {rec!.choice} is tempting</p>
              <Markdown source={distractor} className="mt-1 text-[14px] text-zinc-300" />
            </div>
          )}
          {q.explanation && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold text-zinc-400">Explanation</p>
              <Markdown source={q.explanation} className="mt-1 text-[14px] text-zinc-300" />
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            {onNext && (
              <button
                ref={nextRef}
                type="button"
                onClick={onNext}
                className="rounded bg-mint px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
              >
                Next question
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setChoice(undefined);
                onRetry();
              }}
              className="text-[13px] text-zinc-400 transition hover:text-white"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function FrqCard({ q, rec, onSave }: { q: ApFrq; rec: FrqRecord | undefined; onSave: (r: FrqRecord | null) => void }) {
  const [draft, setDraft] = useState(rec?.draft ?? "");
  const revealed = rec?.revealed ?? false;
  const scores = rec?.scores ?? q.rubric.map(() => null);
  const total = scores.reduce<number>((n, s) => n + (s ?? 0), 0);
  const scoredAll = scores.every((s) => s !== null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const persist = (patch: Partial<FrqRecord>) => {
    clearTimeout(timer.current);
    onSave({ kind: "frq", draft, revealed, scores, at: Date.now(), ...patch });
  };

  return (
    <div>
      <p className="nums text-[12px] text-zinc-500">
        {q.frqType} &middot; {q.points} point{q.points === 1 ? "" : "s"}
        {q.minutes ? ` · about ${q.minutes} minutes` : ""}
      </p>

      {q.stimulus && (
        <div className="mt-4 border-l-2 border-white/15 pl-4">
          <Markdown source={q.stimulus} className="text-[15px] text-zinc-200" />
        </div>
      )}
      {q.prompt && <Markdown source={q.prompt} className="mt-4 text-[15px] font-medium text-white" />}

      {q.parts && (
        <ol className="mt-4 space-y-3">
          {q.parts.map((p, k) => (
            <li key={k} className="flex gap-3">
              <span className="w-6 flex-shrink-0 text-[14px] font-semibold text-zinc-400">{p.label}</span>
              <div className="min-w-0 flex-1">
                <Markdown source={p.prompt} className="text-[15px] text-zinc-200" />
                {p.points > 0 && (
                  <span className="nums text-[12px] text-zinc-600">
                    {p.points} pt{p.points === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <label htmlFor={`frq-${q.id}`} className="mt-6 block text-[12px] text-zinc-500">
        Your response
      </label>
      <textarea
        id={`frq-${q.id}`}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          // Save drafts after a pause rather than on every keystroke.
          clearTimeout(timer.current);
          timer.current = setTimeout(
            () => onSave({ kind: "frq", draft: v, revealed, scores, at: Date.now() }),
            500
          );
        }}
        rows={10}
        className="ap-text mt-1.5 w-full rounded border border-white/15 bg-white/[0.03] px-3 py-2.5 text-[15px] leading-relaxed text-white focus:border-mint/60 focus:outline-none"
        placeholder="Write it as you would on the exam, then reveal the rubric."
      />

      {!revealed ? (
        <button
          type="button"
          onClick={() => persist({ revealed: true })}
          className="mt-4 rounded bg-mint px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
        >
          Reveal rubric and sample
        </button>
      ) : (
        <div className="mt-8 space-y-8">
          <section aria-label="Rubric">
            <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.14] pb-2">
              <h3 className="font-display text-base font-bold text-white">Score yourself</h3>
              <span className="nums text-[13px] text-zinc-400" aria-live="polite">
                <span className={scoredAll ? "text-mint" : ""}>{total}</span> / {q.points}
              </span>
            </div>
            {q.rubric.map((r, k) => (
              <div key={k} className="border-b border-white/[0.07] py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <span className="text-sm font-medium text-zinc-100">{r.criterion}</span>
                  <div role="radiogroup" aria-label={`Points for ${r.criterion}`} className="flex gap-1.5">
                    {Array.from({ length: r.points + 1 }, (_, p) => (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={scores[k] === p}
                        onClick={() => {
                          const next = scores.slice();
                          next[k] = p;
                          persist({ scores: next });
                        }}
                        className={`nums h-7 min-w-[1.75rem] rounded border px-1.5 text-[12px] font-semibold transition ${
                          scores[k] === p
                            ? "border-mint bg-mint text-ink-950"
                            : "border-white/15 text-zinc-400 hover:border-white/40 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <Markdown source={r.description} className="mt-1.5 text-[13px] text-zinc-400" />
              </div>
            ))}
          </section>

          {q.sampleResponse && (
            <section>
              <h3 className="border-b border-white/[0.14] pb-2 font-display text-base font-bold text-white">
                Sample response
              </h3>
              <Markdown source={q.sampleResponse} className="mt-4 text-[14px] text-zinc-300" />
            </section>
          )}

          <button
            type="button"
            onClick={() => persist({ revealed: false, scores: q.rubric.map(() => null) })}
            className="text-[13px] text-zinc-400 transition hover:text-white"
          >
            Hide and try again
          </button>
        </div>
      )}
    </div>
  );
}

function Navigator({
  list,
  current,
  status,
  onPick,
}: {
  list: ApQuestion[];
  current: number;
  status: (q: ApQuestion) => "none" | "right" | "wrong" | "done" | "draft";
  onPick: (k: number) => void;
}) {
  const tone = {
    none: "border-white/12 text-zinc-500",
    right: "border-mint/50 bg-mint/10 text-mint",
    wrong: "border-rose-400/50 bg-rose-400/10 text-rose-300",
    done: "border-white/30 bg-white/10 text-zinc-200",
    draft: "border-white/25 text-zinc-300",
  };
  const label = { none: "", right: ", correct", wrong: ", missed", done: ", scored", draft: ", draft saved" };
  return (
    <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Questions">
      {list.map((x, k) => {
        const s = status(x);
        return (
          <button
            key={x.id}
            type="button"
            onClick={() => onPick(k)}
            aria-current={k === current ? "step" : undefined}
            aria-label={`Question ${k + 1}${x.type === "frq" ? " (free response)" : ""}${label[s]}`}
            className={`nums h-7 min-w-[1.75rem] rounded border px-1.5 text-[12px] font-semibold transition ${tone[s]} ${
              k === current ? "outline outline-2 outline-offset-1 outline-white/70" : "hover:border-white/40"
            }`}
          >
            {x.type === "frq" ? `F${k + 1}` : k + 1}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded border px-2.5 py-1 text-[12px] transition ${
            o.value === value
              ? "border-mint/60 bg-mint/10 font-semibold text-white"
              : "border-white/12 text-zinc-400 hover:border-white/30 hover:text-white"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="nums ml-1.5 text-zinc-500">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel mt-5 p-6">
      <p className="text-sm text-zinc-400">{children}</p>
    </div>
  );
}
