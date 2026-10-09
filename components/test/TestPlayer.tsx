"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionPane } from "./QuestionPane";
import { DesmosPanel } from "./DesmosPanel";
import { ResultsScreen } from "./ResultsScreen";
import {
  type Item,
  type Route,
  type SectionId,
  type TestForm,
} from "@/lib/testEngine/types";

type Phase = "intro" | "module" | "review" | "break" | "done";

async function fetchRoute(
  formId: string | undefined,
  sectionId: SectionId,
  responses: Record<string, string>
): Promise<Route> {
  if (!formId) return "lower";
  try {
    const res = await fetch(`/api/tests/${encodeURIComponent(formId)}/route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionId, responses }),
    });
    const json = (await res.json()) as { route?: Route };
    return json.route === "upper" ? "upper" : "lower";
  } catch {
    return "lower";
  }
}

function clock(total: number): string {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TestPlayer({
  form,
  fast,
  scorable = true,
  formId,
  preview = false,
  builtIn = false,
}: {
  form: TestForm;
  fast: boolean;
  /** False for uploads with no answer key: deliverable, but not scoreable. */
  scorable?: boolean;
  /** Library id used for routing and review requests. */
  formId?: string;
  /** Admin preview of an unpublished test. Results are not saved. */
  preview?: boolean;
  /** The built-in placeholder form rather than an authored Klutch test. */
  builtIn?: boolean;
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
  const [isPaused, setIsPaused] = useState(false);
  const [showDesmos, setShowDesmos] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [warnedFiveMin, setWarnedFiveMin] = useState(false);
  const [fiveMinToast, setFiveMinToast] = useState(false);

  /** Active seconds per item id — survives module transitions until results. */
  const [itemTimes, setItemTimes] = useState<Record<string, number>>({});
  const [answerChanges, setAnswerChanges] = useState<Record<string, number>>(
    {}
  );
  const [pageVisible, setPageVisible] = useState(true);
  const [windowFocused, setWindowFocused] = useState(true);
  const timingItemRef = useRef<string | null>(null);
  const advancing = useRef(false);
  /** Keyed form, fetched only after the last module is submitted. */
  const [reviewForm, setReviewForm] = useState<TestForm | null>(null);
  const [reviewError, setReviewError] = useState(false);

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
    setIsPaused(false);
    setWarnedFiveMin(false);
    setFiveMinToast(false);
    setShowNavigator(false);
    setShowDesmos(false);
    setShowRef(false);
    setPhase("module");
  }, [moduleSeconds]);

  /** Module 1 performance picks the module 2 form; the server holds the keys. */
  const advance = useCallback(async () => {
    if (!section || !activeModule || advancing.current) return;

    setIsPaused(false);
    setShowNavigator(false);
    setShowDesmos(false);
    setShowRef(false);
    setWarnedFiveMin(false);
    setFiveMinToast(false);

    if (moduleNum === 1) {
      advancing.current = true;
      const route = await fetchRoute(formId, section.id, responses);
      advancing.current = false;
      setRoutes((r) => ({ ...r, [section.id]: route }));
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
    formId,
    section,
    activeModule,
    moduleNum,
    responses,
    sectionIdx,
    form.sections.length,
    moduleSeconds,
    breakSeconds,
  ]);

  const loadReview = useCallback(() => {
    fetch(`/api/tests/${encodeURIComponent(formId ?? form.id)}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ routes, responses }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { form: TestForm }) => setReviewForm(json.form))
      .catch(() => setReviewError(true));
  }, [formId, form.id, routes, responses]);

  useEffect(() => {
    if (phase === "done" && !reviewForm) loadReview();
    // Only on entering the results phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const resumeAfterBreak = useCallback(() => {
    const next = sectionIdx + 1;
    setSectionIdx(next);
    setModuleNum(1);
    setQIdx(0);
    setSecondsLeft(fast ? 45 : form.sections[next].secondsPerModule);
    setIsPaused(false);
    setWarnedFiveMin(false);
    setFiveMinToast(false);
    setShowNavigator(false);
    setShowDesmos(false);
    setShowRef(false);
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

  // Accumulate active time only while a question is displayed and unpaused.
  useEffect(() => {
    const activeId =
      phase === "module" && item && pageVisible && windowFocused && !isPaused
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
  }, [phase, item?.id, pageVisible, windowFocused, isPaused]);

  // One ticking clock drives modules, the review screen, and the break.
  // Pausing freezes the interval cleanly.
  useEffect(() => {
    if (phase !== "module" && phase !== "review" && phase !== "break") return;
    if (secondsLeft <= 0 || isPaused) return;

    const t = setInterval(
      () => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [phase, secondsLeft > 0, isPaused]);

  // College Board 5-minute warning alert
  useEffect(() => {
    if (
      phase === "module" &&
      secondsLeft <= 300 &&
      secondsLeft > 0 &&
      !warnedFiveMin &&
      !fast
    ) {
      setWarnedFiveMin(true);
      setTimerHidden(false); // Cannot hide timer in last 5 minutes
      setFiveMinToast(true);
      const timer = setTimeout(() => setFiveMinToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [phase, secondsLeft, warnedFiveMin, fast]);

  useEffect(() => {
    if (secondsLeft !== 0 || isPaused) return;
    if (phase === "module" || phase === "review") advance();
    else if (phase === "break") resumeAfterBreak();
  }, [secondsLeft, phase, isPaused, advance, resumeAfterBreak]);

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
          {builtIn
            ? "The questions in this form are placeholders that exercise the player. Scores are not calibrated."
            : "An original Klutch practice test. Timing and module routing follow the digital SAT format; the score is an estimate with a wide margin, not an official score."}
        </p>
        {preview && (
          <p className="mt-3 text-[13px] text-amber-300">
            Admin preview. This test may be unpublished, and results are not saved.
          </p>
        )}
        {fast && (
          <p className="mt-3 text-[13px] text-amber-300">
            Fast mode: every clock is compressed to 45 seconds.
          </p>
        )}
        <button
          type="button"
          onClick={startModule}
          className="mt-8 rounded bg-mint px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 shadow-md shadow-mint/10"
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
    if (!reviewForm) {
      return (
        <Shell>
          <p className="text-sm text-zinc-400">
            {reviewError ? "Couldn\u2019t load your results. " : "Scoring your test\u2026"}
          </p>
          {reviewError && (
            <button
              type="button"
              onClick={() => {
                setReviewError(false);
                loadReview();
              }}
              className="mt-4 rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950"
            >
              Try again
            </button>
          )}
        </Shell>
      );
    }
    return (
      <ResultsScreen
        form={reviewForm}
        routes={routes}
        responses={responses}
        flags={flags}
        itemTimes={itemTimes}
        answerChanges={answerChanges}
        scorable={scorable}
        preview={preview}
      />
    );
  }

  if (!section || !activeModule || !item) return null;

  const answeredCount = items.filter((i) => responses[i.id]).length;
  const isFinalFiveMin = secondsLeft <= 300 && !fast;

  // ------------------------------------------------------- module + review
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-ink-950 select-none">
      {/* 5-minute warning alert banner */}
      {fiveMinToast && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 text-center text-sm font-medium text-amber-200 flex items-center justify-center gap-3">
          <span>⏰ 5 minutes remaining in this module.</span>
          <button
            type="button"
            onClick={() => setFiveMinToast(false)}
            className="text-[12px] text-amber-300 underline underline-offset-2 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
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

          {/* Centered Timer */}
          <div className="mx-auto text-center">
            <div
              className={`nums font-display text-2xl font-bold tabular-nums transition ${
                isFinalFiveMin ? "text-amber-400 animate-pulse" : "text-white"
              }`}
            >
              {timerHidden ? "Hidden" : clock(secondsLeft)}
            </div>
            <button
              type="button"
              disabled={isFinalFiveMin}
              onClick={() => setTimerHidden((h) => !h)}
              className="text-[12px] text-zinc-500 transition hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isFinalFiveMin
                ? "Locked (last 5 min)"
                : timerHidden
                ? "Show timer"
                : "Hide timer"}
            </button>
          </div>

          {/* Tools & Pause */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaused(true)}
              title="Pause the test and timer"
              className="rounded border border-white/15 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-300 transition hover:border-white/35 hover:text-white"
            >
              Pause
            </button>

            {isMath && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDesmos((d) => !d)}
                  className={`rounded border px-2.5 py-1.5 text-[12px] font-semibold transition ${
                    showDesmos
                      ? "border-mint bg-mint/10 text-mint"
                      : "border-white/15 text-zinc-300 hover:text-white"
                  }`}
                >
                  Calculator
                </button>
                <button
                  type="button"
                  onClick={() => setShowRef((r) => !r)}
                  className={`rounded border px-2.5 py-1.5 text-[12px] font-semibold transition ${
                    showRef
                      ? "border-mint bg-mint/10 text-mint"
                      : "border-white/15 text-zinc-300 hover:text-white"
                  }`}
                >
                  Reference
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Floating Tools */}
      {showRef && isMath && <ReferenceSheet onClose={() => setShowRef(false)} />}
      {showDesmos && isMath && (
        <DesmosPanel onClose={() => setShowDesmos(false)} />
      )}

      {/* Test Paused Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95 backdrop-blur-md px-6">
          <div className="panel max-w-lg w-full border border-white/20 p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint/10 border border-mint/30 text-mint">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold text-white tracking-tight">
              Test Paused
            </h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Your test is currently paused and the timer has stopped. Questions
              are obscured while paused so your pacing and scoring stay accurate.
            </p>

            <div className="mt-6 rounded border border-white/10 bg-white/[0.03] p-4 text-left space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-zinc-400">Current section:</span>
                <span className="font-semibold text-white">
                  {section.name}, Module {moduleNum}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-zinc-400">Current question:</span>
                <span className="font-semibold text-white">
                  Question {qIdx + 1} of {items.length}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-zinc-400">Time remaining:</span>
                <span className="nums font-bold text-mint">
                  {clock(secondsLeft)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPaused(false)}
              className="mt-7 w-full rounded bg-mint py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 shadow-lg shadow-mint/20"
            >
              Resume Testing
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
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
        )}
      </main>

      {/* In-test Question Navigator Popover */}
      {showNavigator && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6"
          onClick={() => setShowNavigator(false)}
        >
          <div
            className="panel max-w-xl w-full border border-white/20 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {section.name} · Module {moduleNum}
                </h3>
                <p className="text-[12px] text-zinc-400">
                  Select a question to jump directly to it
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNavigator(false)}
                className="text-sm text-zinc-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2 max-h-[50vh] overflow-y-auto py-2">
              {items.map((it, i) => {
                const isCurrent = i === qIdx;
                const answered = Boolean(responses[it.id]);
                const flagged = Boolean(flags[it.id]);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setQIdx(i);
                      setPhase("module");
                      setShowNavigator(false);
                    }}
                    className={`nums relative h-10 rounded border text-[13px] font-semibold transition ${
                      isCurrent
                        ? "border-mint bg-mint text-ink-950 font-bold ring-2 ring-mint/50"
                        : answered
                        ? "border-mint/50 bg-mint/10 text-white"
                        : "border-dashed border-white/20 text-zinc-400 hover:text-white"
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

            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[12px] text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-mint/50 bg-mint/10" />
                  Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-white/25" />
                  Unanswered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  Flagged
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNavigator(false);
                  setPhase("review");
                }}
                className="text-mint font-semibold hover:underline"
              >
                Review module →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="sticky bottom-0 border-t border-white/[0.1] bg-ink-950 px-6 py-3">
        <div className="mx-auto flex max-w-[84rem] items-center gap-4">
          {/* Interactive Question Jump Navigator Trigger */}
          <button
            type="button"
            onClick={() => setShowNavigator(true)}
            className="flex items-center gap-2 rounded border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[13px] font-medium text-zinc-300 transition hover:border-mint/50 hover:bg-white/[0.08] hover:text-white"
            title="Open question navigator grid"
          >
            <span className="nums font-semibold text-white">
              Question {qIdx + 1} of {items.length}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="nums text-zinc-400">
              {answeredCount} answered
            </span>
            <svg
              className="h-3.5 w-3.5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>

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
