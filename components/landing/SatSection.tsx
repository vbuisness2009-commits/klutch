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
    <section id="sat" className="border-b border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              <span>Full-Length &amp; Modular Prep</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Digital SAT Practice
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-zinc-400">
              Full-length practice tests under authentic Bluebook timing: two Reading &amp; Writing modules, two Math modules, adaptive routing, and integrated Desmos calculator.
            </p>
          </div>
          <Link
            href={hubHref}
            className="text-xs font-semibold text-mint hover:text-mint-300 transition"
          >
            Open SAT Hub →
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
              <h4 className="text-sm font-bold text-white">Targeted Skill Practice</h4>
              <p className="mt-0.5 text-xs text-zinc-400">Zero in on weak subtopics (Circles, Systems, Quadratics, Vocab, Transitions). 30 calibrated questions: 10 Easy, 10 Medium, 10 Hard.</p>
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

        <div className="mt-12 flex items-baseline justify-between border-b border-white/[0.08] pb-4">
          <h3 className="font-display text-lg font-bold text-white">
            Official Practice Exams
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {uploaded.length} full-length {uploaded.length === 1 ? "test" : "tests"}
          </span>
        </div>

        {uploaded.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">
            No practice tests published yet.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 font-semibold">Test Title</th>
                  <th className="py-3 font-semibold">Collection</th>
                  <th className="nums py-3 text-right font-semibold">
                    Questions
                  </th>
                  <th className="py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {uploaded.map((t) => (
                  <tr
                    key={t.id}
                    className="text-sm transition hover:bg-white/[0.02]"
                  >
                    <td className="py-3.5 pr-4 font-medium text-white">
                      {t.title}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-zinc-400">{t.collection}</td>
                    <td className="nums py-3.5 pr-4 text-right text-xs font-mono text-zinc-400">
                      {t.questionCount}
                    </td>
                    <td className="py-3.5 text-right">
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
                            className="rounded-md border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint transition hover:bg-mint hover:text-ink-950"
                          >
                            Start Test →
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

        <p className="mt-6 text-xs text-zinc-500">
          All full-length exams are scored on the official 400–1600 scale with module-level pacing diagnostics.
        </p>
      </div>
    </section>
  );
}
