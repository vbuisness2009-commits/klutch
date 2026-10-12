"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { TARGETED_TOPICS, type TargetedTopic } from "@/lib/targeted/topics";
import type { TargetedQuestionItem, TargetedQuestionSet } from "@/lib/targeted/store";
import { formatMathHtml } from "@/lib/formatMath";

export type PracticeAttemptRecord = {
  id: string;
  setId?: string | null;
  section: "math" | "rw";
  domain: string;
  topic: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  easyCorrect: number;
  mediumCorrect: number;
  hardCorrect: number;
  scorePercent: number;
  createdAt: string;
};

function formatAttemptDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export function TargetedPracticeView() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"math" | "rw">("math");
  const [selectedSet, setSelectedSet] = useState<TargetedQuestionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Practice history & scoring records
  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);

  // Custom Topic modal state ("What do you want to practice?")
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // Load past practice attempts from localStorage and server
  useEffect(() => {
    try {
      const localData = localStorage.getItem("klutch_targeted_history");
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          setAttempts(parsed);
        }
      }
    } catch {}

    fetch("/api/practice/targeted/attempts")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.attempts)) {
          setAttempts((prev) => {
            const map = new Map<string, PracticeAttemptRecord>();
            for (const a of data.attempts) {
              map.set(a.id, a);
            }
            for (const a of prev) {
              if (!map.has(a.id)) {
                map.set(a.id, a);
              }
            }
            const combined = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            try {
              localStorage.setItem("klutch_targeted_history", JSON.stringify(combined));
            } catch {}
            return combined;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleRecordAttempt = (record: PracticeAttemptRecord) => {
    setAttempts((prev) => {
      const updated = [record, ...prev.filter((p) => p.id !== record.id)];
      try {
        localStorage.setItem("klutch_targeted_history", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch("/api/practice/targeted/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    }).catch(() => {});
  };

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

  // Stats across attempts
  const historyStats = useMemo(() => {
    if (attempts.length === 0) return null;
    const totalDrills = attempts.length;
    const totalSolved = attempts.reduce((acc, a) => acc + a.totalQuestions, 0);
    const avgScore = Math.round(
      attempts.reduce((acc, a) => acc + a.scorePercent, 0) / totalDrills
    );
    return { totalDrills, totalSolved, avgScore };
  }, [attempts]);

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
            onGenerateMore={() => {
              setSelectedSet(null);
              setCustomModalOpen(true);
            }}
            onDone={() => router.push("/")}
            onRecordAttempt={handleRecordAttempt}
          />
        </div>
      )}

      {/* Practice History & Scoring Log (Shown on topics list screen) */}
      {!selectedSet && !loading && attempts.length > 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <h2 className="font-display text-lg font-bold text-white">
                  Your Practice History &amp; Scoring Log
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300 font-medium">
                  {attempts.length} {attempts.length === 1 ? "Drill" : "Drills"}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Log of completed targeted drills and your accuracy breakdown by tier.
              </p>
            </div>

            {/* Quick aggregate cards */}
            {historyStats && (
              <div className="flex items-center gap-2.5 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-2">
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
                    Avg Score
                  </span>
                  <span className="font-mono text-base font-bold text-mint">
                    {historyStats.avgScore}%
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-2">
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
                    Solved
                  </span>
                  <span className="font-mono text-base font-bold text-white">
                    {historyStats.totalSolved} Qs
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Attempts Table / List */}
          <div className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06] bg-black/40">
            {attempts.slice(0, 10).map((attempt) => (
              <div
                key={attempt.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-white/[0.02]"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-lg px-2 py-1 text-xs font-bold ${
                      attempt.section === "math"
                        ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                        : "border border-purple-500/30 bg-purple-500/15 text-purple-300"
                    }`}
                  >
                    {attempt.section === "math" ? "📐 Math" : "📖 RW"}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-sm font-bold text-white">
                        {attempt.topic}
                      </h4>
                      <span className="text-xs text-zinc-500">• {attempt.domain}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="text-zinc-500">
                        {formatAttemptDate(attempt.createdAt)}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono">
                        Easy: {attempt.easyCorrect}/10
                      </span>
                      <span>•</span>
                      <span className="text-amber-400 font-mono">
                        Med: {attempt.mediumCorrect}/10
                      </span>
                      <span>•</span>
                      <span className="text-rose-400 font-mono">
                        Hard: {attempt.hardCorrect}/10
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <span
                      className={`font-mono text-base font-bold ${
                        attempt.scorePercent >= 80
                          ? "text-mint"
                          : attempt.scorePercent >= 60
                          ? "text-amber-300"
                          : "text-rose-400"
                      }`}
                    >
                      {attempt.correctCount} / {attempt.totalQuestions}
                    </span>
                    <span className="block text-[11px] text-zinc-400">
                      ({attempt.scorePercent}%)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadOrGenerateTopic(attempt.topic, attempt.domain, attempt.topic)}
                    className="rounded-lg border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:border-mint hover:bg-mint/15 hover:text-mint"
                  >
                    Retake Drill →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topics Browser (When no set selected) */}
      {!selectedSet && !loading && (
        <div className="mt-10 space-y-10">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">
                Select a Topic to Practice
              </h2>
              <span className="text-xs text-zinc-400">
                Pick any domain or generate custom AI drills
              </span>
            </div>
          </div>

          {Object.entries(groupedTopics).map(([domain, topics]) => (
            <div key={domain}>
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
                <h3 className="font-display text-lg font-bold text-white">
                  {domain}
                </h3>
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
                      <h4 className="mt-2 font-display text-base font-bold text-white group-hover:text-mint">
                        {t.name}
                      </h4>
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
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-400">
                  Type any weakness (e.g. circle equations, comma splices, trigonometric identities). The AI synthesizes 30 calibrated questions with complete step-by-step rationales and saves them into the bank.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCustomModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400 sm:self-center"
              >
                <span>Input Custom Topic</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Topic Generator Modal ("What do you want to practice?") */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
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
              What do you want to practice?
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
  onGenerateMore,
  onDone,
  onRecordAttempt,
}: {
  set: TargetedQuestionSet;
  onBack: () => void;
  onGenerateMore: () => void;
  onDone: () => void;
  onRecordAttempt: (record: PracticeAttemptRecord) => void;
}) {
  const [filter, setFilter] = useState<"all" | "E" | "M" | "H">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [drillFinished, setDrillFinished] = useState(false);
  const [reviewQIdx, setReviewQIdx] = useState<number | null>(null);

  const hasRecordedRef = useRef(false);

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

    const correctCount = easyCorrect + medCorrect + hardCorrect;
    const answeredCount = Object.keys(checked).length;
    const totalQuestions = set.questions.length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      easyCorrect,
      medCorrect,
      hardCorrect,
      correctCount,
      answeredCount,
      totalQuestions,
      scorePercent,
    };
  }, [set.questions, answers, checked]);

  const finishDrill = () => {
    if (!hasRecordedRef.current) {
      hasRecordedRef.current = true;
      const attemptRecord: PracticeAttemptRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        setId: set.id,
        section: set.section,
        domain: set.domain,
        topic: set.topic,
        totalQuestions: set.questions.length,
        answeredCount: stats.answeredCount,
        correctCount: stats.correctCount,
        easyCorrect: stats.easyCorrect,
        mediumCorrect: stats.medCorrect,
        hardCorrect: stats.hardCorrect,
        scorePercent: stats.scorePercent,
        createdAt: new Date().toISOString(),
      };
      onRecordAttempt(attemptRecord);
    }
    setDrillFinished(true);
  };

  const handleSelectAnswer = (ans: string) => {
    if (!currentQ) return;
    const gIdx = set.questions.findIndex((q) => q.id === currentQ.id);
    if (gIdx !== -1) {
      setAnswers((prev) => ({ ...prev, [gIdx]: ans }));
      setChecked((prev) => ({ ...prev, [gIdx]: true }));
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

  // ----------------------------------------------------
  // END OF DRILL SCORE SUMMARY VIEW
  // ----------------------------------------------------
  if (drillFinished) {
    const reviewQ = reviewQIdx !== null ? set.questions[reviewQIdx] : null;
    const reviewUserAns = reviewQIdx !== null ? answers[reviewQIdx] : undefined;
    const reviewIsCorrect =
      reviewQ &&
      reviewUserAns &&
      (reviewQ.format === "spr"
        ? (reviewQ.accepted || [reviewQ.correct]).includes(reviewUserAns.trim())
        : reviewUserAns.toUpperCase() === reviewQ.correct.toUpperCase());

    return (
      <div className="rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl sm:p-10">
        {/* Top Header */}
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6 text-center sm:text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/15 px-3 py-1 text-xs font-bold text-mint">
              ✓ Drill Completed
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              {set.topic}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              {set.section === "math" ? "📐 Math" : "📖 Reading & Writing"} • {set.domain} • 30-Question Calibrated Diagnostic
            </p>
          </div>

          {/* Quick toggle back to player */}
          <button
            type="button"
            onClick={() => setDrillFinished(false)}
            className="self-center sm:self-auto rounded-lg border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-white/30"
          >
            ← Back to Question Player
          </button>
        </div>

        {/* Hero Score Showcase */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/60 p-6 sm:p-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
                Diagnostic Score
              </span>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-5xl font-extrabold text-white sm:text-6xl">
                  {stats.correctCount}
                </span>
                <span className="font-mono text-2xl font-semibold text-zinc-500">
                  / {set.questions.length}
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${
                    stats.scorePercent >= 80
                      ? "bg-mint/20 text-mint border border-mint/30"
                      : stats.scorePercent >= 60
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {stats.scorePercent}% Accuracy
                </span>
              </div>

              <p className="mt-3 text-sm text-zinc-300">
                {stats.scorePercent >= 90
                  ? "🌟 Elite Mastery! You have near-perfect accuracy on this question type."
                  : stats.scorePercent >= 75
                  ? "🎯 Strong Performance! Solid command with only a few tricky questions to review."
                  : stats.scorePercent >= 50
                  ? "📈 Solid Progress! Review the rationales and Desmos calculator shortcuts below."
                  : "💪 Focused Practice Recommended! Check the step-by-step solutions below to close your concept gaps."}
              </p>
            </div>

            {/* Questions Answered counter */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-center min-w-[140px]">
              <span className="block text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Answered
              </span>
              <span className="mt-1 block font-mono text-2xl font-bold text-white">
                {stats.answeredCount} / {set.questions.length}
              </span>
              <span className="block text-[10px] text-zinc-500 mt-0.5">
                {set.questions.length - stats.answeredCount} skipped
              </span>
            </div>
          </div>

          {/* 3 Difficulty Tier Breakdown */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-300">🟢 Easy Tier</span>
                <span className="font-mono text-xs text-zinc-400">10 Questions</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-white">
                  {stats.easyCorrect} / 10
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {Math.round((stats.easyCorrect / 10) * 100)}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300">🟡 Medium Tier</span>
                <span className="font-mono text-xs text-zinc-400">10 Questions</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-white">
                  {stats.medCorrect} / 10
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {Math.round((stats.medCorrect / 10) * 100)}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-300">🔴 Hard (700+) Tier</span>
                <span className="font-mono text-xs text-zinc-400">10 Questions</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-white">
                  {stats.hardCorrect} / 10
                </span>
                <span className="font-mono text-xs font-bold text-rose-400">
                  {Math.round((stats.hardCorrect / 10) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: "Generate More" & "Thank you, I'm done" */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-y border-white/[0.08] py-6">
          <div className="flex-1">
            <h3 className="font-display text-base font-bold text-white">
              Ready for your next step?
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Drill another weak topic with AI or head back to home.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Generate More Button */}
            <button
              type="button"
              onClick={onGenerateMore}
              className="flex items-center gap-2 rounded-xl bg-mint px-6 py-3 text-sm font-bold text-ink-950 shadow-lg shadow-mint/20 transition hover:bg-mint-400"
            >
              <span>🔄 Generate More Questions</span>
            </button>

            {/* Thank you, I'm done Button */}
            <button
              type="button"
              onClick={onDone}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 hover:border-white/30"
            >
              <span>🏠 Thank you, I&apos;m done</span>
            </button>
          </div>
        </div>

        {/* Detailed Question Review Matrix */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                Detailed Question Review
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Click any question number below to inspect the stimulus, correct answer, and explanation.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Correct
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Incorrect
              </span>
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" /> Skipped
              </span>
            </div>
          </div>

          {/* Grid of 30 question chips */}
          <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10 md:grid-cols-15">
            {set.questions.map((q, idx) => {
              const uAns = answers[idx];
              const isAns = Boolean(checked[idx]);
              const isRight =
                uAns &&
                (q.format === "spr"
                  ? (q.accepted || [q.correct]).includes(uAns.trim())
                  : uAns.toUpperCase() === q.correct.toUpperCase());

              let bgCls = "bg-white/[0.04] text-zinc-400 border border-white/10";
              if (isAns) {
                if (isRight) {
                  bgCls = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
                } else {
                  bgCls = "bg-rose-500/20 text-rose-300 border border-rose-500/40";
                }
              }

              const isSelected = reviewQIdx === idx;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setReviewQIdx(isSelected ? null : idx)}
                  className={`flex h-10 w-full flex-col items-center justify-center rounded-lg text-xs font-bold transition hover:scale-105 ${bgCls} ${
                    isSelected ? "ring-2 ring-mint ring-offset-2 ring-offset-black" : ""
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  <span className="text-[9px] uppercase opacity-75">{q.difficulty}</span>
                </button>
              );
            })}
          </div>

          {/* Expanded Question Review Card */}
          {reviewQ && (
            <div className="mt-6 rounded-2xl border border-white/15 bg-black/60 p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    Question {(reviewQIdx ?? 0) + 1} Review
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      reviewQ.difficulty === "E"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : reviewQ.difficulty === "M"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {reviewQ.difficulty === "E" ? "Easy" : reviewQ.difficulty === "M" ? "Medium" : "Hard"}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      reviewIsCorrect
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {reviewIsCorrect ? "✓ Correct" : "✗ Incorrect / Skipped"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setReviewQIdx(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  ✕ Close Review
                </button>
              </div>

              {/* Stimulus */}
              {reviewQ.stimulus && (
                <div
                  className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: formatMathHtml(reviewQ.stimulus) }}
                />
              )}

              {/* Stem */}
              <div
                className="mt-4 text-sm font-medium leading-relaxed text-zinc-100"
                dangerouslySetInnerHTML={{ __html: formatMathHtml(reviewQ.stem) }}
              />

              {/* Correct Answer & User Answer */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5 text-emerald-300">
                  <strong>Correct Key: </strong> {reviewQ.correct}
                  {reviewQ.accepted && reviewQ.accepted.length > 1 && (
                    <span className="text-[11px] text-emerald-400 ml-1">
                      (Accepted: {reviewQ.accepted.join(", ")})
                    </span>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                  <strong>Your Answer: </strong> {reviewUserAns || "None"}
                </div>
              </div>

              {/* Rationale */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-zinc-300">
                <strong className="block text-mint font-semibold text-xs mb-1">
                  Step-by-Step Explanation:
                </strong>
                <div dangerouslySetInnerHTML={{ __html: formatMathHtml(reviewQ.rationale) }} />
              </div>

              {/* Desmos Hint */}
              {reviewQ.desmosHint && (
                <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs text-cyan-200">
                  <strong className="text-cyan-300">💡 Desmos Fast-Track: </strong>
                  {reviewQ.desmosHint}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ACTIVE QUESTION SOLVING VIEW
  // ----------------------------------------------------
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

        {/* Top Actions: Finish Drill button & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={finishDrill}
            className="rounded-lg border border-mint/40 bg-mint/15 px-3.5 py-1.5 text-xs font-bold text-mint hover:bg-mint hover:text-ink-950 transition"
          >
            Finish Drill &amp; View Score
          </button>

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
      </div>

      {/* Question Counter & Difficulty pill */}
      {currentQ && (
        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-400">
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
              <span className="text-zinc-500">
                • Answered {stats.answeredCount} of {set.questions.length}
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
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/[0.08] pt-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-40"
            >
              ← Previous
            </button>

            <span className="text-center text-xs text-zinc-500">
              {currentIndex + 1} of {filteredQuestions.length}
            </span>

            <div className="flex items-center gap-3">
              {currentIndex < filteredQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                  className="rounded-lg bg-mint px-5 py-2 text-xs font-bold text-ink-950 transition hover:bg-mint-400"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishDrill}
                  className="rounded-lg bg-mint px-6 py-2 text-xs font-bold text-ink-950 shadow-md shadow-mint/20 transition hover:bg-mint-400"
                >
                  Complete Drill &amp; See Score →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
