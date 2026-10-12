import Link from "next/link";
import { listTests, type TestSummary } from "@/lib/testEngine/store";
import { currentUser } from "@/lib/userSession";
import { listAttempts } from "@/lib/attemptsStore";
import type { AttemptRecord } from "@/lib/attempts";
import { getUserCreditInfo } from "@/lib/credits";
import { isAdminRequest } from "@/lib/adminRequest";
import { GenerateTestButton } from "@/components/dashboard/GenerateTestButton";
import { CompletedTestsSection } from "@/components/dashboard/CompletedTestsSection";
import { CreditsBadge } from "@/components/dashboard/CreditsBadge";

export const dynamic = "force-dynamic";

const linkClass =
  "text-[13px] font-medium text-zinc-300 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/60";

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: { upgrade?: string; upgraded?: string };
}) {
  const [user, tests, adminReq] = await Promise.all([
    currentUser(),
    listTests(),
    isAdminRequest(),
  ]);
  const playable = tests.filter((t) => t.published);
  const [attempts, creditInfo] = user
    ? await Promise.all([
        listAttempts(user.id).catch(() => []),
        getUserCreditInfo(user.id).catch(() => null),
      ])
    : [[], null];
  const takenIds = new Set(attempts.map((a) => a.formId));
  const nextTest = playable.find((t) => !takenIds.has(t.id)) ?? playable[0];

  if (!user) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="panel max-w-3xl p-6 sm:p-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
            Your scores &amp; progress
          </h1>
          <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
            Create a free account to track your Digital SAT scores, timed practice attempts, and personalized weak-skill analytics across every test.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/signup?next=/dashboard"
              className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400"
            >
              Create account
            </Link>
            <Link href="/login?next=/dashboard" className={linkClass}>
              Log in
            </Link>
          </div>
        </div>

        {/* Endless Practice Engine Callout for signed-out guests */}
        <div className="panel mt-8 max-w-3xl border border-mint/20 bg-gradient-to-br from-mint/10 via-ink-900/60 to-ink-950 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 border border-mint/30 px-2.5 py-0.5 text-xs font-bold text-mint">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Endless Practice Engine
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                Generate a New Adaptive Test
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Never run out of tests. Generate brand-new 98-question adaptive tests matching the official College Board blueprint with multi-step math and advanced reading passages.
              </p>
            </div>
            <div className="shrink-0">
              <GenerateTestButton isLoggedIn={false} />
            </div>
          </div>
        </div>

        <PracticeTestList tests={playable} user={null} />
      </section>
    );
  }

  const scored = attempts.filter((a) => a.scorable && a.total != null);
  const latest = scored[0];
  const best = scored.reduce<AttemptRecord | undefined>(
    (b, a) => (!b || a.total! > b.total! ? a : b),
    undefined
  );
  const weakSkills = aggregateSkills(attempts).slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      {/* Upgrade Success Notification */}
      {(searchParams?.upgrade === "success" || searchParams?.upgraded) && (
        <div className="mb-6 rounded-xl border border-mint/40 bg-mint/10 p-4 text-sm font-semibold text-mint flex items-center justify-between">
          <span>🎉 Membership updated successfully! Your practice test credits have been refreshed.</span>
          <Link href="/dashboard" className="text-xs text-white underline">
            Dismiss
          </Link>
        </div>
      )}

      {/* Greeting & Credit Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
            {user.name ? `${user.name}'s scores` : "Your scores"}
          </h1>
          <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
            {scored.length === 0
              ? "No tests completed yet. Generate a new adaptive test or pick a test below to start tracking your scores."
              : `${scored.length} test${scored.length === 1 ? "" : "s"} completed.`}
          </p>
        </div>
        <div>
          <CreditsBadge
            tier={creditInfo?.tier}
            balance={creditInfo?.balance}
            isUnlimited={creditInfo?.isUnlimited}
            isAdmin={Boolean(creditInfo?.isAdmin || adminReq)}
          />
        </div>
      </div>

      {/* Top Stat Cards */}
      {latest && (
        <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Stat label="Latest Score" value={latest.total!} sub={`±${latest.totalMargin ?? 0} · ${latest.formName}`} />
          <Stat label="Best Score" value={best!.total!} sub={best!.formName} />
          {latest.sections.map((s) =>
            s.score != null ? (
              <Stat key={s.id} label={s.name} value={s.score} sub={`${s.correct}/${s.total} correct`} />
            ) : null
          )}
        </div>
      )}

      {/* Endless Adaptive Practice Test Generator Hero */}
      <div className="panel mt-8 max-w-4xl overflow-hidden border border-mint/25 bg-gradient-to-br from-mint/10 via-ink-900/60 to-ink-950 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 border border-mint/30 px-2.5 py-0.5 text-xs font-bold text-mint">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Endless Practice Engine
              </span>
              <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                Shared Bank · Maximum Credit Efficiency
              </span>
              <span className="rounded-full bg-mint/15 border border-mint/25 px-2.5 py-0.5 text-[11px] font-bold text-mint">
                {creditInfo?.isUnlimited
                  ? "Unlimited Tests"
                  : `${creditInfo?.balance ?? 0} Credits Left`}
              </span>
            </div>
            <h2 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Generate a New Adaptive Test
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Never get stuck when Bluebook tests run out. Click to draw a fresh untaken test from our shared library, or generate a brand-new 98-question adaptive test matching the official College Board blueprint.
            </p>
          </div>
          <div className="shrink-0">
            <GenerateTestButton isLoggedIn={true} />
          </div>
        </div>
      </div>

      {/* Up Next Card */}
      {nextTest && (
        <div className="panel mt-6 max-w-xl p-6">
          <h2 className="font-display text-base font-bold text-white">
            {takenIds.has(nextTest.id) ? "Retake" : "Up next:"} {nextTest.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
            {nextTest.questionCount} questions under real timing. Treat it like the real thing.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href={`/practice/test/${nextTest.id}`}
              className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400"
            >
              Start the test
            </Link>
            <Link href="/sat" className={linkClass}>
              Pick a different test
            </Link>
          </div>
        </div>
      )}

      {/* Completed Tests Category with Score & Distribution */}
      <CompletedTestsSection attempts={attempts} />

      {/* Weak Skills Analytics */}
      {weakSkills.length > 0 && (
        <div className="mt-14 max-w-4xl">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Where you&rsquo;re dropping points
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Skills with the lowest accuracy across your completed attempts.
          </p>
          <ul className="mt-4 divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {weakSkills.map((s) => (
              <li key={`${s.sectionId}|${s.skill}`} className="flex items-baseline gap-4 py-3 text-sm">
                <span className="flex-1 text-white">{s.skill}</span>
                <span className="text-[12px] text-zinc-500">{s.domain}</span>
                <span className="nums w-24 text-right text-zinc-300">
                  {s.correct}/{s.total} · {Math.round((s.correct / s.total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Practice Tests Catalog */}
      <PracticeTestList tests={playable} user={user} takenIds={takenIds} />
    </section>
  );
}

function PracticeTestList({
  tests,
  user,
  takenIds = new Set(),
}: {
  tests: TestSummary[];
  user: unknown;
  takenIds?: Set<string>;
}) {
  return (
    <div className="mt-14 max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.1] pb-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Practice Tests Bank
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Official Practice Tests 1–5 are completely free to all students (0 credits used).
          </p>
        </div>
        <span className="nums text-xs font-semibold text-mint">
          {tests.length} available
        </span>
      </div>

      <div className="mt-3 divide-y divide-white/[0.07] border-b border-white/[0.07]">
        {tests.map((t) => {
          const isCompleted = takenIds.has(t.id);
          const isGenerated =
            t.collection === "Generated Tests" ||
            t.id.startsWith("generated-test-") ||
            t.source === "ai-blueprint";

          const isOfficialFree =
            t.id.startsWith("practice-test-") ||
            t.collection === "Official Practice Tests" ||
            t.source?.toLowerCase().includes("free");

          return (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-display text-[16px] font-semibold text-white">
                    {t.title}
                  </span>
                  {isOfficialFree ? (
                    <span className="rounded-full bg-emerald-400/15 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      100% Free · 0 Credits
                    </span>
                  ) : isGenerated ? (
                    <span className="rounded-full bg-mint/15 border border-mint/25 px-2 py-0.5 text-[11px] font-medium text-mint">
                      Generated Test
                    </span>
                  ) : (
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                      {t.collection || "Full-Length Adaptive"}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                      Completed
                    </span>
                  )}
                </div>
                <p className="nums mt-1 text-[13px] text-zinc-400">
                  {t.questionCount} questions · 134 minutes · Reading &amp; Writing + Math
                </p>
              </div>

              <div>
                <Link
                  href={
                    user
                      ? `/practice/test/${t.id}`
                      : `/signup?next=${encodeURIComponent(`/practice/test/${t.id}`)}`
                  }
                  className={`rounded px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    isCompleted
                      ? "border border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      : "bg-mint text-ink-950 hover:bg-mint-400"
                  }`}
                >
                  {isCompleted ? "Retake Test" : "Start Test"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="nums mt-2 font-display text-[32px] font-bold leading-none text-white">{value}</p>
      <p className="mt-2 truncate text-[12px] text-zinc-500">{sub}</p>
    </div>
  );
}

/** Lowest accuracy first, ignoring skills seen fewer than twice. */
function aggregateSkills(attempts: AttemptRecord[]) {
  const map = new Map<string, AttemptRecord["skills"][number]>();
  for (const a of attempts) {
    if (!a.scorable) continue;
    for (const s of a.skills) {
      const key = `${s.sectionId}|${s.skill}`;
      const row = map.get(key) ?? { ...s, correct: 0, total: 0 };
      row.correct += s.correct;
      row.total += s.total;
      map.set(key, row);
    }
  }
  return [...map.values()]
    .filter((s) => s.total >= 2 && s.correct < s.total)
    .sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total);
}
