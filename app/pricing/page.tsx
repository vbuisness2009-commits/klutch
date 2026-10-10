import Link from "next/link";
import { currentUser } from "@/lib/userSession";
import { getUserCreditInfo, PLAN_LIMITS } from "@/lib/credits";
import { PricingCards } from "./PricingCards";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await currentUser();
  const credits = user ? await getUserCreditInfo(user.id) : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/15 px-3 py-1 text-xs font-bold text-mint">
          Transparent, Student-First Pricing
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Prep Without Artificial Limits
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-lg">
          Bluebook runs out after 6 tests. Klutch provides endless, psychometrically calibrated Digital SAT exams so you never hit a wall before test day.
        </p>
      </div>

      {/* Pricing Cards Component */}
      <div className="mt-12">
        <PricingCards
          userTier={credits?.tier ?? null}
          isLoggedIn={Boolean(user)}
          currentBalance={credits?.balance ?? 0}
        />
      </div>

      {/* Value Comparison */}
      <div className="mt-20 rounded-2xl border border-white/[0.08] bg-ink-900/40 p-8 sm:p-10">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white text-center">
          How Klutch Compares to the Competition
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="font-display text-base font-bold text-zinc-300">
              Private Tutoring
            </h3>
            <p className="mt-1 font-display text-2xl font-extrabold text-rose-400">
              $100 – $250 / hr
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">
              Expensive, difficult to schedule, and static paper drills with subjective grading.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="font-display text-base font-bold text-zinc-300">
              Official Bluebook
            </h3>
            <p className="mt-1 font-display text-2xl font-extrabold text-zinc-300">
              $0 (Runs Out)
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">
              Official format, but strictly limited to 6 static tests. Once finished, practice stops.
            </p>
          </div>

          <div className="rounded-xl border border-mint/30 bg-mint/[0.04] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-mint">
                Klutch Adaptive
              </h3>
              <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-mint">
                BEST ROI
              </span>
            </div>
            <p className="mt-1 font-display text-2xl font-extrabold text-white">
              $19 / mo
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-300">
              Endless 98-question adaptive exams, shared test bank, and AI score diagnostics.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="mt-20 max-w-3xl mx-auto">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white text-center">
          Frequently Asked Questions
        </h2>
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="font-display text-base font-semibold text-white">
              How do test credits work?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              1 credit gives you full access to 1 complete, 98-question adaptive Digital SAT practice test (54 Reading &amp; Writing, 44 Math) under real exam timing and scoring.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="font-display text-base font-semibold text-white">
              Does taking a test from the shared test bank cost a credit?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Yes. Each practice test attempt uses 1 credit, whether freshly synthesized or drawn from our shared test bank.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="font-display text-base font-semibold text-white">
              Can I cancel my subscription at any time?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Yes, with 1 click. You retain your remaining test credits and full account history until the end of your billing cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
