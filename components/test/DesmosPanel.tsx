"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "move" | "resize" | null;

const MIN_W = 320;
const MIN_H = 300;
const DEFAULT_W = 460;
const DEFAULT_H = 560;

/**
 * Floating graphing calculator, draggable by its title bar and resizable from
 * the bottom-right corner.
 *
 * The iframe gets `pointer-events: none` for the duration of any drag. Without
 * it the cursor crosses into the Desmos document mid-gesture, the parent stops
 * receiving pointermove, and the panel sticks to the cursor.
 */
export function DesmosPanel({ onClose }: { onClose: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [mode, setMode] = useState<Mode>(null);
  const [loaded, setLoaded] = useState(false);
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 });

  // Open against the right edge, below the test header.
  useEffect(() => {
    setPos({
      x: Math.max(16, window.innerWidth - DEFAULT_W - 32),
      y: 128,
    });
  }, []);

  const start = useCallback(
    (m: Mode) => (e: React.PointerEvent) => {
      if (!pos) return;
      e.preventDefault();
      origin.current = {
        px: e.clientX,
        py: e.clientY,
        x: pos.x,
        y: pos.y,
        w: size.w,
        h: size.h,
      };
      setMode(m);
    },
    [pos, size]
  );

  useEffect(() => {
    if (!mode) return;

    const onMove = (e: PointerEvent) => {
      const o = origin.current;
      const dx = e.clientX - o.px;
      const dy = e.clientY - o.py;

      if (mode === "move") {
        setPos({
          x: Math.min(Math.max(8, o.x + dx), window.innerWidth - 120),
          y: Math.min(Math.max(8, o.y + dy), window.innerHeight - 80),
        });
      } else {
        // Clamp to the viewport, then slide the panel back inward if it would
        // overhang. Without the second step, a panel sitting against the right
        // edge refuses to grow at all.
        const w = Math.min(Math.max(MIN_W, o.w + dx), window.innerWidth - 16);
        const h = Math.min(Math.max(MIN_H, o.h + dy), window.innerHeight - 16);
        setSize({ w, h });
        setPos({
          x: Math.max(8, Math.min(o.x, window.innerWidth - 8 - w)),
          y: Math.max(8, Math.min(o.y, window.innerHeight - 8 - h)),
        });
      }
    };

    const stop = () => setMode(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      document.body.style.userSelect = prev;
    };
  }, [mode]);

  if (!pos) return null;

  return (
    <div
      className="fixed z-50 flex flex-col overflow-hidden rounded border border-white/25 bg-ink-900"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        onPointerDown={start("move")}
        className="flex flex-shrink-0 cursor-grab items-center justify-between border-b border-white/15 bg-ink-800 px-3 py-2 active:cursor-grabbing"
      >
        <span className="text-[12px] font-semibold text-zinc-200">
          Graphing calculator
        </span>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-[12px] text-zinc-400 transition hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white text-[13px] text-zinc-500">
            Loading calculator…
          </div>
        )}
        <iframe
          title="Desmos graphing calculator"
          src="https://www.desmos.com/testing/cb-digital-sat/graphing"
          className="h-full w-full border-0 bg-white"
          style={{ pointerEvents: mode ? "none" : "auto" }}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div
        onPointerDown={start("resize")}
        role="separator"
        aria-label="Resize calculator"
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 text-zinc-400">
          <path
            d="M19 7 L7 19 M19 12 L12 19 M19 17 L17 19"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
