import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { SatSection } from "@/components/landing/SatSection";
import { ApSection } from "@/components/landing/ApSection";
import { currentUser } from "@/lib/userSession";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  const pickHref = user ? "/sat" : "/signup?next=/sat";

  return (
    <>
      <Hero />
      <SatSection />
      <ApSection />

      {/* Elevated Bottom Call-to-Action */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="glass-card flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-0.5 text-xs font-semibold text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              Begin Your Preparation
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to verify your score readiness?
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-zinc-400">
              Sit a complete 2-stage adaptive test under realistic Bluebook timing or drill your weakest question type with step-by-step solutions. Instant scoring included.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={pickHref}
              className="btn-primary"
            >
              <span>Take a practice test</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/practice/targeted"
              className="btn-secondary"
            >
              <span>Targeted drills</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
