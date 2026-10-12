"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/lib/testEngine/types";

type Props = {
  item: Item;
  rationale?: string;
};

type GraphModel = {
  title: string;
  expressions: { color: string; latex: string; label?: string }[];
  keyPoints: { x: number; y: number; label: string; highlight?: boolean }[];
  viewBox: { xMin: number; xMax: number; yMin: number; yMax: number };
  curveType: "quadratic" | "linear" | "system" | "circle" | "exponential" | "scatter" | "geometry";
  desmosInstructions: string[];
};

export function DesmosVisualizer({ item, rationale }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const model = useMemo<GraphModel>(() => {
    return extractGraphModel(item, rationale);
  }, [item, rationale]);

  const copyToClipboard = (text: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#0c1017] shadow-xl">
      {/* Desmos Header */}
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
            Desmos Graph & Method
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            Digital SAT Fast-Track
          </span>
        </div>
        <span className="text-[11px] text-zinc-400">
          {model.title}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px]">
        {/* Left: Interactive/Visual Graph "Screenshot" */}
        <div className="relative flex flex-col items-center justify-center border-b border-white/10 bg-[#090d13] p-4 md:border-b-0 md:border-r">
          <div className="relative w-full max-w-[360px] overflow-hidden rounded-lg border border-white/10 bg-[#111620] p-2 shadow-inner">
            <GraphSvg model={model} />
            <div className="absolute bottom-3 left-3 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 backdrop-blur">
              Desmos Preview
            </div>
          </div>
          {/* Key point summary pills */}
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">
            {model.keyPoints.map((pt, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-0.5 text-emerald-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium">{pt.label}:</span>
                <span className="font-mono text-[10px] text-zinc-300">
                  ({pt.x}, {pt.y})
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: Desmos Expressions & Walkthrough */}
        <div className="flex flex-col justify-between bg-[#0e131b] p-4 text-[12px]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Type into Desmos
            </div>
            <div className="mt-2 space-y-2">
              {model.expressions.map((exp, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:border-emerald-500/30 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: exp.color }}
                    />
                    <code className="truncate font-mono text-[12px] font-semibold text-zinc-200">
                      {exp.latex}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(exp.latex, idx)}
                    className="ml-2 flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/10 hover:text-white"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === idx ? "Copied!" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              How to read the answer
            </div>
            <ol className="mt-2 space-y-2 text-zinc-300">
              {model.desmosInstructions.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[12px] leading-relaxed">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[10px] font-bold text-emerald-400">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-zinc-400">
            💡 <strong className="text-zinc-300">SAT Pro-Tip:</strong> The Desmos calculator is embedded directly on the real Digital SAT screen. Use it to avoid factoring errors or sign slips.
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphSvg({ model }: { model: GraphModel }) {
  const width = 340;
  const height = 240;
  const { xMin, xMax, yMin, yMax } = model.viewBox;

  const toSvgX = (x: number) => {
    return ((x - xMin) / (xMax - xMin)) * width;
  };

  const toSvgY = (y: number) => {
    return height - ((y - yMin) / (yMax - yMin)) * height;
  };

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  // Generate grid ticks
  const xTicks = [];
  const xStep = Math.max(1, Math.round((xMax - xMin) / 8));
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    if (x !== 0) xTicks.push(x);
  }

  const yTicks = [];
  const yStep = Math.max(1, Math.round((yMax - yMin) / 6));
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    if (y !== 0) yTicks.push(y);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full select-none"
      style={{ background: "#111620" }}
    >
      <defs>
        {/* Subtle grid pattern */}
        <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
        </pattern>
      </defs>

      <rect width={width} height={height} fill="url(#grid-pattern)" />

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

      {/* Axes */}
      <line
        x1={0}
        y1={originY}
        x2={width}
        y2={originY}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />
      <line
        x1={originX}
        y1={0}
        x2={originX}
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

      {/* Plotted Curves */}
      {model.curveType === "quadratic" && renderQuadratic(model, toSvgX, toSvgY, xMin, xMax)}
      {model.curveType === "linear" && renderLinear(model, toSvgX, toSvgY, xMin, xMax)}
      {model.curveType === "system" && renderSystem(model, toSvgX, toSvgY, xMin, xMax)}
      {model.curveType === "circle" && renderCircle(model, toSvgX, toSvgY)}
      {model.curveType === "exponential" && renderExponential(model, toSvgX, toSvgY, xMin, xMax)}
      {model.curveType === "scatter" && renderScatter(model, toSvgX, toSvgY)}

      {/* Render Key Points & Tooltip Callouts */}
      {model.keyPoints.map((pt, i) => {
        const cx = toSvgX(pt.x);
        const cy = toSvgY(pt.y);
        const isOffScreen = cx < 5 || cx > width - 5 || cy < 5 || cy > height - 5;
        if (isOffScreen) return null;

        return (
          <g key={i}>
            {/* Outer halo */}
            <circle cx={cx} cy={cy} r="6" fill="rgba(16, 185, 129, 0.25)" />
            {/* Solid dot */}
            <circle cx={cx} cy={cy} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            {/* Label box */}
            <rect
              x={cx + (cx > width - 60 ? -54 : 6)}
              y={cy + (cy > height - 30 ? -20 : -16)}
              width="48"
              height="15"
              rx="3"
              fill="rgba(15, 23, 42, 0.85)"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="0.7"
            />
            <text
              x={cx + (cx > width - 60 ? -30 : 30)}
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

function renderQuadratic(
  model: GraphModel,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number,
  xMin: number,
  xMax: number
) {
  // Approximate standard parabola y = a(x - h)^2 + k
  const vertex = model.keyPoints[0] ?? { x: 2, y: -4 };
  const h = vertex.x;
  const k = vertex.y;
  const a = k < 0 ? 0.75 : -0.75;

  const points: [number, number][] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = a * Math.pow(x - h, 2) + k;
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
      stroke="#ef4444"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function renderLinear(
  model: GraphModel,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number,
  xMin: number,
  xMax: number
) {
  const p1 = model.keyPoints[0] || { x: 0, y: 2 };
  const p2 = model.keyPoints[1] || { x: 4, y: 8 };
  const m = (p2.y - p1.y) / (p2.x - p1.x || 1);
  const b = p1.y - m * p1.x;

  const yStart = m * xMin + b;
  const yEnd = m * xMax + b;

  return (
    <line
      x1={toSvgX(xMin)}
      y1={toSvgY(yStart)}
      x2={toSvgX(xMax)}
      y2={toSvgY(yEnd)}
      stroke="#38bdf8"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  );
}

function renderSystem(
  model: GraphModel,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number,
  xMin: number,
  xMax: number
) {
  const intersection = model.keyPoints[0] || { x: 3, y: 4 };
  // Line 1: y - y0 = m1(x - x0), m1 = 1
  const m1 = 1;
  const b1 = intersection.y - m1 * intersection.x;
  // Line 2: m2 = -0.6
  const m2 = -0.7;
  const b2 = intersection.y - m2 * intersection.x;

  return (
    <g>
      <line
        x1={toSvgX(xMin)}
        y1={toSvgY(m1 * xMin + b1)}
        x2={toSvgX(xMax)}
        y2={toSvgY(m1 * xMax + b1)}
        stroke="#ef4444"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1={toSvgX(xMin)}
        y1={toSvgY(m2 * xMin + b2)}
        x2={toSvgX(xMax)}
        y2={toSvgY(m2 * xMax + b2)}
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

function renderCircle(
  model: GraphModel,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number
) {
  const center = model.keyPoints[0] || { x: 2, y: 1 };
  const r = 4;
  const cx = toSvgX(center.x);
  const cy = toSvgY(center.y);
  const rx = Math.abs(toSvgX(center.x + r) - cx);
  const ry = Math.abs(toSvgY(center.y + r) - cy);

  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="rgba(56, 189, 248, 0.08)"
      stroke="#a855f7"
      strokeWidth="2.5"
    />
  );
}

function renderExponential(
  model: GraphModel,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number,
  xMin: number,
  xMax: number
) {
  const points: [number, number][] = [];
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = Math.pow(1.6, x);
    points.push([toSvgX(x), toSvgY(Math.min(y, 25))]);
  }

  const d = points.reduce(
    (acc, [x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`),
    ""
  );

  return (
    <path
      d={d}
      fill="none"
      stroke="#f59e0b"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  );
}

function renderScatter(
  model: GraphModel,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number
) {
  const pts = [
    { x: 1, y: 2 },
    { x: 2, y: 3.5 },
    { x: 3, y: 4 },
    { x: 4, y: 6 },
    { x: 5, y: 7 },
    { x: 6, y: 8.2 },
    { x: 7, y: 9.8 },
  ];

  return (
    <g>
      {pts.map((p, i) => (
        <circle key={i} cx={toSvgX(p.x)} cy={toSvgY(p.y)} r="3" fill="#38bdf8" />
      ))}
      <line
        x1={toSvgX(0)}
        y1={toSvgY(1)}
        x2={toSvgX(8)}
        y2={toSvgY(11)}
        stroke="#ef4444"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
    </g>
  );
}

function extractGraphModel(item: Item, rationale?: string): GraphModel {
  const text = `${item.stem} ${rationale || ""} ${item.skill || ""}`.toLowerCase();

  // 1. Circle equations
  if (text.includes("circle") || text.includes("(x -") && text.includes("^2 + (y")) {
    return {
      title: "Circle in Coordinate Plane",
      expressions: [
        { color: "#a855f7", latex: "(x - 2)^2 + (y - 1)^2 = 16" },
        { color: "#38bdf8", latex: "(2, 1)", label: "Center" },
      ],
      keyPoints: [
        { x: 2, y: 1, label: "Center" },
        { x: 6, y: 1, label: "Radius = 4" },
      ],
      viewBox: { xMin: -6, xMax: 10, yMin: -6, yMax: 8 },
      curveType: "circle",
      desmosInstructions: [
        "Type the circle equation directly into line 1.",
        "Desmos plots the entire circle instantly without needing to solve for y.",
        "Click the center and boundary points to verify coordinates and radius.",
      ],
    };
  }

  // 2. Quadratics / Parabolas / Vertices
  if (
    text.includes("quadratic") ||
    text.includes("parabola") ||
    text.includes("vertex") ||
    text.includes("x^2") ||
    text.includes("minimum value") ||
    text.includes("maximum value")
  ) {
    // Check if rationale mentions a vertex coordinate
    const vertexMatch = rationale?.match(/\((-?\d+),\s*(-?\d+)\)/);
    const vx = vertexMatch ? parseInt(vertexMatch[1], 10) : 2;
    const vy = vertexMatch ? parseInt(vertexMatch[2], 10) : -4;

    return {
      title: "Parabola & Vertex Extrema",
      expressions: [
        { color: "#ef4444", latex: `y = (x - ${vx})^2 + (${vy})` },
        { color: "#10b981", latex: "y = 0", label: "x-axis" },
      ],
      keyPoints: [
        { x: vx, y: vy, label: "Vertex", highlight: true },
        { x: vx - 2, y: 0, label: "Zero" },
        { x: vx + 2, y: 0, label: "Zero" },
      ],
      viewBox: { xMin: vx - 6, xMax: vx + 6, yMin: Math.min(-8, vy - 2), yMax: Math.max(6, vy + 8) },
      curveType: "quadratic",
      desmosInstructions: [
        "Type the quadratic function into line 1.",
        "Click on the curve: gray dots appear at the vertex, y-intercept, and roots.",
        "Hover or click the vertex gray dot to immediately read the (h, k) minimum or maximum.",
      ],
    };
  }

  // 3. Systems of Equations
  if (
    text.includes("system") ||
    text.includes("intersect") ||
    text.includes("solution to the system") ||
    text.includes("how many solutions")
  ) {
    const ptMatch = rationale?.match(/\((-?\d+),\s*(-?\d+)\)/);
    const ix = ptMatch ? parseInt(ptMatch[1], 10) : 3;
    const iy = ptMatch ? parseInt(ptMatch[2], 10) : 4;

    return {
      title: "Linear System & Intersection",
      expressions: [
        { color: "#ef4444", latex: `y = x + ${iy - ix}` },
        { color: "#38bdf8", latex: `2x + 3y = ${2 * ix + 3 * iy}` },
      ],
      keyPoints: [{ x: ix, y: iy, label: "Intersection", highlight: true }],
      viewBox: { xMin: ix - 6, xMax: ix + 6, yMin: iy - 5, yMax: iy + 5 },
      curveType: "system",
      desmosInstructions: [
        "Type both equations into line 1 and line 2 exactly as written in the question.",
        "Desmos graphs both lines simultaneously.",
        "Click directly on where the two lines cross: Desmos displays the (x, y) coordinate point.",
      ],
    };
  }

  // 4. Exponential growth/decay
  if (text.includes("exponential") || text.includes("growth") || text.includes("decay") || text.includes("half-life")) {
    return {
      title: "Exponential Model",
      expressions: [
        { color: "#f59e0b", latex: "y = 3(1.5)^x" },
        { color: "#38bdf8", latex: "(0, 3)", label: "Initial (t=0)" },
      ],
      keyPoints: [
        { x: 0, y: 3, label: "Initial Value" },
        { x: 2, y: 6.75, label: "t = 2" },
      ],
      viewBox: { xMin: -3, xMax: 6, yMin: -1, yMax: 15 },
      curveType: "exponential",
      desmosInstructions: [
        "Type the exponential function into Desmos.",
        "Click the y-axis intercept to read the initial value when x = 0.",
        "Type 'x = [value]' to see where a vertical line intersects the curve at a specific time.",
      ],
    };
  }

  // 5. Default Linear or Slope-Intercept
  return {
    title: "Linear Function & Slope",
    expressions: [
      { color: "#38bdf8", latex: "y = 1.5x + 2" },
      { color: "#10b981", latex: "(0, 2)", label: "y-intercept" },
    ],
    keyPoints: [
      { x: 0, y: 2, label: "y-intercept" },
      { x: 4, y: 8, label: "(x, y)" },
    ],
    viewBox: { xMin: -4, xMax: 8, yMin: -2, yMax: 10 },
    curveType: "linear",
    desmosInstructions: [
      "Type the linear equation into line 1.",
      "Click the y-intercept dot to verify the constant / initial value.",
      "Use the table feature (click gear icon -> convert to table) to inspect any (x, y) values in seconds.",
    ],
  };
}
