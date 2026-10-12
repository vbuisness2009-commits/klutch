"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/lib/testEngine/types";
import {
  resolveProblemSolution,
  type DesmosModel,
  type SvgCurve,
} from "@/lib/testEngine/desmosSolver";

type Props = {
  item?: Item;
  rationale?: string;
  model?: DesmosModel;
};

export function DesmosVisualizer({ item, rationale, model: propModel }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const model = useMemo<DesmosModel>(() => {
    if (propModel) return propModel;
    if (item) {
      return resolveProblemSolution(item, rationale).desmos;
    }
    return {
      title: "Desmos Method",
      canGraph: false,
      expressions: [],
      keyPoints: [],
      viewBox: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
      curveType: "calculation",
      curves: [],
      desmosInstructions: [
        "Use Desmos to verify your calculation without arithmetic errors.",
      ],
      proTip: "The Desmos calculator is built into every math section of the Digital SAT.",
    };
  }, [propModel, item, rationale]);

  const copyToClipboard = (text: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1017] shadow-xl">
      {/* Desmos Top Navigation Header */}
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="text-[12px] font-semibold tracking-wide text-zinc-200">
            Desmos Calculator
          </span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            Exact Problem Setup
          </span>
        </div>
        <span className="max-w-[200px] truncate text-[11px] text-zinc-400 sm:max-w-none">
          {model.title}
        </span>
      </div>

      <div className="flex flex-col">
        {/* Graph Preview Area */}
        {model.canGraph ? (
          <div className="relative flex flex-col items-center justify-center border-b border-white/10 bg-[#090d13] p-4">
            <div className="relative w-full max-w-[420px] overflow-hidden rounded-lg border border-white/10 bg-[#111620] p-2 shadow-inner">
              <GraphSvg model={model} />
              <div className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-0.5 text-[9px] font-mono text-zinc-300 backdrop-blur">
                Desmos Viewport
              </div>
            </div>

            {/* Key Points Badges */}
            {model.keyPoints.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">
                {model.keyPoints.map((pt, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-0.5 text-emerald-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="font-medium">{pt.label}:</span>
                    <span className="font-mono text-[10px] text-zinc-200">
                      ({pt.x}, {pt.y})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="border-b border-white/10 bg-[#090d13] px-4 py-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/20 bg-cyan-950/30 px-3 py-1 text-[11px] font-medium text-cyan-300">
              <span>⚡</span> Scientific / Arithmetic Mode (No graph needed)
            </span>
          </div>
        )}

        {/* Expressions to Type into Desmos */}
        <div className="flex flex-col justify-between bg-[#0e131b] p-4 text-[12px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Type into Desmos (Row-by-Row)
              </div>
              <span className="text-[10px] text-zinc-500">
                Click Copy to paste into Bluebook
              </span>
            </div>

            <div className="mt-2.5 space-y-2">
              {model.expressions.map((exp, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:border-emerald-500/30 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-black/40 font-mono text-[10px] font-bold text-zinc-400">
                      {idx + 1}
                    </span>
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: exp.color }}
                    />
                    <code className="truncate font-mono text-[12px] font-semibold text-zinc-200">
                      {exp.latex}
                    </code>
                    {exp.label && (
                      <span className="hidden rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-zinc-400 sm:inline">
                        {exp.label}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(exp.latex, idx)}
                    className="ml-2 flex-shrink-0 rounded border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                    title="Copy exact expression"
                  >
                    {copiedIndex === idx ? "Copied!" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

            {/* How to Read the Answer in Desmos */}
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              How to Read the Answer in Desmos
            </div>
            <ol className="mt-2 space-y-2 text-zinc-300">
              {model.desmosInstructions.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[12px] leading-relaxed">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[10px] font-bold text-emerald-400">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-zinc-400">
            💡 <strong className="text-zinc-300">SAT Pro-Tip:</strong> {model.proTip}
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphSvg({ model }: { model: DesmosModel }) {
  const width = 380;
  const height = 240;
  const { xMin, xMax, yMin, yMax } = model.viewBox;

  const toSvgX = (x: number) => {
    const range = xMax - xMin || 1;
    return ((x - xMin) / range) * width;
  };

  const toSvgY = (y: number) => {
    const range = yMax - yMin || 1;
    return height - ((y - yMin) / range) * height;
  };

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  // Generate grid ticks
  const xSpan = xMax - xMin || 10;
  const xStep = Math.max(1, Math.round(xSpan / 8));
  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    if (x !== 0 && Math.abs(x) < 1000) xTicks.push(x);
  }

  const ySpan = yMax - yMin || 10;
  const yStep = Math.max(1, Math.round(ySpan / 6));
  const yTicks: number[] = [];
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    if (y !== 0 && Math.abs(y) < 1000) yTicks.push(y);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full select-none"
      style={{ background: "#111620" }}
    >
      <defs>
        <pattern id="desmos-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
        </pattern>
      </defs>

      <rect width={width} height={height} fill="url(#desmos-grid)" />

      {/* Grid Lines for ticks */}
      {xTicks.map((x) => (
        <line
          key={`gx-${x}`}
          x1={toSvgX(x)}
          y1={0}
          x2={toSvgX(x)}
          y2={height}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.8"
        />
      ))}
      {yTicks.map((y) => (
        <line
          key={`gy-${y}`}
          x1={0}
          y1={toSvgY(y)}
          x2={width}
          y2={toSvgY(y)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.8"
        />
      ))}

      {/* Origin Axes (clamped if outside viewport) */}
      <line
        x1={0}
        y1={Math.min(height - 2, Math.max(2, originY))}
        x2={width}
        y2={Math.min(height - 2, Math.max(2, originY))}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />
      <line
        x1={Math.min(width - 2, Math.max(2, originX))}
        y1={0}
        x2={Math.min(width - 2, Math.max(2, originX))}
        y2={height}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />

      {/* Axis Labels */}
      <text
        x={width - 12}
        y={Math.min(height - 6, Math.max(14, originY - 6))}
        fill="#94a3b8"
        fontSize="10"
        fontFamily="sans-serif"
      >
        x
      </text>
      <text
        x={Math.min(width - 12, Math.max(8, originX + 6))}
        y={12}
        fill="#94a3b8"
        fontSize="10"
        fontFamily="sans-serif"
      >
        y
      </text>

      {/* Number Ticks */}
      {xTicks.map((x) => (
        <text
          key={`tx-${x}`}
          x={toSvgX(x)}
          y={Math.min(height - 4, Math.max(14, originY + 12))}
          textAnchor="middle"
          fill="#64748b"
          fontSize="8"
          fontFamily="monospace"
        >
          {x}
        </text>
      ))}
      {yTicks.map((y) => (
        <text
          key={`ty-${y}`}
          x={Math.min(width - 4, Math.max(4, originX - 6))}
          y={toSvgY(y) + 3}
          textAnchor="end"
          fill="#64748b"
          fontSize="8"
          fontFamily="monospace"
        >
          {y}
        </text>
      ))}

      {/* Dynamic Mathematical Curves */}
      {model.curves.map((curve, idx) => (
        <RenderCurve
          key={idx}
          curve={curve}
          toSvgX={toSvgX}
          toSvgY={toSvgY}
          xMin={xMin}
          xMax={xMax}
          width={width}
          height={height}
        />
      ))}

      {/* Key Points & Coordinates Callouts */}
      {model.keyPoints.map((pt, i) => {
        const cx = toSvgX(pt.x);
        const cy = toSvgY(pt.y);
        const isOffScreen = cx < 2 || cx > width - 2 || cy < 2 || cy > height - 2;
        if (isOffScreen) return null;

        return (
          <g key={i}>
            {/* Halo */}
            <circle cx={cx} cy={cy} r="6" fill="rgba(16, 185, 129, 0.25)" />
            {/* Dot */}
            <circle cx={cx} cy={cy} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            {/* Label box */}
            <rect
              x={cx + (cx > width - 65 ? -58 : 6)}
              y={cy + (cy > height - 30 ? -20 : -16)}
              width="52"
              height="15"
              rx="3"
              fill="rgba(15, 23, 42, 0.88)"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="0.7"
            />
            <text
              x={cx + (cx > width - 65 ? -32 : 32)}
              y={cy + (cy > height - 30 ? -9 : -5)}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {pt.x},{pt.y}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RenderCurve({
  curve,
  toSvgX,
  toSvgY,
  xMin,
  xMax,
  width,
  height,
}: {
  curve: SvgCurve;
  toSvgX: (x: number) => number;
  toSvgY: (y: number) => number;
  xMin: number;
  xMax: number;
  width: number;
  height: number;
}) {
  if (curve.type === "line") {
    const y1 = curve.m * xMin + curve.b;
    const y2 = curve.m * xMax + curve.b;
    return (
      <line
        x1={toSvgX(xMin)}
        y1={toSvgY(y1)}
        x2={toSvgX(xMax)}
        y2={toSvgY(y2)}
        stroke={curve.color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    );
  }

  if (curve.type === "vertical-line") {
    const sx = toSvgX(curve.x);
    return (
      <line
        x1={sx}
        y1={0}
        x2={sx}
        y2={height}
        stroke={curve.color}
        strokeWidth="2"
        strokeDasharray="4 3"
      />
    );
  }

  if (curve.type === "circle") {
    const cx = toSvgX(curve.cx);
    const cy = toSvgY(curve.cy);
    const rx = Math.abs(toSvgX(curve.cx + curve.r) - cx);
    const ry = Math.abs(toSvgY(curve.cy + curve.r) - cy);
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="rgba(168, 85, 247, 0.08)"
        stroke={curve.color}
        strokeWidth="2.5"
      />
    );
  }

  if (curve.type === "parabola") {
    const points: [number, number][] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = curve.a * x * x + curve.b * x + curve.c;
      points.push([toSvgX(x), toSvgY(y)]);
    }

    const d = points.reduce(
      (acc, [x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`),
      ""
    );

    return (
      <path
        d={d}
        fill="none"
        stroke={curve.color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (curve.type === "exponential") {
    const points: [number, number][] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = curve.a * Math.pow(curve.base, x);
      points.push([toSvgX(x), toSvgY(y)]);
    }

    const d = points.reduce(
      (acc, [x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`),
      ""
    );

    return (
      <path
        d={d}
        fill="none"
        stroke={curve.color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  return null;
}
