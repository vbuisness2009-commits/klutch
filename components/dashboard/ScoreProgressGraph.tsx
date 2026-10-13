"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AttemptRecord } from "@/lib/attempts";

type Props = {
  attempts: AttemptRecord[];
};

type ViewMode = "total" | "math" | "rw" | "both";

export function ScoreProgressGraph({ attempts }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("total");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Chronological order: oldest to newest
  const data = useMemo(() => {
    return [...attempts]
      .filter((a) => a.scorable && a.total != null)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((a, idx, arr) => {
        const mathSec = a.sections.find((s) => s.id === "math");
        const rwSec = a.sections.find((s) => s.id === "rw");
        const prev = idx > 0 ? arr[idx - 1] : null;
        const totalJump = prev?.total ? a.total! - prev.total : 0;
        const mathJump =
          prev && mathSec?.score && prev.sections.find((s) => s.id === "math")?.score
            ? mathSec.score - (prev.sections.find((s) => s.id === "math")?.score ?? 0)
            : 0;
        const rwJump =
          prev && rwSec?.score && prev.sections.find((s) => s.id === "rw")?.score
            ? rwSec.score - (prev.sections.find((s) => s.id === "rw")?.score ?? 0)
            : 0;

        return {
          id: a.id,
          formId: a.formId,
          formName: a.formName,
          date: new Date(a.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          fullDate: new Date(a.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          total: a.total!,
          totalMargin: a.totalMargin ?? 30,
          totalJump,
          math: mathSec?.score ?? 500,
          mathJump,
          mathCorrect: mathSec?.correct ?? 0,
          mathTotal: mathSec?.total ?? 44,
          rw: rwSec?.score ?? 500,
          rwJump,
          rwCorrect: rwSec?.correct ?? 0,
          rwTotal: rwSec?.total ?? 54,
          correctTotal: a.totals.correct ?? 0,
          totalQuestions:
            (a.totals.correct ?? 0) +
            (a.totals.incorrect ?? 0) +
            (a.totals.blank ?? 0) || 98,
        };
      });
  }, [attempts]);

  // Overall performance metrics
  const baseline = data[0];
  const latest = data[data.length - 1];
  const peak = useMemo(() => {
    return data.reduce<typeof latest | undefined>(
      (b, d) => (!b || d.total > b.total ? d : b),
      undefined
    );
  }, [data]);
  const netJump = baseline && latest ? latest.total - baseline.total : 0;

  // Chart dimensions & coordinates calculation
  const width = 800;
  const height = 280;
  const padLeft = 55;
  const padRight = 45;
  const padTop = 35;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const isSectionMode = viewMode === "math" || viewMode === "rw";
  const minY = isSectionMode ? 400 : 800;
  const maxY = isSectionMode ? 800 : 1600;

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    const ratio = (clamped - minY) / (maxY - minY);
    return padTop + chartH - ratio * chartH;
  };

  const getX = (idx: number) => {
    if (data.length <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (data.length - 1)) * chartW;
  };

  // Generate SVG paths
  const totalPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.total), val: d.total }));
  const mathPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.math), val: d.math }));
  const rwPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.rw), val: d.rw }));

  const generateLinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    return pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      // Smooth cubic bezier
      const prev = pts[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
    }, "");
  };

  const generateAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length <= 1) return "";
    const line = generateLinePath(pts);
    const lastX = pts[pts.length - 1].x;
    const firstX = pts[0].x;
    const bottom = padTop + chartH;
    return `${line} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
  };

  const activePoints =
    viewMode === "math"
      ? mathPoints
      : viewMode === "rw"
      ? rwPoints
      : totalPoints;

  const activeHover = hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-ink-900/60 via-ink-950/80 to-[#05080c] p-6 shadow-2xl backdrop-blur sm:p-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/15 text-mint border border-mint/30">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              Score Progress Tracker
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Track your score trajectory and gains across multiple official Digital SAT exams.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("total")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              viewMode === "total"
                ? "bg-mint text-ink-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Composite (400–1600)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("math")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              viewMode === "math"
                ? "bg-cyan-400 text-ink-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Math (200–800)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("rw")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              viewMode === "rw"
                ? "bg-amber-400 text-ink-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Reading &amp; Writing
          </button>
          <button
            type="button"
            onClick={() => setViewMode("both")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              viewMode === "both"
                ? "bg-white/20 text-white font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Both Sections
          </button>
        </div>
      </div>

      {/* Top Stat Highlights */}
      {data.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Baseline Score
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-white sm:text-3xl">
                {baseline.total}
              </span>
              <span className="text-[11px] text-zinc-500 truncate max-w-[100px]">
                {baseline.formName}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Latest Score
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-white sm:text-3xl">
                {latest.total}
              </span>
              <span className="text-[11px] text-zinc-500 truncate max-w-[100px]">
                {latest.formName}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Peak All-Time
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-mint sm:text-3xl">
                {peak?.total ?? latest.total}
              </span>
              <span className="rounded bg-mint/10 px-1.5 py-0.5 text-[10px] font-bold text-mint">
                Top Score
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-mint/20 bg-mint/[0.04] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mint/80">
              Net Score Gain
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`font-display text-2xl font-black sm:text-3xl ${
                  netJump > 0
                    ? "text-mint"
                    : netJump < 0
                    ? "text-rose-400"
                    : "text-zinc-300"
                }`}
              >
                {netJump > 0 ? `+${netJump}` : `${netJump}`}
              </span>
              <span className="text-[11px] font-semibold text-zinc-400">
                {netJump > 0 ? "pts jump 🚀" : "pts change"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Chart Area */}
      {data.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-zinc-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-white">
            No score history plotted yet
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-400">
            Take Practice Test 1 or generate a new adaptive test. As you complete tests, your official scores and score jumps will plot automatically on this graph.
          </p>
          <div className="mt-5">
            <Link
              href="/practice/test/practice-test-1"
              className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-mint-400"
            >
              Start Practice Test 1 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative mt-8">
          {/* SVG Graph Canvas */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-auto w-full select-none"
              style={{ minWidth: "550px" }}
            >
              <defs>
                {/* Total gradient */}
                <linearGradient id="total-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                </linearGradient>
                {/* Math gradient */}
                <linearGradient id="math-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                </linearGradient>
                {/* RW gradient */}
                <linearGradient id="rw-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                </linearGradient>
                {/* Glow filter */}
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Horizontal Score Gridlines */}
              {(isSectionMode
                ? [400, 500, 600, 700, 800]
                : [800, 1000, 1200, 1400, 1600]
              ).map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.07)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      fill="rgba(255, 255, 255, 0.35)"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Area Fills */}
              {viewMode === "total" && data.length > 1 && (
                <path d={generateAreaPath(totalPoints)} fill="url(#total-grad)" />
              )}
              {viewMode === "math" && data.length > 1 && (
                <path d={generateAreaPath(mathPoints)} fill="url(#math-grad)" />
              )}
              {viewMode === "rw" && data.length > 1 && (
                <path d={generateAreaPath(rwPoints)} fill="url(#rw-grad)" />
              )}

              {/* Lines */}
              {viewMode === "both" ? (
                <>
                  <path
                    d={generateLinePath(mathPoints)}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                    filter="url(#neon-glow)"
                  />
                  <path
                    d={generateLinePath(rwPoints)}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    filter="url(#neon-glow)"
                  />
                </>
              ) : viewMode === "math" ? (
                <path
                  d={generateLinePath(mathPoints)}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="3"
                  filter="url(#neon-glow)"
                />
              ) : viewMode === "rw" ? (
                <path
                  d={generateLinePath(rwPoints)}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3"
                  filter="url(#neon-glow)"
                />
              ) : (
                <path
                  d={generateLinePath(totalPoints)}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3.5"
                  filter="url(#neon-glow)"
                />
              )}

              {/* Score Jumps Callouts on Line */}
              {viewMode === "total" &&
                data.length > 1 &&
                data.map((d, i) => {
                  if (i === 0) return null;
                  const prev = data[i - 1];
                  const jump = d.total - prev.total;
                  if (jump === 0) return null;
                  const mx = (getX(i - 1) + getX(i)) / 2;
                  const my = (getY(prev.total) + getY(d.total)) / 2 - 14;

                  return (
                    <g key={`jump-${i}`}>
                      <rect
                        x={mx - 20}
                        y={my - 10}
                        width="40"
                        height="18"
                        rx="9"
                        fill={jump > 0 ? "#052e16" : "#4c0519"}
                        stroke={jump > 0 ? "#10b981" : "#f43f5e"}
                        strokeWidth="1"
                      />
                      <text
                        x={mx}
                        y={my + 3}
                        textAnchor="middle"
                        fill={jump > 0 ? "#34d399" : "#fda4af"}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {jump > 0 ? `+${jump}` : `${jump}`}
                      </text>
                    </g>
                  );
                })}

              {/* Interactive Point Nodes & Crosshair */}
              {data.map((d, i) => {
                const x = getX(i);
                const y = getY(
                  viewMode === "math"
                    ? d.math
                    : viewMode === "rw"
                    ? d.rw
                    : d.total
                );
                const isHovered = hoveredIdx === i;

                return (
                  <g
                    key={d.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Vertical guideline on hover */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={padTop}
                        x2={x}
                        y2={padTop + chartH}
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Outer pulse aura */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="14"
                        fill={
                          viewMode === "math"
                            ? "rgba(34, 211, 238, 0.25)"
                            : viewMode === "rw"
                            ? "rgba(251, 191, 36, 0.25)"
                            : "rgba(52, 211, 153, 0.25)"
                        }
                      />
                    )}

                    {/* Outer circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? "7" : "5"}
                      fill="#05080c"
                      stroke={
                        viewMode === "math"
                          ? "#22d3ee"
                          : viewMode === "rw"
                          ? "#fbbf24"
                          : "#34d399"
                      }
                      strokeWidth={isHovered ? "3.5" : "2.5"}
                    />

                    {/* Inner core */}
                    <circle
                      cx={x}
                      cy={y}
                      r="2.5"
                      fill={
                        viewMode === "math"
                          ? "#22d3ee"
                          : viewMode === "rw"
                          ? "#fbbf24"
                          : "#34d399"
                      }
                    />

                    {/* X-Axis Test Label & Date */}
                    <text
                      x={x}
                      y={padTop + chartH + 18}
                      textAnchor="middle"
                      fill={isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.7)"}
                      fontSize="11"
                      fontWeight={isHovered ? "bold" : "medium"}
                    >
                      {d.formName.length > 14
                        ? d.formName.slice(0, 12) + "…"
                        : d.formName}
                    </text>
                    <text
                      x={x}
                      y={padTop + chartH + 32}
                      textAnchor="middle"
                      fill="rgba(255, 255, 255, 0.4)"
                      fontSize="10"
                    >
                      {d.date}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Tooltip Card Floating / Attached */}
          {activeHover && (
            <div className="mt-4 rounded-xl border border-white/15 bg-black/90 p-4 shadow-2xl backdrop-blur sm:absolute sm:top-2 sm:right-6 sm:mt-0 sm:w-80">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div>
                  <h4 className="font-display text-sm font-bold text-white">
                    {activeHover.formName}
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    Completed on {activeHover.fullDate}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-display text-xl font-extrabold text-mint">
                    {activeHover.total}
                  </span>
                  <span className="block text-[10px] text-zinc-500">
                    ±{activeHover.totalMargin}
                  </span>
                </div>
              </div>

              {/* Jump Delta callout in tooltip */}
              {activeHover.totalJump !== 0 && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs">
                  <span className="text-zinc-400">Score Jump:</span>
                  <span
                    className={`font-bold ${
                      activeHover.totalJump > 0
                        ? "text-mint"
                        : "text-rose-400"
                    }`}
                  >
                    {activeHover.totalJump > 0
                      ? `+${activeHover.totalJump} points jump 📈`
                      : `${activeHover.totalJump} points`}
                  </span>
                </div>
              )}

              {/* Sections Breakdown */}
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-medium">Math:</span>
                  <span className="font-mono text-zinc-200">
                    {activeHover.math}{" "}
                    <span className="text-zinc-500">
                      ({activeHover.mathCorrect}/{activeHover.mathTotal})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-medium">
                    Reading &amp; Writing:
                  </span>
                  <span className="font-mono text-zinc-200">
                    {activeHover.rw}{" "}
                    <span className="text-zinc-500">
                      ({activeHover.rwCorrect}/{activeHover.rwTotal})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-zinc-400">
                  <span>Accuracy:</span>
                  <span className="font-mono text-white">
                    {activeHover.correctTotal}/{activeHover.totalQuestions} (
                    {Math.round(
                      (activeHover.correctTotal / activeHover.totalQuestions) *
                        100
                    )}
                    %)
                  </span>
                </div>
              </div>

              {/* Retake / View link */}
              <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <Link
                  href={`/practice/test/${activeHover.formId}`}
                  className="text-[11px] font-semibold text-mint hover:underline"
                >
                  Retake Test →
                </Link>
                <span className="text-[10px] text-zinc-500">
                  Hover points to inspect
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
