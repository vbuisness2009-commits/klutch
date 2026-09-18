"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionPane } from "./QuestionPane";
import { DesmosPanel } from "./DesmosPanel";
import { ResultsScreen } from "./ResultsScreen";
import {
  isCorrect,
  scoredItems,
  type Item,
  type Route,
  type SectionId,
  type TestForm,
} from "@/lib/testEngine/types";

type Phase = "intro" | "module" | "review" | "break" | "done";

function clock(total: number): string {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TestPlayer({
  form,
  fast,
  scorable = true,
  realPaper = false,
}: {
  form: TestForm;
  fast: boolean;
  /** False for uploads with no answer key: deliverable, but not scoreable. */
  scorable?: boolean;
  /** True for uploaded past papers (not the synthetic practice-a pool). */
  realPaper?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [sectionIdx, setSectionIdx] = useState(0);
  const [moduleNum, setModuleNum] = useState<1 | 2>(1);
  const [qIdx, setQIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [eliminated, setEliminated] = useState<Record<string, string[]>>({});
  const [routes, setRoutes] = useState<Partial<Record<SectionId, Route>>>({});
  const [eliminatorOn, setEliminatorOn] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showDesmos, setShowDesmos] = useState(false);
  const [showRef, setShowRef] = useState(false);
  /** Active seconds per item id — survives module transitions until results. */
  const [itemTimes, setItemTimes] = useState<Record<string, number>>({});
  const [answerChanges, setAnswerChanges] = useState<Record<string, number>>(
    {}
  );
  const [pageVisible, setPageVisible] = useState(true);
  const [windowFocused, setWindowFocused] = useState(true);
  const timingItemRef = useRef<string | null>(null);

  const section = form.sections[sectionIdx];
  const isMath = section?.id === "math";

  // `fast` compresses every clock to 45 seconds so the whole flow, including
  // both module boundaries and the break, can be walked in a couple of minutes.
  const moduleSeconds = fast ? 45 : section?.secondsPerModule ?? 0;
  const breakSeconds = fast ? 20 : form.breakSeconds;

  const activeModule = useMemo(() => {
    if (!section) return null;
    if (moduleNum === 1) return section.module1;
    return section.module2[routes[section.id] ?? "lower"];
  }, [section, moduleNum, routes]);

  const items: Item[] = activeModule?.items ?? [];
  const item = items[qIdx];

  const startModule = useCallback(() => {
    setQIdx(0);
    setSecondsLeft(moduleSeconds);
    setPhase("module");
  }, [moduleSeconds]);

  /** Module 1 performance picks the module 2 form. Scored items only. */
  const advance = useCallback(() => {
    if (!section || !activeModule) return;

    if (moduleNum === 1) {
      const correct = scoredItems(activeModule.items).filter((it) =>
        isCorrect(it, responses[it.id])
      ).length;
      setRoutes((r) => ({
        ...r,
        [section.id]: correct >= section.routeUpAt ? "upper" : "lower",
      }));
      setModuleNum(2);
      setQIdx(0);
      setSecondsLeft(moduleSeconds);
      setPhase("module");
      return;
    }

    if (sectionIdx < form.sections.length - 1) {
      setSecondsLeft(breakSeconds);
      setPhase("break");
      return;
    }
    setPhase("done");
  }, [
    section,
    activeModule,
    moduleNum,
    responses,
    sectionIdx,
    form.sections.length,
    moduleSeconds,
    breakSeconds,
  ]);

  const resumeAfterBreak = useCallback(() => {
    const next = sectionIdx + 1;
    setSectionIdx(next);
    setModuleNum(1);
    setQIdx(0);
    setSecondsLeft(fast ? 45 : form.sections[next].secondsPerModule);
    setPhase("module");
  }, [sectionIdx, form.sections, fast]);

  // Visibility / focus — pause per-question timing when the student looks away.
  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    const onBlur = () => setWindowFocused(false);
    const onFocus = () => setWindowFocused(true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Accumulate active time only while a question is displayed in module phase.
  // Uses wall-clock deltas so brief visits still count (not just whole seconds).
  useEffect(() => {
    const activeId =
      phase === "module" && item && pageVisible && windowFocused
        ? item.id
        : null;
    timingItemRef.current = activeId;
    if (!activeId) return;

    let last = performance.now();
    const add = (now: number) => {
      const id = timingItemRef.current;
      if (!id) return;
      const delta = (now - last) / 1000;
      last = now;
      if (delta <= 0) return;
      setItemTimes((prev) => ({
        ...prev,
        [id]: (prev[id] ?? 0) + delta,
      }));
    };

    const tick = setInterval(() => add(performance.now()), 250);
    return () => {
      add(performance.now());
      clearInterval(tick);
    };
  }, [phase, item?.id, pageVisible, windowFocused]);

  // One ticking clock drives modules, the review screen, and the break.
  // Stop the interval at 0 so a late tick cannot race past advance() and
  // overwrite the freshly reset module timer with a negative value.
  useEffect(() => {
    if (phase !== "module" && phase !== "review" && phase !== "break") return;
    if (secondsLeft <= 0) return;
    const t = setInterval(
      () => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [phase, secondsLeft > 0]);

  useEffect(() => {
    if (secondsLeft !== 0) return;
    if (phase === "module" || phase === "review") advance();
    else if (phase === "break") resumeAfterBreak();
  }, [secondsLeft, phase, advance, resumeAfterBreak]);

  const respond = (value: string) => {
    if (!item) return;
    setResponses((r) => {
      const prev = r[item.id];
      if (prev && prev !== value) {
        setAnswerChanges((c) => ({
          ...c,
          [item.id]: (c[item.id] ?? 0) + 1,
        }));
      }
      return { ...r, [item.id]: value };
    });
  };


  // ---------------------------------------------------------------- intro
  if (phase === "intro") {
    return (
      <Shell>
        <h1 className="font-display text-[30px] font-bold tracking-tight text-white">
          {form.name}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-zinc-400">
          Two sections, two timed modules each. You can move freely inside a
          module, but once a module ends it closes for good, exactly like the
          real thing. There is a break between sections.
        </p>
        <dl className="nums mt-7 max-w-md">
          {form.sections.map((s) => (
            <div
              key={s.id}
              className="flex justify-between border-b border-white/[0.07] py-2.5 text-sm"
            >
              <dt className="text-zinc-300">{s.name}</dt>
              <dd className="text-zinc-500">
                2 modules &middot; {s.module1.items.length} questions &middot;{" "}
                {Math.round(s.secondsPerModule / 60)} min each
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-[60ch] text-[13px] leading-relaxed text-zinc-500">
          {realPaper
            ? "This is an uploaded past paper. Timing and module routing match the digital SAT; the score is an ability estimate with a wide margin until the item pool is calibrated."
            : "The questions in this form are placeholders while the item pool is built. Scores are not calibrated and are shown as a raw count only."}
        </p>
        {fast && (
          <p className="mt-3 text-[13px] text-amber-300">
            Fast mode: every clock is compressed to 45 seconds.
          </p>
        )}
        <button
          type="button"
          onClick={startModule}
          className="mt-8 rounded bg-mint px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
        >
          Start section 1
        </button>
      </Shell>
    );
  }

  // ---------------------------------------------------------------- break
  if (phase === "break") {
    return (
      <Shell>
        <h1 className="font-display text-[30px] font-bold tracking-tight text-white">
          Break
        </h1>
        <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
          Reading and Writing is finished and closed. Math begins when the clock
          runs out, or as soon as you choose to resume.
        </p>
        <div className="nums mt-8 font-display text-[56px] font-bold leading-none text-white">
          {clock(secondsLeft)}
        </div>
        <button
          type="button"
          onClick={resumeAfterBreak}
          className="mt-8 rounded bg-mint px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
        >
          Resume testing
        </button>
      </Shell>
    );
  }

  // ---------------------------------------------------------------- done
  if (phase === "done") {
    return (
      <ResultsScreen
        form={form}
        routes={routes}
        responses={responses}
        flags={flags}
        itemTimes={itemTimes}
        answerChanges={answerChanges}
        scorable={scorable}
      />
    );
  }

  if (!section || !activeModule || !item) return null;

  const answeredCount = items.filter((i) => responses[i.id]).length;

  // ------------------------------------------------------- module + review
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-ink-950">
      <header className="border-b border-white/[0.1] px-6 py-3">
        <div className="mx-auto flex max-w-[84rem] items-center gap-6">
          <div>
            <div className="text-sm font-semibold text-white">
              {section.name}, Module {moduleNum}
            </div>
            <div className="text-[12px] text-zinc-500">
              {moduleNum === 2
                ? `Routed to the ${routes[section.id] ?? "lower"} form`
                : "This module decides which module 2 you get"}
            </div>
          </div>

          <div className="mx-auto text-center">
            <div className="nums font-display text-2xl font-bold tabular-nums text-white">
              {timerHidden ? "Hidden" : clock(secondsLeft)}
            </div>
            <button
              type="button"
              onClick={() => setTimerHidden((h) => !h)}
              className="text-[12px] text-zinc-500 transition hover:text-white"
            >
              {timerHidden ? "Show timer" : "Hide timer"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isMath && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDesmos((d) => !d)}
                  className="rounded border border-white/15 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-300 transition hover:text-white"
                >
                  Calculator
                </button>
                <button
                  type="button"
                  onClick={() => setShowRef((r) => !r)}
                  className="rounded border border-white/15 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-300 transition hover:text-white"
                >
                  Reference
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {showRef && isMath && <ReferenceSheet onClose={() => setShowRef(false)} />}
      {showDesmos && isMath && (
        <DesmosPanel onClose={() => setShowDesmos(false)} />
      )}

      <main className="flex-1">
        {phase === "review" ? (
          <ReviewScreen
            items={items}
            responses={responses}
            flags={flags}
            onJump={(i) => {
              setQIdx(i);
              setPhase("module");
            }}
          />
        ) : (
          <div>
            <div>
              <QuestionPane
                item={item}
                number={qIdx + 1}
                response={responses[item.id]}
                flagged={Boolean(flags[item.id])}
                eliminated={eliminated[item.id] ?? []}
                eliminatorOn={eliminatorOn}
                onRespond={respond}
                onToggleFlag={() =>
                  setFlags((f) => ({ ...f, [item.id]: !f[item.id] }))
                }
                onToggleEliminate={(cid) =>
                  setEliminated((e) => {
                    const cur = e[item.id] ?? [];
                    return {
                      ...e,
                      [item.id]: cur.includes(cid)
                        ? cur.filter((x) => x !== cid)
                        : [...cur, cid],
                    };
                  })
                }
                onToggleEliminator={() => setEliminatorOn((v) => !v)}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-white/[0.1] bg-ink-950 px-6 py-3">
        <div className="mx-auto flex max-w-[84rem] items-center gap-4">
          <span className="nums text-[13px] text-zinc-500">
            {answeredCount} of {items.length} answered
          </span>
          <div className="ml-auto flex items-center gap-2">
            {phase === "module" && (
              <>
                <button
                  type="button"
                  onClick={() => setQIdx((i) => Math.max(0, i - 1))}
                  disabled={qIdx === 0}
                  className="rounded border border-white/15 px-4 py-2 text-[13px] font-semibold text-white transition hover:border-white/35 disabled:opacity-35"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() =>
                    qIdx === items.length - 1
                      ? setPhase("review")
                      : setQIdx((i) => i + 1)
                  }
                  className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400"
                >
                  {qIdx === items.length - 1 ? "Review module" : "Next"}
                </button>
              </>
            )}
            {phase === "review" && (
              <>
                <button
                  type="button"
                  onClick={() => setPhase("module")}
                  className="rounded border border-white/15 px-4 py-2 text-[13px] font-semibold text-white transition hover:border-white/35"
                >
                  Keep working
                </button>
                <button
                  type="button"
                  onClick={advance}
                  className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400"
                >
                  {moduleNum === 1
                    ? "Submit module"
                    : sectionIdx < form.sections.length - 1
                    ? "Submit and break"
                    : "Finish test"}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">{children}</section>
  );
}

function ReviewScreen({
  items,
  responses,
  flags,
  onJump,
}: {
  items: Item[];
  responses: Record<string, string>;
  flags: Record<string, boolean>;
  onJump: (i: number) => void;
}) {
  const unanswered = items.filter((i) => !responses[i.id]).length;
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-white">
        Check your work
      </h2>
      <p className="nums mt-2 text-sm text-zinc-400">
        {unanswered === 0
          ? "Every question is answered."
          : `${unanswered} unanswered.`}{" "}
        Once you submit, this module closes and you cannot come back to it.
      </p>

      <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
        {items.map((it, i) => {
          const answered = Boolean(responses[it.id]);
          const flagged = Boolean(flags[it.id]);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onJump(i)}
              className={`nums relative h-11 rounded border text-[13px] font-semibold transition ${
                answered
                  ? "border-mint/50 bg-mint/10 text-white"
                  : "border-dashed border-white/20 text-zinc-500 hover:text-white"
              }`}
            >
              {i + 1}
              {flagged && (
                <span
                  aria-label="marked for review"
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-5 text-[12px] text-zinc-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-mint/50 bg-mint/10" />
          Answered
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-dashed border-white/20" />
          Unanswered
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          Marked for review
        </span>
      </div>
    </div>
  );
}

function ReferenceSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-b border-white/[0.1] bg-ink-900 px-6 py-5">
      <div className="mx-auto flex max-w-[84rem] items-start gap-8">
        <dl className="grid flex-1 grid-cols-2 gap-x-10 gap-y-2 text-[13px] sm:grid-cols-3">
          {[
            ["Circle", "A = πr², C = 2πr"],
            ["Rectangle", "A = ℓw"],
            ["Triangle", "A = ½bh"],
            ["Right triangle", "a² + b² = c²"],
            ["Special right", "30-60-90: x, x√3, 2x"],
            ["Special right", "45-45-90: s, s, s√2"],
            ["Cylinder", "V = πr²h"],
            ["Sphere", "V = 4⁄3 πr³"],
            ["Cone", "V = 1⁄3 πr²h"],
          ].map(([k, v], i) => (
            <div key={i} className="flex justify-between gap-3">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="text-zinc-200">{v}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] text-zinc-500 transition hover:text-white"
        >
          Close
        </button>
      </div>
      <p className="mx-auto mt-3 max-w-[84rem] text-[12px] text-zinc-600">
        Arc measure in degrees in a circle is 360. Sum of the angles of a
        triangle is 180.
      </p>
    </div>
  );
}
