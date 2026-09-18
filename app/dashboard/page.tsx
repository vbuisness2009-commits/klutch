import Link from "next/link";
import { NEWEST_SAT } from "@/lib/satArchive";

/**
 * First-run state. There's no auth or attempt storage yet, so every account
 * genuinely has nothing here. Showing a populated chart with invented scores
 * would be lying about what the product does.
 */
export default function Dashboard() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
        Your scores
      </h1>
      <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
        Nothing here yet. Finish a paper and this page starts tracking section
        scores, total score, and the topics you keep dropping points on.
      </p>

      <div className="panel mt-8 max-w-xl p-6">
        <h2 className="font-display text-base font-bold text-white">
          Start with {NEWEST_SAT.name}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
          It&rsquo;s the most recent one in the archive, administered{" "}
          {NEWEST_SAT.administered}. Set aside {NEWEST_SAT.minutes} minutes and
          treat it like the real thing.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href={`/practice/sat/${NEWEST_SAT.id}`}
            className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400"
          >
            Start the test
          </Link>
          <Link
            href="/sat"
            className="text-[13px] font-medium text-zinc-300 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/60"
          >
            Pick a different paper
          </Link>
        </div>
      </div>

      <p className="mt-8 max-w-[58ch] text-[13px] leading-relaxed text-zinc-500">
        AP scores land here too, on the 1 to 5 scale, once there&rsquo;s
        practice loaded for the subject you&rsquo;re taking. Everything is
        stored on your account only, and there&rsquo;s no leaderboard.
      </p>
    </section>
  );
}
