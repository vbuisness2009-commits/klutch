"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MissedQuestionItem } from "@/lib/attempts";
import { formatMathHtml } from "@/lib/formatMath";
import { resolveProblemSolution } from "@/lib/testEngine/desmosSolver";
import { DesmosVisualizer } from "@/components/test/DesmosVisualizer";

type Props = {
  initialQuestions?: MissedQuestionItem[];
  isLoggedIn?: boolean;
};

export function MissedQuestionsSection({
  initialQuestions = [],
  isLoggedIn = false,
}: Props) {
  const [questions, setQuestions] = useState<MissedQuestionItem[]>(initialQuestions);
  const [loading, setLoading] = useState(initialQuestions.length === 0);
  const [statusFilter, setStatusFilter] = useState<"unmastered" | "mastered" | "all">("unmastered");
  const [sectionFilter, setSectionFilter] = useState<"all" | "math" | "rw">("all");
  const [search, setSearch] = useState("");
  const [selectedTest, setSelectedTest] = useState<string>("all");

  // Load from API and sync with localStorage
  useEffect(() => {
    async function load() {
      let serverItems: MissedQuestionItem[] = [];
      try {
        const res = await fetch("/api/missed-questions");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.missedQuestions)) {
            serverItems = json.missedQuestions;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch missed questions from API:", e);
      }

      // Check localStorage
      let localItems: MissedQuestionItem[] = [];
      try {
        const raw = localStorage.getItem("klutch_missed_questions");
        if (raw) localItems = JSON.parse(raw);
      } catch {
        /* safe */
      }

      // Merge unique by formId + itemId
      const map = new Map<string, MissedQuestionItem>();
      localItems.forEach((q) => map.set(`${q.formId}_${q.itemId}`, q));
      serverItems.forEach((q) => map.set(`${q.formId}_${q.itemId}`, q));

      const merged = [...map.values()];
      setQuestions(merged);
      setLoading(false);

      // If user is logged in and had local-only questions, sync to server
      if (isLoggedIn && localItems.length > 0 && serverItems.length < merged.length) {
        void fetch("/api/missed-questions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ missedQuestions: merged }),
        });
      }
    }

    void load();
  }, [isLoggedIn]);

  // Update a question's mastered status
  const handleSetMastered = async (questionId: string, mastered: boolean) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId || `${q.formId}_${q.itemId}` === questionId
          ? {
              ...q,
              mastered,
              masteredAt: mastered ? new Date().toISOString() : undefined,
            }
          : q
      )
    );

    // Update localStorage
    try {
      const raw = localStorage.getItem("klutch_missed_questions");
      const list: MissedQuestionItem[] = raw ? JSON.parse(raw) : [];
      const updated = list.map((q) =>
        q.id === questionId || `${q.formId}_${q.itemId}` === questionId
          ? { ...q, mastered }
          : q
      );
      localStorage.setItem("klutch_missed_questions", JSON.stringify(updated));
    } catch {
      /* safe */
    }

    // Update backend API
    try {
      await fetch("/api/missed-questions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: questionId, mastered }),
      });
    } catch (e) {
      console.warn("Failed to update status on server:", e);
    }
  };

  // Test names for filter dropdown
  const testOptions = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => set.add(q.formName || q.formId));
    return Array.from(set);
  }, [questions]);

  // Filtered questions
  const filtered = useMemo(() => {
    return questions.filter((q) => {
      // Status filter
      if (statusFilter === "unmastered" && q.mastered) return false;
      if (statusFilter === "mastered" && !q.mastered) return false;

      // Section filter
      if (sectionFilter !== "all" && q.sectionId !== sectionFilter) return false;

      // Test filter
      if (selectedTest !== "all" && (q.formName || q.formId) !== selectedTest)
        return false;

      // Search keyword
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchStem = (q.stem || "").toLowerCase().includes(query);
        const matchSkill = (q.skill || "").toLowerCase().includes(query);
        const matchDomain = (q.domain || "").toLowerCase().includes(query);
        if (!matchStem && !matchSkill && !matchDomain) return false;
      }

      return true;
    });
  }, [questions, statusFilter, sectionFilter, selectedTest, search]);

  const totalCount = questions.length;
  const masteredCount = questions.filter((q) => q.mastered).length;
  const unmasteredCount = totalCount - masteredCount;
  const masteryRate =
    totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return (
    <section className="mt-14 max-w-4xl" data-testid="missed-questions-section">
      {/* Header & Subtitle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between border-b border-white/[0.1] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              Your Missed Questions
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Your personal mistake bank. Redo every question you dropped points on until you master the concept.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2">
          <span className="nums rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-300">
            {unmasteredCount} Needs Practice
          </span>
          <span className="nums rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
            {masteredCount} Mastered
          </span>
        </div>
      </div>

      {/* Mastery Progress Bar */}
      {totalCount > 0 && (
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/40 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              Mistake Bank Mastery: <span className="text-mint font-bold">{masteryRate}%</span>
            </span>
            <span className="text-zinc-400">
              {masteredCount} of {totalCount} questions resolved
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-mint transition-all duration-500"
              style={{ width: `${masteryRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-ink-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("unmastered")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              statusFilter === "unmastered"
                ? "bg-rose-500/20 text-rose-300 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Needs Practice ({unmasteredCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("mastered")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              statusFilter === "mastered"
                ? "bg-emerald-500/20 text-emerald-300 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Mastered ({masteredCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              statusFilter === "all"
                ? "bg-white/15 text-white font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            All ({totalCount})
          </button>
        </div>

        {/* Section & Test Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Section Selector */}
          <div className="flex rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setSectionFilter("all")}
              className={`rounded-lg px-2.5 py-1 transition ${
                sectionFilter === "all"
                  ? "bg-white/15 text-white font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSectionFilter("math")}
              className={`rounded-lg px-2.5 py-1 transition ${
                sectionFilter === "math"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Math
            </button>
            <button
              type="button"
              onClick={() => setSectionFilter("rw")}
              className={`rounded-lg px-2.5 py-1 transition ${
                sectionFilter === "rw"
                  ? "bg-amber-500/20 text-amber-300 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              RW
            </button>
          </div>

          {/* Test Form Filter */}
          {testOptions.length > 1 && (
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-zinc-300 outline-none transition focus:border-mint/50"
            >
              <option value="all">All Practice Tests</option>
              {testOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skill or question..."
              className="w-40 rounded-xl border border-white/10 bg-black/50 pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none transition focus:border-mint/50 sm:w-48"
            />
            <svg
              className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Question List Area */}
      {loading ? (
        <div className="mt-8 flex items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-12 text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-mint border-t-transparent mr-3" />
          <span>Loading your mistake bank...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-white">
            {totalCount === 0
              ? "No missed questions logged yet"
              : statusFilter === "unmastered"
              ? "All caught up! Zero unmastered misses"
              : "No questions match your current filter"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-400">
            {totalCount === 0
              ? "Complete a full practice test or targeted practice. Any questions you drop points on will automatically be added to this repository for you to redo."
              : statusFilter === "unmastered"
              ? "Outstanding work! You have redone and mastered every missed question in your bank."
              : "Try switching filters or clearing your search term to see other items."}
          </p>
          {totalCount === 0 && (
            <div className="mt-5">
              <Link
                href="/practice"
                className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-mint-400"
              >
                Go to Practice Tests →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {filtered.map((item, index) => (
            <RedoQuestionCard
              key={item.id || `${item.formId}_${item.itemId}`}
              item={item}
              index={index}
              onMasteredChange={(m) =>
                handleSetMastered(item.id || `${item.formId}_${item.itemId}`, m)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RedoQuestionCard({
  item,
  index,
  onMasteredChange,
}: {
  item: MissedQuestionItem;
  index: number;
  onMasteredChange: (mastered: boolean) => void;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(Boolean(item.mastered));
  const [isCorrect, setIsCorrect] = useState<boolean>(Boolean(item.mastered));
  const [showExplanation, setShowExplanation] = useState<boolean>(Boolean(item.mastered));
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorData, setTutorData] = useState<any>(null);

  const isMath = item.sectionId === "math";

  // Check student answer on redo
  const handleCheck = () => {
    if (!selectedAnswer.trim()) return;

    const trimmed = selectedAnswer.trim().toUpperCase();
    const correctKey = (item.answer || "").trim().toUpperCase();

    // Check multiple choice or SPR numeric match
    let passed = false;
    if (item.format === "spr") {
      // SPR numeric match
      const numInput = parseFloat(selectedAnswer.trim());
      const numAns = parseFloat(item.answer.trim());
      if (!isNaN(numInput) && !isNaN(numAns)) {
        passed = Math.abs(numInput - numAns) < 0.001;
      } else {
        passed = trimmed === correctKey;
      }
    } else {
      passed = trimmed === correctKey;
    }

    setIsCorrect(passed);
    setSubmitted(true);
    if (passed) {
      setShowExplanation(true);
      onMasteredChange(true);
    }
  };

  const handleReset = () => {
    setSelectedAnswer("");
    setSubmitted(false);
    setIsCorrect(false);
    setShowExplanation(false);
    onMasteredChange(false);
  };

  // AI Tutor Explain More
  const handleExplainMore = async () => {
    if (tutorData) {
      setTutorOpen((v) => !v);
      return;
    }

    setTutorOpen(true);
    setTutorLoading(true);

    try {
      const res = await fetch("/api/practice/explain-more", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stem: item.stem,
          stimulus: item.stimulus,
          choices: item.choices,
          correct: item.answer,
          studentAnswer: selectedAnswer || item.studentResponse,
          rationale: item.rationale,
          domain: item.domain,
          skill: item.skill,
          sectionId: item.sectionId,
        }),
      });

      const data = await res.json();
      setTutorData(data);
    } catch (e) {
      console.warn("Failed to contact AI tutor:", e);
    } finally {
      setTutorLoading(false);
    }
  };

  // Desmos solution resolution
  const solution = useMemo(() => {
    return resolveProblemSolution(
      {
        id: item.itemId,
        stem: item.stem,
        correct: item.answer as any,
        accepted: [item.answer],
        rationale: item.rationale ?? "",
        choices: (item.choices || []) as any,
        format: item.format,
      } as any,
      item.sectionId
    );
  }, [item]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
        isCorrect
          ? "border-emerald-500/40 bg-gradient-to-b from-[#0a1610] to-[#050b08] shadow-lg shadow-emerald-500/5"
          : submitted && !isCorrect
          ? "border-rose-500/40 bg-gradient-to-b from-[#180a0d] to-[#0a0506]"
          : "border-white/[0.08] bg-ink-900/50 hover:border-white/15"
      } p-6 sm:p-7`}
    >
      {/* Top Metadata Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Origin pill */}
          <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
            {item.formName} &middot; Mod {item.moduleNum} #{item.numberInModule}
          </span>

          {/* Section badge */}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isMath
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
            }`}
          >
            {isMath ? "Math" : "Reading & Writing"}
          </span>

          {/* Skill tag */}
          <span className="text-[12px] text-zinc-400 font-medium">
            {item.domain} &middot; <strong className="text-zinc-200">{item.skill}</strong>
          </span>
        </div>

        {/* Status indicator */}
        <div>
          {isCorrect ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-300">
              <span>✓</span> Mastered
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-0.5 text-xs font-semibold text-rose-300">
              Needs Practice
            </span>
          )}
        </div>
      </div>

      {/* Previous wrong answer reminder */}
      {item.studentResponse && !isCorrect && (
        <div className="mt-3.5 inline-flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs text-rose-300">
          <span className="font-bold">Prior Test Response:</span>
          <span>
            Choice {item.studentResponse} ❌ (Incorrect)
          </span>
        </div>
      )}

      {/* Stimulus / Reading Passage */}
      {item.stimulus && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/40 p-4 text-[14px] leading-relaxed text-zinc-200 font-serif">
          {item.stimulus}
        </div>
      )}

      {/* Question Stem */}
      <div className="mt-4 text-[15px] font-medium leading-relaxed text-white">
        <div
          dangerouslySetInnerHTML={{
            __html: formatMathHtml(item.stem),
          }}
        />
      </div>

      {/* Interactive Answer Selection (Redo UI) */}
      <div className="mt-5 space-y-2.5">
        {item.format === "spr" ? (
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Enter your answer (Student-Produced Response):
            </label>
            <input
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="e.g. 14, 3/4, or -2.5"
              disabled={isCorrect}
              className="w-full rounded-xl border border-white/20 bg-black/60 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-mint"
            />
          </div>
        ) : (
          item.choices?.map((choice) => {
            const isSelected = selectedAnswer === choice.id;
            const isAnswerKey = item.answer === choice.id;

            return (
              <button
                key={choice.id}
                type="button"
                disabled={isCorrect}
                onClick={() => setSelectedAnswer(choice.id)}
                className={`flex w-full items-start gap-3.5 rounded-xl border p-3.5 text-left text-[14px] transition duration-150 ${
                  isCorrect && isAnswerKey
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 font-semibold"
                    : submitted && !isCorrect && isSelected
                    ? "border-rose-500 bg-rose-500/15 text-rose-200"
                    : isSelected
                    ? "border-mint bg-mint/10 text-white font-medium"
                    : "border-white/[0.08] bg-black/30 text-zinc-300 hover:border-white/20 hover:bg-black/50"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                    isSelected
                      ? "border-mint bg-mint text-ink-950"
                      : "border-white/20 bg-white/[0.04] text-zinc-400"
                  }`}
                >
                  {choice.id}
                </span>
                <span className="flex-1 pt-0.5 leading-snug">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: formatMathHtml(choice.text),
                    }}
                  />
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Action Buttons: Check Answer / Reset */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!isCorrect ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={!selectedAnswer.trim()}
            className="rounded-xl bg-mint px-5 py-2.5 text-xs font-bold text-ink-950 transition hover:bg-mint-400 disabled:opacity-40"
          >
            Check Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-white/20 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
          >
            Retake Question
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowExplanation((v) => !v)}
          className="text-xs font-medium text-zinc-400 hover:text-white underline underline-offset-4"
        >
          {showExplanation ? "Hide Explanation" : "Reveal Official Solution"}
        </button>

        <button
          type="button"
          onClick={handleExplainMore}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/10 px-3 py-1.5 text-xs font-semibold text-mint hover:bg-mint/20"
        >
          <span>💡 Explain More (AI Tutor)</span>
        </button>
      </div>

      {/* Verification Feedback Banner */}
      {submitted && (
        <div
          className={`mt-4 rounded-xl border p-4 text-xs ${
            isCorrect
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {isCorrect ? (
            <div className="flex items-center gap-2 font-semibold">
              <span>🎉 Correct!</span>
              <span>
                You got it right on your redo! This question is now marked as Mastered.
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold">❌ Incorrect on redo.</span>
                <span className="ml-1.5">
                  Try once more or inspect the step-by-step solution below.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnswer("")}
                className="font-bold underline ml-2"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step-by-Step Official Rationale & Desmos */}
      {showExplanation && (
        <div className="mt-5 border-t border-white/[0.08] pt-5 space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-black/50 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Official Solution &middot; Correct Answer: Choice {item.answer}
            </div>
            <div
              className="text-[13px] leading-relaxed text-zinc-300"
              dangerouslySetInnerHTML={{
                __html: formatMathHtml(item.rationale || "No rationale available."),
              }}
            />
          </div>

          {/* Desmos Side-by-side if advantageous */}
          {solution.isMath && solution.showDesmos && solution.desmos && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-3">
                <span>📐 Desmos Shortcut ({solution.topicTitle})</span>
              </div>
              <DesmosVisualizer model={solution.desmos} />
            </div>
          )}
        </div>
      )}

      {/* AI Tutor Card Drawer */}
      {tutorOpen && (
        <div className="mt-5 rounded-xl border border-mint/30 bg-[#081210] p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-mint/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-mint animate-pulse" />
              <h4 className="font-display text-sm font-bold text-white">
                Klutch AI Tutor &middot; Simple Step-by-Step Breakdown
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setTutorOpen(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Close ✕
            </button>
          </div>

          {tutorLoading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mint border-t-transparent" />
              <span>AI Tutor is preparing a simplified breakdown...</span>
            </div>
          ) : tutorData ? (
            <div className="mt-4 space-y-3.5 text-xs text-zinc-200">
              <div className="rounded-lg bg-white/[0.03] p-3 border border-white/[0.06]">
                <strong className="text-mint block mb-1">Core Concept:</strong>
                {tutorData.coreConcept}
              </div>

              {Array.isArray(tutorData.steps) && (
                <div className="space-y-1.5">
                  <strong className="text-white block">Steps to Solve:</strong>
                  {tutorData.steps.map((st: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <span className="font-bold text-mint">{idx + 1}.</span>
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              )}

              {tutorData.trapToAvoid && (
                <div className="rounded-lg bg-rose-500/10 p-3 border border-rose-500/20 text-rose-200">
                  <strong className="block mb-0.5">⚠️ Trap to Avoid:</strong>
                  {tutorData.trapToAvoid}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
