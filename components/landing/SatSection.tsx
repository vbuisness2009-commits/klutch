import Link from "next/link";
import { listTests } from "@/lib/testEngine/store";
import { currentUser } from "@/lib/userSession";
import { listAttempts } from "@/lib/attemptsStore";
import { LatestScoreCard } from "@/components/sat/LatestScoreCard";
import { GenerateTestCard } from "@/components/sat/GenerateTestCard";

export async function SatSection() {
  const [uploaded, user] = await Promise.all([
    listTests().then((tests) => tests.filter((t) => t.published)),
    currentUser(),
  ]);

  const attempts = user ? await listAttempts(user.id).catch(() => []) : [];
  const latestScored = attempts.find((a) => a.scorable && a.total != null) ?? null;

  const hubHref = user ? "/sat" : "/signup?next=/sat";

  return (
    <section id="sat" className="border-b border-white/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              Digital SAT practice
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-zinc-400">
              Full-length practice tests you can sit under real exam timing: two Reading and Writing
              modules, two Math modules, adaptive between them.
            </p>
          </div>
          <Link
            href={hubHref}
            className="text-sm font-medium text-mint underline decoration-mint/30 underline-offset-4 transition hover:decoration-mint"
          >
            Open the SAT hub
          </Link>
        </div>

        {/* Latest Score Card */}
        <div className="mt-8">
          <LatestScoreCard initialLatest={latestScored} />
        </div>

        {/* Generate Your Own Practice Test Card */}
        <div className="mt-6">
          <GenerateTestCard isLoggedIn={Boolean(user)} />
        </div>

        {/* Targeted Practice Banner */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/15 text-mint font-bold text-lg border border-mint/20">
              🎯
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">Struggling with a specific question type?</h4>
              <p className="mt-0.5 text-xs text-zinc-400">Drill Geometry, Algebra, Vocab, or input any custom topic. 30 questions: 10 Easy, 10 Medium, 10 Hard.</p>
            </div>
          </div>
          <Link
            href="/practice/targeted"
            className="shrink-0 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] hover:border-mint/50 hover:bg-mint/10 hover:text-mint px-4 py-2 text-xs font-semibold text-white transition"
          >
            Launch Targeted Drills →
          </Link>
        </div>

        <div className="mt-10 flex items-baseline justify-between">
          <h3 className="font-display text-lg font-bold text-white">
            Official Practice Exams
          </h3>
          <span className="text-xs text-zinc-500">
            {uploaded.length} full-length tests ready
          </span>
        </div>

        {uploaded.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">
            No practice tests published yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.14] text-[11px] font-medium text-zinc-500">
                  <th className="pb-2.5 font-medium">Test</th>
                  <th className="pb-2.5 font-medium">Section</th>
                  <th className="nums pb-2.5 text-right font-medium">
                    Questions
                  </th>
                  <th className="pb-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploaded.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/[0.07] text-sm last:border-b-0"
                  >
                    <td className="py-3 pr-4 font-medium text-white">
                      {t.title}
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">{t.collection}</td>
                    <td className="nums py-3 pr-4 text-right text-zinc-400">
                      {t.questionCount}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1">
                        {t.published ? (
                          <Link
                            href={
                              user
                                ? `/practice/test/${t.id}`
                                : `/signup?next=${encodeURIComponent(
                                    `/practice/test/${t.id}`
                                  )}`
                            }
                            className="text-[13px] font-semibold text-mint transition hover:text-mint-300"
                          >
                            Start
                          </Link>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-5 text-[13px] text-zinc-500">
          Complete a practice test in the player for a predictive score.
        </p>
      </div>
    </section>
  );
}
