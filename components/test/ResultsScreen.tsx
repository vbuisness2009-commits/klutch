"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeedbackChat } from "./FeedbackChat";
import { DesmosVisualizer } from "./DesmosVisualizer";
import { resolveProblemSolution, type ProblemSolution } from "@/lib/testEngine/desmosSolver";
import { attemptFromAnalytics } from "@/lib/attempts";
import { saveAttempt, type SaveResult } from "@/lib/attemptsClient";
import { formatMathHtml } from "@/lib/formatMath";
import {
  HEURISTIC_NOTE,
  buildSessionAnalytics,
  formatTime,
  stemSnippet,
  toFeedbackPayload,
  type ItemAnalytics,
} from "@/lib/testEngine/analytics";
import {
  isSpr,
  type Item,
  type Route,
  type SectionId,
  type SolutionPath,
  type TestForm,
} from "@/lib/testEngine/types";

type Props = {
  form: TestForm;
  routes: Partial<Record<SectionId, Route>>;
  responses: Record<string, string>;
  flags?: Record<string, boolean>;
  itemTimes?: Record<string, number>;
  answerChanges?: Record<string, number>;
  scorable?: boolean;
  /** Admin preview of an unpublished test: never saved to an account. */
  preview?: boolean;
};

type ModuleMeta = {
  id: string;
  sectionId: SectionId;
  sectionName: string;
  moduleNum: 1 | 2;
  title: string;
  subtitle: string;
  route?: Route;
  routeLabel: string;
  items: ItemAnalytics[];
  correctCount: number;
  totalCount: number;
  missedCount: number;
  slowCount: number;
  scoreText: string;
  pct: number;
};

