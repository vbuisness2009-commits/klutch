import Link from "next/link";
import type { AttemptRecord } from "@/lib/attempts";

export function CompletedTestsSection({
  attempts,
}: {
  attempts: AttemptRecord[];
}) {
  const completed = attempts.filter((a) => a.scorable && a.total != null);

  return (
    <section className="mt-14 max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.1] pb-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Completed Tests
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Official scores, section performance, and item distribution across completed exams.
          </p>
        </div>
        <span className="nums rounded-full bg-mint/10 border border-mint/25 px-3 py-1 text-xs font-semibold text-mint">
          {completed.length} Completed
        </span>
      </div>

      {completed.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-zinc-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-white">
            No completed tests yet
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-400">
            Generate a new adaptive test or select one from the practice library. Once you complete a test, your total score, score distribution, and section analytics will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {completed.map((attempt) => {
            const isGenerated =
              attempt.formId.startsWith("generated-test-") ||
              attempt.formName.toLowerCase().includes("generated test");

            const totalQuestions =
              (attempt.totals.correct ?? 0) +
              (attempt.totals.incorrect ?? 0) +
              (attempt.totals.blank ?? 0) || 98;

            const correctPct = Math.round(
              ((attempt.totals.correct ?? 0) / totalQuestions) * 100
            );
            const incorrectPct = Math.round(
              ((attempt.totals.incorrect ?? 0) / totalQuestions) * 100
            );
            const blankPct = Math.max(0, 100 - correctPct - incorrectPct);

            return (
              <div
                key={attempt.id}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/40 p-6 backdrop-blur transition hover:border-white/[0.15] hover:bg-ink-900/60"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-xl font-bold tracking-tight text-white">
                        {attempt.formName}
                      </h3>
                      {isGenerated ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 border border-mint/30 px-2.5 py-0.5 text-[11px] font-semibold text-mint">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generated Test · AI Adaptive Bank
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                          Full-Length Practice Test
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      Completed on{" "}
                      {new Date(attempt.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Total Score Display */}
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span className="nums font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        {attempt.total}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400">
                        / 1600
                      </span>
                    </div>
                    {attempt.totalMargin != null && (
                      <p className="nums text-[11px] text-zinc-400">
                        Band ±{attempt.totalMargin} pts
                      </p>
                    )}
                  </div>
                </div>

                {/* Section Scores Grid */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {attempt.sections.map((section) => {
                    const secPct = section.total > 0
                      ? Math.round((section.correct / section.total) * 100)
                      : 0;

                    return (
                      <div
                        key={section.id}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            {section.name}
                          </span>
                          <span className="nums font-display text-lg font-bold text-white">
                            {section.score != null ? `${section.score} pts` : "Unscored"}
                          </span>
                        </div>

                        {/* Section Accuracy */}
                        <div className="mt-2.5 flex items-baseline justify-between text-xs">
                          <span className="text-zinc-400">Accuracy</span>
                          <span className="nums font-semibold text-white">
                            {section.correct}/{section.total} correct · {secPct}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-mint transition-all duration-500"
                            style={{ width: `${secPct}%` }}
                          />
                        </div>

                        {/* Route Tag */}
                        <div className="mt-2 text-[11px] text-zinc-400">
                          {section.route === "upper" ? (
                            <span className="text-mint">
                              Module 2: Advanced Adaptive (Upper Route)
                            </span>
                          ) : (
                            <span>Module 2: Standard Adaptive</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Question Distribution Bar */}
                <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-zinc-300">
                      Overall Question Distribution
                    </span>
                    <span className="nums text-zinc-400">
                      {attempt.totals.correct ?? 0} correct ·{" "}
                      {attempt.totals.incorrect ?? 0} incorrect ·{" "}
                      {attempt.totals.blank ?? 0} unanswered
                    </span>
                  </div>

                  {/* Segmented Distribution Bar */}
                  <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="bg-mint transition-all"
                      style={{ width: `${correctPct}%` }}
                      title={`Correct: ${attempt.totals.correct ?? 0}`}
                    />
                    <div
                      className="bg-rose-500 transition-all"
                      style={{ width: `${incorrectPct}%` }}
                      title={`Incorrect: ${attempt.totals.incorrect ?? 0}`}
                    />
                    <div
                      className="bg-zinc-600 transition-all"
                      style={{ width: `${blankPct}%` }}
                      title={`Unanswered: ${attempt.totals.blank ?? 0}`}
                    />
                  </div>

                  {/* Legend */}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-mint" />
                      Correct ({correctPct}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Incorrect ({incorrectPct}%)
                    </span>
                    {blankPct > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-zinc-600" />
                        Unanswered ({blankPct}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
                  <Link
                    href={`/practice/test/${attempt.formId}`}
                    className="rounded-lg border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    Retake Test
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
