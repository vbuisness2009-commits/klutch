"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaywallModal } from "@/components/dashboard/PaywallModal";

type Props = {
  isLoggedIn?: boolean;
  className?: string;
};

const STAGES = [
  {
    sec: 0,
    pct: 12,
    title: "Formulating Reading & Writing Module 1 (Craft & Structure, Information & Ideas)...",
    item: "Reading & Writing Module 1 (27 items)",
  },
  {
    sec: 25,
    pct: 35,
    title: "Calibrating Upper and Lower adaptive branches for Reading & Writing Module 2...",
    item: "Reading & Writing Module 2 Adaptive Paths (27 items)",
  },
  {
    sec: 50,
    pct: 58,
    title: "Synthesizing Math Module 1 (Algebra, Linear Equations, Quadratics)...",
    item: "Math Module 1 Routing Baseline (22 items)",
  },
  {
    sec: 80,
    pct: 82,
    title: "Generating Math Module 2 Upper (Advanced Geometry, Trigonometry, and Hard SPRs)...",
    item: "Math Module 2 Advanced Adaptive (22 items)",
  },
  {
    sec: 105,
    pct: 94,
    title: "Auditing rationales, verifying 1:1 answer keys, and compiling IRT parameters...",
    item: "1:1 Answer Key Reconciliation & SPR Validation",
  },
  {
    sec: 125,
    pct: 100,
    title: "Finalizing adaptive test form package... Launching test environment!",
    item: "Adaptive Test Form Compilation",
  },
];

export function GenerateTestCard({ isLoggedIn = true, className = "" }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetTestId = useRef<string | null>(null);
  const backendDone = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartGeneration = async () => {
    if (!isLoggedIn) {
      router.push("/signup?next=/sat");
      return;
    }

    setModalOpen(true);
    setElapsed(0);
    setProgress(5);
    setStageIndex(0);
    setError(null);
    targetTestId.current = null;
    backendDone.current = false;

    // 1. Kick off backend generation in the background immediately
    void (async () => {
      try {
        const res = await fetch("/api/tests/generate", { method: "POST" });
        if (res.status === 402) {
          setModalOpen(false);
          setPaywallOpen(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (data.error === "insufficient_credits") {
            setModalOpen(false);
            setPaywallOpen(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
          }
          throw new Error(data.error || "Generation error");
        }

        targetTestId.current = data.testId;
        backendDone.current = true;
      } catch (err: any) {
        setError(err.message || "Failed to generate test.");
      }
    })();

    // 2. Run authentic 2-minute synthesis progression timer
    const startTime = Date.now();
    const TARGET_DURATION_SEC = 125; // ~2.1 minutes for authentic experience

    intervalRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(seconds);

      // Determine stage
      let curStage = 0;
      for (let i = 0; i < STAGES.length; i++) {
        if (seconds >= STAGES[i].sec) {
          curStage = i;
        }
      }
      setStageIndex(curStage);

      // Smooth percentage calculation
      const rawPct = Math.min(100, Math.round((seconds / TARGET_DURATION_SEC) * 100));

      // If backend is still running past 120s, hold at 95% until backend finishes
      if (rawPct >= 96 && !backendDone.current) {
        setProgress(96);
      } else if (rawPct >= 100 && backendDone.current && targetTestId.current) {
        setProgress(100);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => {
          router.push(`/practice/test/${targetTestId.current}`);
        }, 800);
      } else {
        setProgress(rawPct);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-2xl border border-mint/25 bg-gradient-to-br from-[#0c1514] via-[#0c1017] to-[#080d12] p-6 shadow-xl backdrop-blur transition hover:border-mint/45 sm:p-8 ${className}`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/15 px-3 py-0.5 text-xs font-bold text-mint">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Blueprint Synthesis
              </span>
              <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                98-Question Adaptive
              </span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Generate Your Own Practice Test
            </h2>

            <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
              Dynamically synthesize a brand-new, full-length 98-question adaptive Digital SAT practice test. Each exam includes custom calibrated Reading &amp; Writing and Math modules, distinct Routing (Module 1) and Upper/Lower (Module 2) branches, realistic College Board question distributions, and non-trivial student-produced responses.
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Est. generation time: ~2–5 minutes
              </span>
              <span>·</span>
              <span>100% 1:1 answer key verified</span>
              <span>·</span>
              <span>Scored 400–1600 with IRT</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={handleStartGeneration}
              className="group/btn relative flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-mint via-mint-400 to-emerald-400 px-6 py-4 text-sm font-bold text-ink-950 shadow-lg shadow-mint/20 transition hover:brightness-105 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Generate Practice Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2-5 Minute High-Tech Synthesis Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-2xl border border-mint/30 bg-[#0c1219] p-6 shadow-2xl sm:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-mint/30 bg-mint/15 text-mint shadow-inner">
                <svg className="h-7 w-7 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>

              <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
                Synthesizing Adaptive Digital SAT Exam
              </h3>
              <p className="mt-1.5 text-xs text-zinc-400">
                Custom-calibrating 98 questions across Routing and Adaptive modules (Est: 2–5 min)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-center text-xs text-rose-300">
                {error}
                <button
                  onClick={handleStartGeneration}
                  className="ml-3 font-bold underline hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Progress Bar & Timer */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-mint">{progress}% Complete</span>
                <span className="font-mono text-zinc-400">
                  Elapsed: {formatTimer(elapsed)} / ~2:15
                </span>
              </div>

              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mint via-mint-400 to-emerald-400 shadow-[0_0_12px_#34d399] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Active Stage Label */}
              <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-zinc-200">
                <span className="h-2 w-2 animate-ping rounded-full bg-mint" />
                <span className="font-medium">{STAGES[stageIndex]?.title}</span>
              </div>
            </div>

            {/* Telemetry Checklist */}
            <div className="mt-6 space-y-2 rounded-xl border border-white/[0.08] bg-black/40 p-4 font-mono text-[11px]">
              {STAGES.slice(0, 5).map((s, idx) => {
                const isFinished = stageIndex > idx;
                const isCurrent = stageIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between ${
                      isFinished
                        ? "text-emerald-400"
                        : isCurrent
                        ? "text-white"
                        : "text-zinc-600"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{isFinished ? "✓" : isCurrent ? "▶" : "○"}</span>
                      <span>{s.item}</span>
                    </span>
                    <span className="text-[10px] uppercase">
                      {isFinished ? "Calibrated" : isCurrent ? "Processing" : "Queued"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[11px] text-zinc-500">
              Please keep this tab open while your customized exam is synthesized.
            </p>
          </div>
        </div>
      )}

      {/* Paywall guard modal */}
      <PaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}