export function ResultsScreen({
  form,
  routes,
  responses,
  flags = {},
  itemTimes = {},
  answerChanges = {},
  scorable = true,
  preview = false,
}: Props) {
  const analytics = useMemo(
    () =>
      buildSessionAnalytics({
        form,
        routes,
        responses,
        flags,
        itemTimes,
        answerChanges,
        scorable,
      }),
    [form, routes, responses, flags, itemTimes, answerChanges, scorable]
  );

  const feedbackPayload = useMemo(() => {
    const snippets: Record<string, string> = {};
    for (const section of form.sections) {
      const route = routes[section.id] ?? "lower";
      for (const item of [
        ...section.module1.items,
        ...section.module2[route].items,
      ]) {
        const row = analytics.items.find((i) => i.itemId === item.id);
        if (row && (row.correct === false || row.excessive)) {
          snippets[item.id] = stemSnippet(item);
        }
      }
    }
    return toFeedbackPayload(analytics, snippets);
  }, [analytics, form, routes]);

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const section of form.sections) {
      const route = routes[section.id] ?? "lower";
      for (const item of [
        ...section.module1.items,
        ...section.module2[route].items,
      ]) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [form, routes]);

  // Compute the 4 modules metadata
  const modules = useMemo<ModuleMeta[]>(() => {
    const list: ModuleMeta[] = [];

    for (const section of form.sections) {
      const route = routes[section.id] ?? "lower";
      const isRw = section.id === "rw";

      // Module 1
      const m1Items = analytics.items.filter(
        (i) => i.sectionId === section.id && i.moduleNum === 1
      );
      const m1Correct = m1Items.filter((i) => i.correct === true).length;
      const m1Missed = m1Items.filter((i) => i.correct === false).length;
      const m1Slow = m1Items.filter((i) => i.excessive).length;
      const m1Total = m1Items.length;

      list.push({
        id: `${section.id}-m1`,
        sectionId: section.id,
        sectionName: section.name,
        moduleNum: 1,
        title: isRw ? "Reading & Writing" : "Math",
        subtitle: "Module 1",
        routeLabel: "Routing Base",
        items: m1Items,
        correctCount: m1Correct,
        totalCount: m1Total,
        missedCount: m1Missed,
        slowCount: m1Slow,
        scoreText: `${m1Correct}/${m1Total}`,
        pct: m1Total > 0 ? Math.round((m1Correct / m1Total) * 100) : 0,
      });

      // Module 2
      const m2Items = analytics.items.filter(
        (i) => i.sectionId === section.id && i.moduleNum === 2
      );
      const m2Correct = m2Items.filter((i) => i.correct === true).length;
      const m2Missed = m2Items.filter((i) => i.correct === false).length;
      const m2Slow = m2Items.filter((i) => i.excessive).length;
      const m2Total = m2Items.length;

      list.push({
        id: `${section.id}-m2`,
        sectionId: section.id,
        sectionName: section.name,
        moduleNum: 2,
        title: isRw ? "Reading & Writing" : "Math",
        subtitle: "Module 2",
        route,
        routeLabel: route === "upper" ? "Harder Route" : "Standard Route",
        items: m2Items,
        correctCount: m2Correct,
        totalCount: m2Total,
        missedCount: m2Missed,
        slowCount: m2Slow,
        scoreText: `${m2Correct}/${m2Total}`,
        pct: m2Total > 0 ? Math.round((m2Correct / m2Total) * 100) : 0,
      });
    }

    return list;
  }, [form, routes, analytics]);

  const [activeModuleId, setActiveModuleId] = useState<string>(
    modules[0]?.id ?? "rw-m1"
  );

  const activeModule = useMemo(() => {
    return modules.find((m) => m.id === activeModuleId) ?? modules[0];
  }, [modules, activeModuleId]);

  const [saveStatus, setSaveStatus] = useState<SaveResult | "saving">("saving");
  const savedOnce = useRef(false);
  useEffect(() => {
    if (savedOnce.current || preview) return;
    savedOnce.current = true;
    void saveAttempt(attemptFromAnalytics(analytics)).then(setSaveStatus);
  }, [analytics, preview]);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(52,211,153,0.09),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_20%,rgba(255,255,255,0.03),transparent)]"
      />

      <section
        className="relative mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12"
        data-testid="results-screen"
      >
        {/* Score Hero Header */}
        {!scorable ? (
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint/70">
              Complete
            </p>
            <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight text-white">
              Test finished
            </h1>
            <p className="mt-2 text-[14px] text-zinc-400">
              No answer key on this form — timing and coaching still active.
            </p>
          </header>
        ) : (
          <ScoreHero result={analytics.score!} totals={analytics.totals} />
        )}

        {preview ? (
          <p className="mt-3 text-[12px] text-amber-300/90">
            Admin preview. This result is not saved to any account.
          </p>
        ) : (
          <SaveStatus status={saveStatus} />
        )}

        {/* 4 Minimalist Module Squares */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
              Module Performance
            </h2>
            <span className="text-[12px] text-zinc-500">
              Click any square to inspect breakdown
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {modules.map((mod) => {
              const isSelected = mod.id === activeModuleId;
              const isHarder = mod.route === "upper";
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModuleId(mod.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-mint bg-mint/[0.08] shadow-[0_0_20px_rgba(52,211,153,0.15)] ring-1 ring-mint/50"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Top: Module name & Route Tag */}
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium tracking-tight text-zinc-400">
                        {mod.title}
                      </span>
                      {mod.moduleNum === 2 && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                            isHarder
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {isHarder ? "Harder" : "Standard"}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-zinc-200">
                      {mod.subtitle}
                    </div>
                  </div>

                  {/* Middle: Minimalist Score */}
                  <div className="my-3">
                    <div className="nums font-display text-[30px] font-bold tracking-tight text-white sm:text-[34px]">
                      {mod.scoreText}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            mod.pct >= 75
                              ? "bg-mint"
                              : mod.pct >= 50
                              ? "bg-amber-400"
                              : "bg-rose-400"
                          }`}
                          style={{ width: `${mod.pct}%` }}
                        />
                      </div>
                      <span className="nums text-[11px] font-semibold text-zinc-400">
                        {mod.pct}%
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Quick counts */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>
                      {mod.missedCount === 0 ? (
                        <span className="text-mint font-medium">All correct!</span>
                      ) : (
                        <span>{mod.missedCount} missed</span>
                      )}
                    </span>
                    {mod.slowCount > 0 && (
                      <span className="text-amber-400/90 font-medium">
                        {mod.slowCount} slow
                      </span>
                    )}
                  </div>

                  {/* Selection Indicator bar */}
                  {isSelected && (
                    <div className="absolute -bottom-px left-4 right-4 h-0.5 bg-mint shadow-[0_0_8px_#34d399]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Module Breakdown */}
        {activeModule && (
          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0c1017]/80 p-5 shadow-2xl backdrop-blur sm:p-7">
            <ModuleBreakdownView
              module={activeModule}
              itemById={itemById}
              responses={responses}
            />
          </div>
        )}

        {/* AI Feedback Coach Chat */}
        <div className="mt-10 border-t border-white/[0.08] pt-6">
          <FeedbackChat analytics={feedbackPayload} />
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/[0.08] pt-6">
          <Link
            href="/practice"
            className="text-[13px] font-semibold text-zinc-400 transition hover:text-mint"
          >
            ← Back to practice
          </Link>
          <Link
            href="/dashboard"
            className="text-[13px] font-semibold text-mint transition hover:underline"
          >
            View Dashboard →
          </Link>
        </div>
      </section>
    </div>
  );
}

function ModuleBreakdownView({
  module,
  itemById,
  responses,
}: {
  module: ModuleMeta;
  itemById: Map<string, Item>;
  responses: Record<string, string>;
}) {
  const [filter, setFilter] = useState<"all" | "missed" | "slow" | "flagged">("all");

  const filteredItems = useMemo(() => {
    return module.items.filter((i) => {
      if (filter === "missed") return i.correct === false;
      if (filter === "slow") return i.excessive;
      if (filter === "flagged") return i.flagged;
      return true;
    });
  }, [module.items, filter]);

  return (
    <div>
      {/* Module Title Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-display text-[20px] font-bold text-white">
              {module.title} — {module.subtitle}
            </h3>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-mint">
              {module.scoreText} Correct
            </span>
          </div>
          <p className="mt-1 text-[12px] text-zinc-400">
            {module.routeLabel} · {module.totalCount} questions · {HEURISTIC_NOTE}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-black/40 p-1 text-[12px]">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              filter === "all"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All ({module.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("missed")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              filter === "missed"
                ? "bg-rose-500/20 text-rose-300"
                : "text-zinc-400 hover:text-rose-300"
            }`}
          >
            Missed ({module.missedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("slow")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              filter === "slow"
                ? "bg-amber-500/20 text-amber-300"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            Slow ({module.slowCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("flagged")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              filter === "flagged"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Flagged ({module.items.filter((i) => i.flagged).length})
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="mt-6 divide-y divide-white/[0.06] border-y border-white/[0.08]">
        {filteredItems.map((row) => {
          const item = itemById.get(row.itemId);
          if (!item) return null;
          return (
            <QuestionRow
              key={row.itemId}
              row={row}
              item={item}
              response={responses[row.itemId]}
            />
          );
        })}
        {filteredItems.length === 0 && (
          <div className="py-8 text-center text-[13px] text-zinc-500">
            No questions in this filter view.
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionRow({
  row,
  item,
  response,
}: {
  row: ItemAnalytics;
  item: Item;
  response: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const isCorrect = row.correct === true;
  const isOmitted = !row.response || !row.response.trim();
  const isIncorrect = !isCorrect && !isOmitted;
  const isMath = row.sectionId === "math";
  const anyItem = item as any;
  const answerKey =
    (isSpr(item) ? item.accepted?.[0] : item.correct) ||
    anyItem.correct ||
    anyItem.accepted?.[0] ||
    anyItem.answer ||
    anyItem.key ||
    "—";

  // Pace label
  const isFast = row.timeSec > 0 && row.timeSec < row.expectedPace.minSec * 0.7;
  const isSlow = row.excessive;

  const label =
    !item.skill || item.skill === "Imported" ? item.domain : item.skill;

  const solution = useMemo(
    () => resolveProblemSolution(item, item.rationale),
    [item]
  );

  return (
    <div className="group transition-colors">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition hover:bg-white/[0.02] sm:gap-5"
      >
        {/* Left: Number & Status */}
        <div className="flex items-center gap-3">
          <span className="nums flex h-6 w-7 items-center justify-center rounded bg-white/[0.06] text-[11px] font-bold text-zinc-300">
            Q{row.numberInModule}
          </span>

          {/* Status Badge */}
          {row.pretest ? (
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
              Pretest
            </span>
          ) : isCorrect ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <span>✓</span> Correct
            </span>
          ) : isIncorrect ? (
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
              <span>✗</span> Missed
            </span>
          ) : (
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
              Omitted
            </span>
          )}

          {/* Skill / Domain */}
          <span className="hidden truncate text-[13px] text-zinc-300 sm:inline sm:max-w-[240px]">
            {label}
          </span>
        </div>

        {/* Right: Pacing, Answer, Expand chevron */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Pace Badge */}
          <div className="text-right">
            <span className="nums text-[12px] font-semibold tabular-nums text-white">
              {formatTime(row.timeSec)}
            </span>
            <span className="hidden text-[11px] text-zinc-600 sm:inline">
              {" "}
              / {row.expectedPace.minSec}–{row.expectedPace.maxSec}s
            </span>
            {isSlow && (
              <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                Slow
              </span>
            )}
            {isFast && (
              <span className="ml-2 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                Fast
              </span>
            )}
          </div>

          {/* Answer Preview */}
          <div className="hidden font-mono text-[12px] text-zinc-400 md:block">
            {isOmitted ? (
              <span className="text-zinc-500">Key: {answerKey}</span>
            ) : isCorrect ? (
              <span className="text-emerald-400">Ans: {answerKey}</span>
            ) : (
              <span>
                <span className="text-rose-400">You: {response}</span> ·{" "}
                <span className="text-emerald-400">Key: {answerKey}</span>
              </span>
            )}
          </div>

          {/* Chevron */}
          <svg
            className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${
              open ? "rotate-180 text-white" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Question Details */}
      {open && (
        <div className="border-t border-white/[0.06] bg-black/20 px-3 py-5 sm:px-6">
          {/* Skill Tag Header */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300">{row.domain}</span>
            <span>·</span>
            <span>{row.skill}</span>
            <span>·</span>
            <span className="uppercase">Difficulty {row.difficulty}</span>
          </div>

          {/* Stimulus / Passage */}
          {item.stimulus && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <RichBlock
                html={item.html}
                content={item.stimulus}
                className="max-w-[75ch] text-[14px] leading-relaxed text-zinc-300"
              />
            </div>
          )}

          {/* Stem */}
          <div className="mb-4">
            <RichBlock
              html={item.html}
              content={item.stem}
              className="max-w-[75ch] text-[15px] font-medium leading-relaxed text-zinc-100"
            />
          </div>

          {/* Choices (Multiple Choice) */}
          {!isSpr(item) && item.choices && item.choices.length > 0 && (
            <div className="mb-6 space-y-2">
              {item.choices.map((choice) => {
                const isKey = choice.id === item.correct;
                const isStudentPick = response === choice.id;

                let borderCls = "border-white/10 bg-white/[0.02]";
                let badge = null;

                if (isKey) {
                  borderCls =
                    "border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
                  badge = (
                    <span className="ml-auto rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      ✓ Correct Answer
                    </span>
                  );
                } else if (isStudentPick) {
                  borderCls = "border-rose-500/50 bg-rose-950/20";
                  badge = (
                    <span className="ml-auto rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                      ✗ Your Choice
                    </span>
                  );
                }

                return (
                  <div
                    key={choice.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-[13px] leading-snug transition ${borderCls}`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                        isKey
                          ? "bg-emerald-500 text-black"
                          : isStudentPick
                          ? "bg-rose-500 text-white"
                          : "border border-white/20 text-zinc-400"
                      }`}
                    >
                      {choice.id}
                    </span>
                    <span
                      className={
                        isKey
                          ? "font-medium text-emerald-200"
                          : isStudentPick
                          ? "text-rose-200"
                          : "text-zinc-300"
                      }
                      dangerouslySetInnerHTML={{
                        __html: formatMathHtml(choice.text),
                      }}
                    />
                    {badge}
                  </div>
                );
              })}
            </div>
          )}

          {/* SPR Response Display */}
          {isSpr(item) && (
            <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[13px]">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-zinc-500">Correct Key: </span>
                  <strong className="text-emerald-400">
                    {item.accepted.join(" or ")}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">Your Answer: </span>
                  <strong
                    className={
                      isCorrect ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    {response || "None (Blank)"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-side: Left = Desmos & Inputs for this problem, Right = Steps to Solve */}
          {solution.isMath ? (
            <div className="mb-4 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
              {/* Left Column: Desmos Calculator & Exact Inputs for this Problem */}
              <div className="min-w-0">
                <DesmosVisualizer model={solution.desmos} />
              </div>

              {/* Right Column: Labeled "Steps to Solve" */}
              <div className="min-w-0">
                <StepsToSolveCard
                  solution={solution}
                  item={item}
                  response={response}
                />
              </div>
            </div>
          ) : (
            /* Reading & Writing: Full-width Steps to Solve */
            <div className="mb-4">
              <StepsToSolveCard
                solution={solution}
                item={item}
                response={response}
              />
            </div>
          )}

          {/* AI "Explain More" Button & Drawer */}
          <div className="mt-4">
            <ExplainMoreCard
              item={item}
              studentAnswer={response}
              isCorrect={isCorrect}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ExplainMoreCard({
  item,
  studentAnswer,
  isCorrect,
}: {
  item: Item;
  studentAnswer?: string;
  isCorrect: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async () => {
    if (data) {
      setOpen((o) => !o);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const anyItem = item as any;
      const correctKey =
        (isSpr(item) ? item.accepted?.[0] : item.correct) ||
        anyItem.correct ||
        anyItem.accepted?.[0] ||
        anyItem.answer ||
        anyItem.key ||
        item.rationale?.match(/Choice\s+([A-D])\s+is\s+correct/i)?.[1] ||
        item.rationale?.match(/(?:equals|is|=\s*)\s*([-+]?\d+(?:\.\d+)?(?:\/\d+)?)/i)?.[1] ||
        anyItem.choices?.[0]?.id ||
        "";

      const stemText =
        item.stem ||
        (item as any).question ||
        (item as any).prompt ||
        (item as any).text ||
        "";

      const res = await fetch("/api/practice/explain-more", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stem: stemText,
          stimulus: item.stimulus,
          choices: isSpr(item) ? undefined : item.choices,
          correct: correctKey,
          studentAnswer,
          rationale: item.rationale,
          domain: item.domain,
          skill: item.skill,
          sectionId:
            item.domain?.includes("Reading") || item.id.includes("rw")
              ? "rw"
              : "math",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to generate AI explanation.");
      }

      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to contact AI tutor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-950/10 transition">
      <button
        type="button"
        onClick={fetchExplanation}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-emerald-500/10"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            ✨
          </span>
          <span className="text-[13px] font-semibold text-emerald-300">
            {open ? "Hide AI Simple Explanation" : "Still confused? Explain more (AI Tutor)"}
          </span>
        </div>
        <span className="text-[11px] font-medium text-emerald-400/80">
          {open ? "Close" : "Step-by-step breakdown →"}
        </span>
      </button>

      {open && (
        <div className="border-t border-emerald-500/20 bg-[#0b1219] p-4 text-[13px] text-zinc-300 sm:p-5">
          {loading && (
            <div className="flex items-center gap-3 py-6 text-zinc-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              <span>Klutch AI tutor is breaking this down simply...</span>
            </div>
          )}

          {error && (
            <div className="py-2 text-rose-300">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-4">
              {/* Core Concept */}
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  💡 Plain-English Summary
                </div>
                <div className="mt-1 font-medium text-emerald-200">
                  {data.coreConcept}
                </div>
              </div>

              {/* Step-by-Step Approach */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  📝 Simple Step-by-Step Approach
                </div>
                <ol className="mt-2 space-y-2">
                  {data.steps.map((s: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 leading-relaxed"
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[11px] font-bold text-emerald-400">
                        {idx + 1}
                      </span>
                      <span
                        className="text-zinc-200"
                        dangerouslySetInnerHTML={{
                          __html: formatMathHtml(s.replace(/^Step\s*\d+:\s*/i, "")),
                        }}
                      />
                    </li>
                  ))}
                </ol>
              </div>

              {/* Desmos Shortcut / Elimination trick */}
              {data.desmosShortcut && (
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                    🚀 Desmos 20-Second Shortcut
                  </div>
                  <div className="mt-1 text-cyan-200">
                    {data.desmosShortcut}
                  </div>
                  {data.desmosKeystrokes && data.desmosKeystrokes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data.desmosKeystrokes.map((k: string) => (
                        <code
                          key={k}
                          className="rounded bg-black/40 px-2 py-0.5 font-mono text-[11px] text-cyan-300"
                        >
                          {k}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {data.eliminationTip && (
                <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                    🎯 Fast Elimination Rule
                  </div>
                  <div className="mt-1 text-purple-200">
                    {data.eliminationTip}
                  </div>
                </div>
              )}

              {/* Trap to Avoid */}
              {data.trapToAvoid && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3.5 text-amber-200">
                  <span className="font-semibold text-amber-300">⚠️ Trap to Avoid: </span>
                  {data.trapToAvoid}
                </div>
              )}

              {/* Key Takeaway */}
              {data.takeaway && (
                <div className="border-t border-white/10 pt-2 text-[12px] text-zinc-400">
                  🔑 <strong className="text-zinc-200">Test-Day Rule:</strong> {data.takeaway}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepsToSolveCard({
  solution,
  item,
  response,
}: {
  solution: ProblemSolution;
  item: Item;
  response?: string;
}) {
  const { steps, correctAnswerText, fullRationale } = solution.stepsToSolve;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1017] shadow-xl">
      {/* Steps to Solve Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#161b22] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-[12px] font-semibold tracking-wide text-zinc-200">
            Steps to Solve
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            Step-by-Step Method
          </span>
        </div>
        <span className="max-w-[160px] truncate text-[11px] text-zinc-400 sm:max-w-none">
          {solution.topicTitle}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Step-by-Step Walkthrough */}
        <div className="space-y-3">
          {steps.map((s) => (
            <div
              key={s.stepNumber}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10 hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[11px] font-bold text-emerald-400">
                  {s.stepNumber}
                </span>
                <span className="text-[12px] font-semibold text-zinc-200">
                  {s.title}
                </span>
              </div>
              <div
                className="mt-1.5 pl-7 text-[12px] leading-relaxed text-zinc-300"
                dangerouslySetInnerHTML={{ __html: formatMathHtml(s.detail) }}
              />
            </div>
          ))}
        </div>

        {/* Detailed Mathematical Walkthrough / Official Rationale */}
        {fullRationale && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[12px] leading-relaxed text-zinc-300">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Official Mathematical Walkthrough
            </span>
            <div dangerouslySetInnerHTML={{ __html: formatMathHtml(fullRationale) }} />
          </div>
        )}

        {/* Verified Answer Key Box */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2.5 text-[12px]">
          <span className="font-medium text-zinc-400">Verified Answer Key:</span>
          <span
            className="font-mono font-bold text-emerald-400"
            dangerouslySetInnerHTML={{ __html: formatMathHtml(correctAnswerText) }}
          />
        </div>
      </div>
    </div>
  );
}

function SaveStatus({ status }: { status: SaveResult | "saving" }) {
  if (status === "saving") {
    return <p className="mt-3 text-[12px] text-zinc-600">Saving to your account…</p>;
  }
  if (status === "saved") {
    return (
      <p className="mt-3 text-[12px] text-zinc-500">
        Saved to your account.{" "}
        <Link href="/dashboard" className="font-medium text-mint hover:underline">
          See your dashboard
        </Link>
      </p>
    );
  }
  if (status === "signed-out") {
    return (
      <p className="mt-3 text-[12px] text-zinc-400">
        <Link href="/signup?next=/dashboard" className="font-semibold text-mint hover:underline">
          Create a free account
        </Link>{" "}
        or{" "}
        <Link href="/login?next=/dashboard" className="font-semibold text-mint hover:underline">
          log in
        </Link>{" "}
        to keep this score. It&rsquo;s held on this device until you do.
      </p>
    );
  }
  return (
    <p className="mt-3 text-[12px] text-rose-300/80">
      Couldn&rsquo;t save this result to your account.
    </p>
  );
}

function ScoreHero({
  result,
  totals,
}: {
  result: NonNullable<ReturnType<typeof buildSessionAnalytics>["score"]>;
  totals: ReturnType<typeof buildSessionAnalytics>["totals"];
}) {
  return (
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint/70">
        Test Results
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <div className="nums font-display text-[56px] font-bold leading-none tracking-tight text-white sm:text-[64px]">
            {result.total}
          </div>
          <p className="mt-1.5 text-[12px] text-zinc-500">
            ±{result.totalMargin} · out of 1600
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {result.sections.map((s) => (
            <div key={s.id}>
              <div className="nums font-display text-[26px] font-bold leading-none text-white">
                {s.score}
              </div>
              <p className="mt-1 max-w-[12rem] text-[11px] leading-snug text-zinc-500">
                {s.name} · {s.correct}/{s.total} · {s.route}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="nums mt-6 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/[0.08] pt-4 text-[12px] text-zinc-400">
        <span>
          <span className="text-white">{formatTime(totals.timeSec)}</span> on items
        </span>
        <span>
          <span className="text-white">
            {totals.correct}/{totals.answered + totals.blank}
          </span>{" "}
          correct
        </span>
        <span>
          <span className="text-white">{totals.excessive}</span> over target
        </span>
      </div>
    </header>
  );
}

function RichBlock({
  html,
  content,
  className,
}: {
  html?: boolean;
  content: string;
  className?: string;
}) {
  const formatted = formatMathHtml(content);
  if (
    html ||
    formatted.includes("katex") ||
    formatted.includes("<span") ||
    formatted.includes("<br") ||
    formatted.includes("<svg")
  ) {
    return (
      <div
        className={`${className ?? ""} whitespace-pre-line [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:my-2 [&_td]:border [&_td]:border-white/15 [&_td]:px-2 [&_td]:py-1 [&_img]:my-2 [&_img]:mx-auto [&_img]:block [&_img]:max-h-[min(320px,50vh)] [&_img]:max-w-full [&_img]:rounded-md [&_img]:bg-white [&_img]:p-1.5 [&_svg]:mx-auto [&_svg]:block [&_svg]:max-w-[380px] [&_svg]:w-full [&_svg]:my-3`}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    );
  }
  return <p className={`${className ?? ""} whitespace-pre-line`}>{content}</p>;
}

function SolutionTabs({ solutions }: { solutions: SolutionPath[] }) {
  const [active, setActive] = useState(0);
  const fastest = solutions.reduce(
    (best, s, i) => (s.seconds < solutions[best].seconds ? i : best),
    0
  );
  const path = solutions[active];

  return (
    <div className="mt-4 max-w-[70ch]">
      <div className="flex flex-wrap gap-x-5 border-b border-white/[0.14]">
        {solutions.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 pb-2 text-[13px] transition ${
              i === active
                ? "border-mint font-semibold text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {s.label}
            <span className="nums ml-2 text-[11px] text-zinc-600">
              ~{s.seconds}s
            </span>
            {i === fastest && (
              <span className="ml-2 text-[11px] font-semibold text-mint">
                fastest
              </span>
            )}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-2">
        {path.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
            <span className="nums w-4 flex-shrink-0 text-zinc-600">{i + 1}</span>
            <span
              className="text-zinc-300"
              dangerouslySetInnerHTML={{ __html: formatMathHtml(step) }}
            />
          </li>
        ))}
      </ol>

      {path.desmosExpressions && (
        <div className="mt-4">
          <div className="text-[12px] text-zinc-500">Type into Desmos</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {path.desmosExpressions.map((e) => (
              <code
                key={e}
                className="rounded border border-white/12 bg-white/[0.03] px-2 py-1 font-mono text-[13px] text-mint"
              >
                {e}
              </code>
            ))}
          </div>
        </div>
      )}

      {path.whenToUse && (
        <p className="mt-4 max-w-[62ch] border-l-2 border-white/15 pl-3 text-[13px] leading-relaxed text-zinc-400">
          {path.whenToUse}
        </p>
      )}
    </div>
  );
}
