import Link from "next/link";
import { ARCHIVE_COUNT } from "@/lib/satArchive";
import { AP_SUBJECTS } from "@/lib/apSubjects";

const AP_COUNT = AP_SUBJECTS.length;

export function Hero() {
  return (
    <section className="border-b border-white/[0.07]">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:pb-20 lg:pt-20">
        <div>
          <h1 className="max-w-[17ch] font-display text-[42px] font-bold leading-[1.05] tracking-tight text-white sm:text-[52px]">
            The SAT and every AP, from the real papers.
          </h1>

          <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-zinc-400">
            Klutch is a study archive for College Board exams. Sit a past
            digital SAT under real timing, or work an AP subject unit by unit
            with graded practice, guides, and vocab.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/sat"
              className="rounded bg-mint px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
            >
              SAT archive
            </Link>
            <Link
              href="/ap"
              className="rounded border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.04]"
            >
              AP subjects
            </Link>
          </div>
        </div>

        {/* Both pillars, with their honest status side by side. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:pt-2">
          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-bold text-white">
                Digital SAT
              </h2>
              <span className="text-[11px] font-semibold text-mint">
                Ready now
              </span>
            </div>
            <p className="nums mt-2 text-[13px] leading-relaxed text-zinc-400">
              {ARCHIVE_COUNT} past administrations, parsed question by question.
              Full papers, timed by module, scored 400 to 1600.
            </p>
          </div>

          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-bold text-white">
                AP
              </h2>
              <span className="text-[11px] font-semibold text-zinc-400">
                Filling in
              </span>
            </div>
            <p className="nums mt-2 text-[13px] leading-relaxed text-zinc-400">
              All {AP_COUNT} subjects are mapped to their units. Past exams,
              tiered practice, guides, and vocab are being loaded subject by
              subject.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
