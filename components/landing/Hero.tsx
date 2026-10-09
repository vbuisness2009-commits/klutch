import Link from "next/link";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { listTests } from "@/lib/testEngine/store";
import { currentUser } from "@/lib/userSession";

const AP_COUNT = AP_SUBJECTS.length;

export async function Hero() {
  const tests = await listTests();
  const user = await currentUser();
  const satCount = tests.filter((t) => t.published).length;
  const satHref = user ? "/sat" : "/signup?next=/sat";
  const apHref = user ? "/ap" : "/signup?next=/ap";

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
              href={satHref}
              className="rounded bg-mint px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
            >
              SAT archive
            </Link>
            <Link
              href={apHref}
              className="rounded border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.04]"
            >
              AP subjects
            </Link>
          </div>
        </div>

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
              {satCount === 0
                ? "Papers appear here as they are uploaded."
                : `${satCount} paper${satCount === 1 ? "" : "s"} ready — timed by module, scored 400 to 1600.`}
            </p>
          </div>

          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-bold text-white">
                AP
              </h2>
              <span className="text-[11px] font-semibold text-zinc-400">
                {AP_COUNT} subjects
              </span>
            </div>
            <p className="nums mt-2 text-[13px] leading-relaxed text-zinc-400">
              Unit guides, vocab, and practice — still being loaded subject by
              subject.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
