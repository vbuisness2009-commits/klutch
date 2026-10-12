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
      <section className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h1 className="max-w-[18ch] font-display text-[38px] font-bold leading-[1.08] tracking-tight text-white sm:text-[46px]">
            Digital SAT practice tests
          </h1>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-zinc-400">
            {uploaded.length === 0
              ? "Practice tests appear here when they are published."
              : `${uploaded.length} practice test${uploaded.length === 1 ? "" : "s"} ready to take under real exam timing.`}
          </p>

          {/* Latest Score Card */}
          <div className="mt-8">
            <LatestScoreCard initialLatest={latestScored} />
          </div>

          {/* Generate Your Own Practice Test Card */}
          <div className="mt-6">
            <GenerateTestCard isLoggedIn={Boolean(user)} />
          </div>
        </div>
      </section>

      <section id="tests" className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Official Practice Exams
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-zinc-400">
            Full-length adaptive tests scored from 400 to 1600.
          </p>

          {uploaded.length === 0 ? (
            <p className="mt-8 text-sm text-zinc-500">Nothing uploaded yet.</p>
          ) : (
            <div className="mt-8">
              {uploaded.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-white/[0.07] py-4"
                >
                  <span className="min-w-[14rem] font-display text-[17px] font-semibold text-white">
                    {t.title}
                  </span>
                  <span className="nums text-[13px] text-zinc-500">
                    {t.questionCount} questions
                  </span>
                  <span className="text-[13px] text-zinc-500">
                    {t.collection}
                  </span>
                  <span className="ml-auto flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    {t.published && (
                      <Link
                        href={`/practice/test/${t.id}`}
                        className="text-[13px] font-semibold text-mint"
                      >
                        Start test
                      </Link>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
