import Link from "next/link";
import { listTests } from "@/lib/testEngine/store";
import { currentUser } from "@/lib/userSession";
import { listAttempts } from "@/lib/attemptsStore";
import { LatestScoreCard } from "@/components/sat/LatestScoreCard";
import { GenerateTestCard } from "@/components/sat/GenerateTestCard";

export const dynamic = "force-dynamic";

export default async function SatHub() {
  const [uploaded, user] = await Promise.all([
    listTests().then((tests) => tests.filter((t) => t.published)),
    currentUser(),
  ]);

  const attempts = user ? await listAttempts(user.id).catch(() => []) : [];
  const latestScored = attempts.find((a) => a.scorable && a.total != null) ?? null;

  return (
    <>
      <section className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            <span>Digital SAT Practice Library</span>
          </div>
          <h1 className="mt-4 font-display text-[36px] font-bold leading-[1.08] tracking-tight text-white sm:text-[46px]">
            Digital SAT Practice Tests
          </h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-zinc-400">
            {uploaded.length === 0
              ? "Practice tests appear here when they are published."
              : `${uploaded.length} full-length adaptive tests calibrated against the official College Board testing blueprint.`}
          </p>

          {/* Latest Score Card */}
          <div className="mt-8">
            <LatestScoreCard initialLatest={latestScored} />
          </div>

          {/* Generate Your Own Practice Test Card */}
          <div className="mt-6">
            <GenerateTestCard isLoggedIn={Boolean(user)} />
          </div>

          {/* Targeted Practice Banner */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 shadow-sm transition hover:border-white/15">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-mint/20 bg-mint/10 text-mint">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth="1.75" />
                  <circle cx="12" cy="12" r="5" strokeWidth="1.75" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Targeted Skill Drills</h4>
                <p className="mt-0.5 text-xs text-zinc-400">Struggling with a specific concept? Drill 30 calibrated questions (10 Easy, 10 Medium, 10 Hard) with step-by-step rationales.</p>
              </div>
            </div>
            <Link
              href="/practice/targeted"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] hover:border-mint/50 hover:bg-mint/15 hover:text-mint px-4 py-2.5 text-xs font-semibold text-white transition"
            >
              <span>Launch Drills</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="tests" className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">
              Official Practice Exams
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              Scored 400 to 1600
            </span>
          </div>

          {uploaded.length === 0 ? (
            <p className="mt-8 text-sm text-zinc-500">Nothing uploaded yet.</p>
          ) : (
            <div className="mt-2 divide-y divide-white/[0.06]">
              {uploaded.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4.5 transition hover:bg-white/[0.015]"
                >
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-white">
                      {t.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                      <span>{t.collection}</span>
                      <span>•</span>
                      <span className="nums font-mono">{t.questionCount} questions</span>
                      <span>•</span>
                      <span>Adaptive 2-stage</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {t.published && (
                      <Link
                        href={
                          user
                            ? `/practice/test/${t.id}`
                            : `/signup?next=${encodeURIComponent(
                                `/practice/test/${t.id}`
                              )}`
                        }
                        className="rounded-lg bg-mint px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-mint-400"
                      >
                        Start Test →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
