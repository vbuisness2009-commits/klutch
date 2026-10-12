import Link from "next/link";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { listTests } from "@/lib/testEngine/store";
import { currentUser } from "@/lib/userSession";

const AP_COUNT = AP_SUBJECTS.length;

export async function Hero() {
  const tests = await listTests();
  const user = await currentUser();
  const satCount = tests.filter((t) => t.published).length;
  const satHref = user ? "/sat" : "/signup?next=/sat";
  const targetedHref = "/practice/targeted";

  return (
    <section className="relative overflow-hidden border-b border-white/[0.08]">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20 items-center">
        <div>
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            <span className="font-medium text-zinc-300">2026 Digital SAT Blueprint</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{satCount} Full Tests Ready</span>
          </div>

          <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.08] tracking-tight text-white sm:text-[54px]">
            Master the SAT and every AP exam.
          </h1>

          <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-zinc-400">
            Klutch is built for serious test-takers. Sit adaptive Digital SAT tests under real exam timing, drill high-yield subtopics with step-by-step solutions and Desmos strategies, or master all 38 AP subjects unit by unit.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href={satHref}
              className="btn-primary"
            >
              <span>Take a practice test</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href={targetedHref}
              className="btn-secondary"
            >
              <span>Targeted skill drills</span>
            </Link>
          </div>

          {/* Micro trust metrics */}
          <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-white/[0.06] pt-6 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Adaptive multistage routing</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>1:1 Verified answer keys</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Desmos graphing integration</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Terminal / Product Visual */}
        <div className="relative">
          <div className="glass-card overflow-hidden rounded-2xl border border-white/10 bg-[#0c1017]/90 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            {/* Terminal Topbar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="ml-2 font-mono text-xs text-zinc-400">adaptive_session_preview.json</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[11px] font-semibold text-mint">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                Live Engine
              </span>
            </div>

            {/* Diagnostic Score Display */}
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/40 p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Predictive Digital SAT Score
                  </span>
                  <div className="nums mt-1 flex items-baseline gap-2">
                    <span className="font-mono text-4xl font-extrabold text-white">1540</span>
                    <span className="font-mono text-xs text-zinc-500">/ 1600</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded bg-mint/15 px-2 py-1 font-mono text-xs font-bold text-mint">
                    99th Percentile
                  </span>
                  <span className="mt-1 block text-[11px] text-zinc-400">
                    EBRW: 760 · Math: 780
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Module Simulation Matrix */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-medium">RW Module 1</span>
                  <span className="font-mono text-mint">27/27</span>
                </div>
                <span className="mt-1 block text-[11px] text-zinc-400">Baseline routing</span>
              </div>

              <div className="rounded-xl border border-mint/20 bg-mint/[0.03] p-3">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="font-semibold text-white">RW Module 2</span>
                  <span className="font-mono text-mint">25/27</span>
                </div>
                <span className="mt-1 block text-[11px] text-mint/80 font-medium">Upper adaptive route</span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-medium">Math Module 1</span>
                  <span className="font-mono text-mint">22/22</span>
                </div>
                <span className="mt-1 block text-[11px] text-zinc-400">Baseline routing</span>
              </div>

              <div className="rounded-xl border border-mint/20 bg-mint/[0.03] p-3">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="font-semibold text-white">Math Module 2</span>
                  <span className="font-mono text-mint">21/22</span>
                </div>
                <span className="mt-1 block text-[11px] text-mint/80 font-medium">Upper adaptive route</span>
              </div>
            </div>

            {/* Subtopic Drill Bar */}
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/30 p-3.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-medium text-zinc-300">Targeted Mastery Breakdown</span>
                <span className="font-mono text-zinc-400">22 Subtopics</span>
              </div>
              <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-mint" style={{ width: "45%" }} title="Algebra" />
                <div className="h-full bg-emerald-400" style={{ width: "30%" }} title="Advanced Math" />
                <div className="h-full bg-cyan-400" style={{ width: "15%" }} title="Reading Analysis" />
                <div className="h-full bg-white/30" style={{ width: "10%" }} title="Review needed" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Algebra: 96%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Geometry: 92%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Grammar: 90%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
