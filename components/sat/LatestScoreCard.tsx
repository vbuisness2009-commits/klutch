"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AttemptRecord } from "@/lib/attempts";
import { formatTime } from "@/lib/testEngine/analytics";

type Props = {
  initialLatest?: AttemptRecord | null;
  className?: string;
};

export function LatestScoreCard({ initialLatest = null, className = "" }: Props) {
  const [latest, setLatest] = useState<AttemptRecord | null>(initialLatest);
  const [loading, setLoading] = useState(!initialLatest);

  useEffect(() => {
    if (initialLatest) {
      setLatest(initialLatest);
      setLoading(false);
      return;
    }

    // 1. Check local storage for guest or recent session attempts
    if (typeof window !== "undefined") {
      try {
        const raw =
          localStorage.getItem("klutch_latest_attempt") ||
          localStorage.getItem("klutch_pending_attempt");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.total != null) {
            setLatest(parsed as AttemptRecord);
            setLoading(false);
          }
        }
      } catch {
        // Fallback to API
      }
    }

    // 2. Fetch latest attempt from server if logged in
    fetch("/api/attempts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.attempts && Array.isArray(data.attempts)) {
          const scored = data.attempts.filter(
            (a: AttemptRecord) => a.scorable && a.total != null
          );
          if (scored.length > 0) {
            setLatest(scored[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialLatest]);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-mint border-t-transparent" />
          <span className="text-xs text-zinc-400">Loading your score history...</span>
        </div>
      </div>
    );
  }

  if (!latest || latest.total == null) {
    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-5 sm:p-6 backdrop-blur transition hover:border-white/15 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Your Score Tracker
                </span>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  Ready
                </span>
              </div>
              <h3 className="mt-1 font-display text-base font-bold text-white">
                No completed tests yet
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Sit an official practice test below to unlock your predictive 1600 score, pacing metrics, and 4-module breakdown.
              </p>
            </div>
          </div>
          <Link
            href="#tests"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-white transition hover:border-mint/50 hover:bg-mint/10 hover:text-mint"
          >
            Start practice test ↓
          </Link>
        </div>
      </div>
    );
  }

  // Format sections breakdown
  const rwSection = latest.sections?.find((s) => s.id === "rw");
  const mathSection = latest.sections?.find((s) => s.id === "math");
  const completedDate = latest.createdAt
    ? new Date(latest.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recent session";

  const breakdownUrl = `/practice/test/${latest.formId}?review=1`;

  return (
    <div
      className={`glass-card p-5 sm:p-6 transition duration-200 hover:border-mint/30 ${className}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Score Hero */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mint/80">
              Latest Test Score
            </span>
            <div className="nums mt-1 flex items-baseline gap-2">
              <span className="font-display text-[42px] font-bold leading-none tracking-tight text-white sm:text-[48px]">
                {latest.total}
              </span>
              <span className="text-xs text-zinc-400">
                / 1600 {latest.totalMargin ? `(±${latest.totalMargin})` : ""}
              </span>
            </div>
            <span className="mt-1 text-[11px] text-zinc-400">
              {latest.formName} · {completedDate}
            </span>
          </div>

          {/* Vertical Divider */}
          <div className="hidden h-14 w-px bg-white/10 sm:block" />

          {/* Section Scores */}
          <div className="hidden space-y-1.5 sm:block">
            {rwSection && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-300">Reading &amp; Writing:</span>
                <span className="nums font-bold text-white">{rwSection.score ?? "—"}</span>
                <span className="text-[11px] text-zinc-400">
                  ({rwSection.correct}/{rwSection.total})
                </span>
              </div>
            )}
            {mathSection && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-300">Math:</span>
                <span className="nums font-bold text-white">{mathSection.score ?? "—"}</span>
                <span className="text-[11px] text-zinc-400">
                  ({mathSection.correct}/{mathSection.total})
                </span>
              </div>
            )}
            {latest.totals && (
              <div className="text-[11px] text-zinc-400">
                Pacing: {formatTime(latest.totals.timeSec)} · {latest.totals.excessive ?? 0} over target
              </div>
            )}
          </div>
        </div>

        {/* Right: Clickable Button to Breakdown */}
        <div className="flex shrink-0 items-center">
          <Link
            href={breakdownUrl}
            className="group/btn inline-flex items-center gap-2 rounded-xl bg-mint px-5 py-3 text-xs font-bold text-ink-950 shadow-md transition hover:bg-mint-400 hover:shadow-mint/20 active:scale-[0.98]"
          >
            <span>View Full Breakdown</span>
            <svg
              className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Mobile section preview */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.08] pt-3 text-xs sm:hidden">
        {rwSection && (
          <span className="text-zinc-300">
            RW: <strong className="text-white">{rwSection.score}</strong>
          </span>
        )}
        {mathSection && (
          <span className="text-zinc-300">
            Math: <strong className="text-white">{mathSection.score}</strong>
          </span>
        )}
        {latest.totals && (
          <span className="text-zinc-400">
            {latest.totals.correct}/{latest.totals.answered + latest.totals.blank} correct
          </span>
        )}
      </div>
    </div>
  );
}
