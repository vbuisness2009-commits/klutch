import Link from "next/link";
import { listTests } from "@/lib/testEngine/store";
import { currentUser } from "@/lib/userSession";
import { listAttempts } from "@/lib/attemptsStore";
import type { AttemptRecord } from "@/lib/attempts";

export const dynamic = "force-dynamic";

const linkClass =
  "text-[13px] font-medium text-zinc-300 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/60";

export default async function Dashboard() {
  const [user, tests] = await Promise.all([currentUser(), listTests()]);
  const playable = tests.filter((t) => t.published);
  const attempts = user ? await listAttempts(user.id).catch(() => []) : [];
  const takenIds = new Set(attempts.map((a) => a.formId));
  const nextTest = playable.find((t) => !takenIds.has(t.id)) ?? playable[0];

  if (!user) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
          Your scores
        </h1>
        <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
          Make a free account and every paper you finish is saved here: section
          scores, total score, and the skills you keep dropping points on.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
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
      <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
        {user.name ? `${user.name}'s scores` : "Your scores"}
      </h1>
      <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
        {attempts.length === 0
          ? "Nothing here yet. Finish a paper and this page starts tracking your scores and weak spots."
          : `${attempts.length} paper${attempts.length === 1 ? "" : "s"} finished.`}
      </p>

      {latest && (
        <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Stat label="Latest" value={latest.total!} sub={`±${latest.totalMargin ?? 0} · ${latest.formName}`} />
          <Stat label="Best" value={best!.total!} sub={best!.formName} />
          {latest.sections.map((s) =>
            s.score != null ? (
              <Stat key={s.id} label={s.name} value={s.score} sub={`${s.correct}/${s.total} correct`} />
            ) : null
          )}
        </div>
      )}

      <div className="panel mt-8 max-w-xl p-6">
        {nextTest ? (
          <>
            <h2 className="font-display text-base font-bold text-white">
              {takenIds.has(nextTest.id) ? "Retake" : "Up next:"} {nextTest.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              {nextTest.questionCount} questions under real timing. Treat it like
              the real thing.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href={`/practice/test/${nextTest.id}`}
                className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400"
              >
                Start the test
              </Link>
              <Link href="/sat" className={linkClass}>
                Pick a different paper
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-base font-bold text-white">
              No papers uploaded yet
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              Once a paper is in the library, you can start it from here.
            </p>
          </>
        )}
      </div>

      {weakSkills.length > 0 && (
        <div className="mt-12 max-w-3xl">
          <h2 className="font-display text-xl font-bold tracking-tight text-white">
            Where you&rsquo;re dropping points
          </h2>
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

      {attempts.length > 0 && (
        <div className="mt-12 max-w-3xl">
          <h2 className="font-display text-xl font-bold tracking-tight text-white">History</h2>
          <ul className="mt-4 divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-3 text-sm">
                <span className="flex-1 font-medium text-white">{a.formName}</span>
                <span className="text-[12px] text-zinc-500">
                  {new Date(a.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="nums w-40 text-right text-zinc-300">
                  {a.total != null
                    ? `${a.total} · ${a.sections.map((s) => s.score).filter((x) => x != null).join(" / ")}`
                    : `${a.totals.correct}/${a.totals.answered} answered · unscored`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
