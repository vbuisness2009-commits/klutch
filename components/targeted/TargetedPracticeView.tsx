"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { TARGETED_TOPICS, type TargetedTopic } from "@/lib/targeted/topics";
import type { TargetedQuestionItem, TargetedQuestionSet } from "@/lib/targeted/store";
import { formatMathHtml } from "@/lib/formatMath";

export function TargetedPracticeView() {
  const [activeSection, setActiveSection] = useState<"math" | "rw">("math");
  const [selectedSet, setSelectedSet] = useState<TargetedQuestionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Custom Topic modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // Filter topics for the active section
  const sectionTopics = useMemo(() => {
    return TARGETED_TOPICS.filter((t) => t.section === activeSection);
  }, [activeSection]);

  // Group by domain
  const groupedTopics = useMemo(() => {
    const groups: Record<string, TargetedTopic[]> = {};
    for (const t of sectionTopics) {
      if (!groups[t.domain]) groups[t.domain] = [];
      groups[t.domain].push(t);
    }
    return groups;
  }, [sectionTopics]);

  const loadOrGenerateTopic = async (topicName: string, domain?: string, skill?: string) => {
    setLoading(true);
    setError(null);
    setLoadingMsg(`Checking question bank for "${topicName}"...`);

    const timer = setTimeout(() => {
      setLoadingMsg(`Synthesizing 30 calibrated questions (10 Easy, 10 Medium, 10 Hard)...`);
    }, 1200);

    try {
      const res = await fetch("/api/practice/targeted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          section: activeSection,
          topic: topicName,
          domain,
          skill,
        }),
      });

      clearTimeout(timer);

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load practice questions.");
      }

      setSelectedSet(data.set);
      setCustomModalOpen(false);
      setCustomInput("");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    void loadOrGenerateTopic(
      customInput.trim(),
      activeSection === "math" ? "Custom Math Topic" : "Custom Reading & Writing Topic"
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/practice" className="transition hover:text-white">
          Practice
        </Link>
        <span>/</span>
        <span className="text-zinc-200">Targeted Practice</span>
      </div>

      {/* Header */}
      {!selectedSet && (
        <div className="mt-6 border-b border-white/[0.08] pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/15 px-3 py-0.5 text-xs font-bold text-mint">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Topic Drill Engine
            </span>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-400">
              30 Questions per Topic · 10 Easy, 10 Med, 10 Hard
            </span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Targeted Skill Practice
          </h1>
          <p className="mt-2.5 max-w-[68ch] text-[15px] leading-relaxed text-zinc-400">
            Zero in on the exact question types you struggle with. Select any SAT subtopic below—or type your own specific weakness—to drill 30 calibrated questions with step-by-step rationales, Desmos hacks, and AI explanations.
          </p>

          {/* Section Switcher (Math vs Reading & Writing) */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveSection("math")}
              className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition ${
                activeSection === "math"
                  ? "border-mint bg-mint/15 text-white shadow-[0_0_15px_rgba(52,211,153,0.15)] ring-1 ring-mint/40"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>📐 Math Modules</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-mint">
                12 Topics
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("rw")}
              className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition ${
                activeSection === "rw"
                  ? "border-mint bg-mint/15 text-white shadow-[0_0_15px_rgba(52,211,153,0.15)] ring-1 ring-mint/40"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>📖 Reading &amp; Writing Modules</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-mint">
                10 Topics
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCustomModalOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/20 px-4 py-3 text-sm font-semibold text-purple-300 transition hover:border-purple-500/50 hover:bg-purple-950/40"
            >
              <span>✨ Custom / Other Topic</span>
              <span className="text-xs text-purple-400">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="my-14 rounded-2xl border border-mint/25 bg-[#0c1219] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-mint/30 bg-mint/15 text-mint shadow-inner">
            <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-white">
            Preparing Targeted Practice Set
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            {loadingMsg}
          </p>
          <div className="mt-4 flex justify-center gap-3 text-xs text-zinc-500">
            <span>✓ 10 Easy</span>
            <span>·</span>
            <span>✓ 10 Medium</span>
            <span>·</span>
            <span>✓ 10 Hard</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="my-6 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-center text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Active Drill Player */}
      {selectedSet && !loading && (
        <div className="mt-6">
          <TargetedDrillPlayer
            set={selectedSet}
            onBack={() => setSelectedSet(null)}
          />
        </div>
      )}

      {/* Topics Browser (When no set selected) */}
      {!selectedSet && !loading && (
        <div className="mt-8 space-y-10">
          {Object.entries(groupedTopics).map(([domain, topics]) => (
            <div key={domain}>
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
                <h2 className="font-display text-lg font-bold text-white">
                  {domain}
                </h2>
                <span className="text-xs text-zinc-500">
                  ({topics.length} topics)
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadOrGenerateTopic(t.name, t.domain, t.name)}
                    className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-left transition hover:border-mint/40 hover:bg-white/[0.04]"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>{t.domain}</span>
                        <span className="rounded bg-mint/10 px-1.5 py-0.5 text-[10px] font-semibold text-mint">
                          30 Qs
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold text-white group-hover:text-mint">
                        {t.name}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                        {t.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
                      <span>10 Easy · 10 Med · 10 Hard</span>
                      <span className="font-semibold text-mint group-hover:underline">
                        Start Drill →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* "Other" Custom Topic Card */}
          <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-950/20 to-black p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-bold text-purple-300">
                  ✨ Custom AI Generator
                </span>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  Struggling with a specific concept not listed?
                </h3>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-300">
                  Type any custom topic, formula, or grammar rule (e.g., &quot;circle arc length and sector radians&quot;, &quot;complex sentence boundaries&quot;, &quot;discriminant negative values&quot;). Our AI creates a dedicated 30-question drill and saves it to the bank for everyone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(true)}
                className="shrink-0 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 active:scale-[0.98]"
              >
                Enter Custom Topic →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Topic Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e141c] p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setCustomModalOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>

            <span className="inline-block rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-bold text-purple-300">
              Custom Topic Drill
            </span>
            <h3 className="mt-2 font-display text-2xl font-bold text-white">
              What topic do you struggle with?
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Input any math concept, grammar rule, or reading skill. The AI will generate 30 questions (10 Easy, 10 Medium, 10 Hard) with complete answer keys and solutions.
            </p>

            <form onSubmit={handleCustomSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Section
                </label>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection("math")}
                    className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${
                      activeSection === "math"
                        ? "border-mint bg-mint/20 text-white"
                        : "border-white/10 bg-white/[0.02] text-zinc-400"
                    }`}
                  >
                    Math
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("rw")}
                    className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${
                      activeSection === "rw"
                        ? "border-mint bg-mint/20 text-white"
                        : "border-white/10 bg-white/[0.02] text-zinc-400"
                    }`}
                  >
                    Reading &amp; Writing
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Specific Topic / Struggle Area
                </label>
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder={
                    activeSection === "math"
                      ? "e.g. circle equations completing the square, or system of equations no solution"
                      : "e.g. transition words however vs therefore, or inferences with data tables"
                  }
                  required
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customInput.trim()}
                  className="rounded-xl bg-mint px-5 py-2.5 text-xs font-bold text-ink-950 transition hover:bg-mint-400 disabled:opacity-50"
                >
                  Generate 30-Question Drill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TargetedDrillPlayer({
  set,
  onBack,
}: {
  set: TargetedQuestionSet;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "E" | "M" | "H">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const filteredQuestions = useMemo(() => {
    if (filter === "all") return set.questions;
    return set.questions.filter((q) => q.difficulty === filter);
  }, [set.questions, filter]);

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];

  // Score statistics
  const stats = useMemo(() => {
    let easyCorrect = 0;
    let medCorrect = 0;
    let hardCorrect = 0;

    set.questions.forEach((q, idx) => {
      const userAns = answers[idx];
      const isRight =
        userAns &&
        (q.format === "spr"
          ? (q.accepted || [q.correct]).includes(userAns.trim())
          : userAns.toUpperCase() === q.correct.toUpperCase());

      if (isRight) {
        if (q.difficulty === "E") easyCorrect++;
        if (q.difficulty === "M") medCorrect++;
        if (q.difficulty === "H") hardCorrect++;
      }
    });

    return { easyCorrect, medCorrect, hardCorrect };
  }, [set.questions, answers]);

  const handleSelectAnswer = (ans: string) => {
    if (!currentQ) return;
    const globalIdx = set.questions.findIndex((q) => q.id === currentQ.id);
    if (globalIdx !== -1) {
      setAnswers((prev) => ({ ...prev, [globalIdx]: ans }));
      setChecked((prev) => ({ ...prev, [globalIdx]: true }));
    }
  };

  const globalIdx = currentQ ? set.questions.findIndex((q) => q.id === currentQ.id) : 0;
  const userAnswer = answers[globalIdx];
  const isChecked = Boolean(checked[globalIdx]);
  const isCorrect =
    userAnswer &&
    (currentQ?.format === "spr"
      ? (currentQ?.accepted || [currentQ?.correct]).includes(userAnswer.trim())
      : userAnswer.toUpperCase() === currentQ?.correct.toUpperCase());

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-2xl sm:p-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-mint hover:underline"
          >
            ← Back to all topics
          </button>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-white">
              {set.topic}
            </h2>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-300">
              {set.domain}
            </span>
          </div>
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setCurrentIndex(0);
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              filter === "all" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            All (30)
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter("E");
              setCurrentIndex(0);
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              filter === "E" ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400 hover:text-emerald-300"
            }`}
          >
            Easy ({stats.easyCorrect}/10)
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter("M");
              setCurrentIndex(0);
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              filter === "M" ? "bg-amber-500/20 text-amber-300" : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            Med ({stats.medCorrect}/10)
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter("H");
              setCurrentIndex(0);
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              filter === "H" ? "bg-rose-500/20 text-rose-300" : "text-zinc-400 hover:text-rose-300"
            }`}
          >
            Hard ({stats.hardCorrect}/10)
          </button>
        </div>
      </div>

      {/* Question Counter & Difficulty pill */}
      {currentQ && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="nums font-bold text-white">
                Question {currentIndex + 1} of {filteredQuestions.length}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  currentQ.difficulty === "E"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : currentQ.difficulty === "M"
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {currentQ.difficulty === "E"
                  ? "Easy Tier"
                  : currentQ.difficulty === "M"
                  ? "Medium Tier"
                  : "Hard (700+) Tier"}
              </span>
            </div>

            {/* Quick Question Jumper */}
            <div className="flex gap-1 overflow-x-auto py-1">
              {filteredQuestions.map((q, idx) => {
                const gIdx = set.questions.findIndex((item) => item.id === q.id);
                const hasAnswered = Boolean(checked[gIdx]);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-6 w-6 rounded text-[11px] font-bold transition ${
                      currentIndex === idx
                        ? "bg-mint text-ink-950 ring-1 ring-mint"
                        : hasAnswered
                        ? "border border-white/20 bg-white/10 text-white"
                        : "bg-white/[0.04] text-zinc-500 hover:bg-white/10"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passage / Stimulus */}
          {currentQ.stimulus && (
            <div
              className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-300"
              dangerouslySetInnerHTML={{ __html: formatMathHtml(currentQ.stimulus) }}
            />
          )}

          {/* Stem */}
          <div
            className="mt-4 text-base font-medium leading-relaxed text-zinc-100"
            dangerouslySetInnerHTML={{ __html: formatMathHtml(currentQ.stem) }}
          />

          {/* Choices (Multiple Choice) */}
          {currentQ.format !== "spr" && currentQ.choices && (
            <div className="mt-6 space-y-2.5">
              {currentQ.choices.map((c) => {
                const isSelected = userAnswer === c.id;
                const isRightKey = c.id === currentQ.correct;

                let borderCls = "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]";
                if (isChecked) {
                  if (isRightKey) {
                    borderCls = "border-emerald-500/60 bg-emerald-950/20";
                  } else if (isSelected) {
                    borderCls = "border-rose-500/60 bg-rose-950/20";
                  }
                } else if (isSelected) {
                  borderCls = "border-mint bg-mint/10";
                }

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectAnswer(c.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition ${borderCls}`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                        isChecked && isRightKey
                          ? "bg-emerald-500 text-black"
                          : isChecked && isSelected
                          ? "bg-rose-500 text-white"
                          : isSelected
                          ? "bg-mint text-ink-950"
                          : "border border-white/20 text-zinc-400"
                      }`}
                    >
                      {c.id}
                    </span>
                    <span
                      className={isChecked && isRightKey ? "text-emerald-200" : "text-zinc-200"}
                      dangerouslySetInnerHTML={{ __html: formatMathHtml(c.text) }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* SPR Input */}
          {currentQ.format === "spr" && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <label className="block text-xs font-semibold text-zinc-300">
                Student-Produced Response
              </label>
              <div className="mt-2 flex gap-3">
                <input
                  type="text"
                  value={userAnswer || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswers((prev) => ({ ...prev, [globalIdx]: val }));
                  }}
                  placeholder="Enter numeric answer (fraction or decimal)"
                  className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm font-mono text-white focus:border-mint focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setChecked((prev) => ({ ...prev, [globalIdx]: true }))}
                  className="rounded-lg bg-mint px-4 py-2 text-xs font-bold text-ink-950"
                >
                  Check
                </button>
              </div>
            </div>
          )}

          {/* Solution & Rationale Box (Shown after check) */}
          {isChecked && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    isCorrect ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isCorrect ? "✓ Correct!" : `✗ Incorrect — Correct answer is ${currentQ.correct}`}
                </span>
              </div>

              <div
                className="mt-3 text-sm leading-relaxed text-zinc-300"
                dangerouslySetInnerHTML={{ __html: formatMathHtml(currentQ.rationale) }}
              />

              {/* Desmos Hint for Math */}
              {currentQ.desmosHint && (
                <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs text-cyan-200">
                  <strong className="text-cyan-300">💡 Desmos Fast-Track: </strong>
                  {currentQ.desmosHint}
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-40"
            >
              ← Previous
            </button>

            <span className="text-xs text-zinc-500">
              {currentIndex + 1} of {filteredQuestions.length}
            </span>

            <button
              type="button"
              disabled={currentIndex >= filteredQuestions.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
              className="rounded-lg bg-mint px-5 py-2 text-xs font-bold text-ink-950 transition hover:bg-mint-400 disabled:opacity-40"
            >
              Next Question →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
