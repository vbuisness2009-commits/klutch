import Link from "next/link";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { listTests } from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";

export default async function PracticeIndex() {
  const papers = (await listTests()).filter((t) => t.published);
  const newestPlayable = papers[0];

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          <span>Diagnostic &amp; Exam Modes</span>
        </div>
        <h1 className="mt-4 font-display text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
          Practice Hub
        </h1>
        <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
          Select your preparation format based on your schedule, target test, and specific areas of weakness.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Featured Card 1: Targeted Practice */}
        <Link
          href="/practice/targeted"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/[0.05] via-white/[0.02] to-transparent p-6 transition duration-200 hover:border-mint/50"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-mint">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                Recommended
              </span>
              <span className="rounded bg-mint/15 px-2 py-0.5 font-mono text-[11px] font-bold text-mint">
                30 Questions
              </span>
            </div>
            <h2 className="mt-3 font-display text-xl font-bold text-white group-hover:text-mint transition-colors">
              Targeted Skill Drills
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              Zero in on specific struggle areas (Linear Systems, Circles, Quadratics, Vocab, Transitions) or type your own custom topic. Drill 30 calibrated questions: 10 Easy, 10 Medium, 10 Hard.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs">
            <span className="text-zinc-400 font-mono">10E · 10M · 10H Tiers</span>
            <span className="font-semibold text-mint group-hover:translate-x-0.5 transition-transform">
              Start Drill →
            </span>
          </div>
        </Link>

        {/* Featured Card 2: Full Timed Adaptive Test */}
        <Link
          href={newestPlayable ? `/practice/test/${newestPlayable.id}` : "/sat"}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:border-white/25 hover:bg-white/[0.035]"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-400">
                Official Blueprint
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-300">
                134 Minutes
              </span>
            </div>
            <h2 className="mt-3 font-display text-xl font-bold text-white group-hover:text-mint transition-colors">
              Full-Length Timed SAT
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {newestPlayable
                ? `${newestPlayable.title}: two sections, two timed modules each, with real-time adaptive routing between modules.`
                : "Sit a full adaptive exam under real testing conditions with instant scoring from 400 to 1600."}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs">
            <span className="text-zinc-400 font-mono">4 Modules · Scored 1600</span>
            <span className="font-semibold text-white group-hover:text-mint group-hover:translate-x-0.5 transition">
              Begin Test →
            </span>
          </div>
        </Link>

        {/* Card 3: Quick Demo Question */}
        <Link
          href="/practice/demo"
          className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20 hover:bg-white/[0.03]"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-400">Interface Tour</span>
              <span className="font-mono text-[11px] text-zinc-400">~1 Minute</span>
            </div>
            <h3 className="mt-2 font-display text-base font-bold text-white group-hover:text-mint transition-colors">
              One-Question Player Preview
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              Experience the Bluebook-style player interface, annotator, and Desmos panel before committing to a full session.
            </p>
          </div>
          <div className="mt-4 border-t border-white/[0.06] pt-3 text-right">
            <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition">
              Try Player →
            </span>
          </div>
        </Link>

        {/* Card 4: AP Subjects */}
        <Link
          href="/ap"
          className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20 hover:bg-white/[0.03]"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-400">Course Units</span>
              <span className="font-mono text-[11px] text-zinc-400">{AP_SUBJECTS.length} Subjects</span>
            </div>
            <h3 className="mt-2 font-display text-base font-bold text-white group-hover:text-mint transition-colors">
              AP Subject Practice
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              Structured walkthroughs, vocabulary terms, and graded questions broken down unit by unit for every College Board course.
            </p>
          </div>
          <div className="mt-4 border-t border-white/[0.06] pt-3 text-right">
            <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition">
              Browse Subjects →
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
