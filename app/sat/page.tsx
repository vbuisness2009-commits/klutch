import Link from "next/link";
import { SAT_ARCHIVE, ARCHIVE_COUNT } from "@/lib/satArchive";
import { listTests } from "@/lib/testEngine/store";

// Uploaded tests are read from disk, so this page cannot be prerendered.
export const dynamic = "force-dynamic";

const drills = [
  "Reading and Writing",
  "Algebra",
  "Advanced Math",
  "Data Analysis",
  "Geometry and Trigonometry",
  "Grammar and conventions",
];

export default async function SatHub() {
  const uploaded = (await listTests()).filter(
    (t) => t.availability.test || t.availability.pdf
  );

  return (
    <>
      <section className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h1 className="max-w-[18ch] font-display text-[38px] font-bold leading-[1.08] tracking-tight text-white sm:text-[46px]">
            The digital SAT archive
          </h1>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-zinc-400">
            {ARCHIVE_COUNT} past administrations, parsed question by question
            from the real papers. Sit one under timing or pull a single module
            when that&rsquo;s all you have time for.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/practice/demo"
              className="rounded bg-mint px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
            >
              Try one question
            </Link>
            <Link
              href="#tests"
              className="text-sm font-medium text-zinc-300 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/60"
            >
              Jump to the papers
            </Link>
          </div>
        </div>
      </section>

      {uploaded.length > 0 && (
        <section className="border-b border-white/[0.07]">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              Live tests
            </h2>
            <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-zinc-400">
              Sit these in the player under real timing, or print the paper.
            </p>
            <div className="mt-8">
              {uploaded.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-white/[0.07] py-4"
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
                  <span className="ml-auto flex items-baseline gap-5">
                    {t.availability.test && (
                      <Link
                        href={`/practice/test/${t.id}`}
                        className="text-[13px] font-semibold text-mint"
                      >
                        Start test
                      </Link>
                    )}
                    {t.availability.pdf && (
                      <a
                        href={`/api/admin/tests/${t.id}/pdf`}
                        className="text-[13px] font-medium text-zinc-300 underline decoration-white/25 underline-offset-4 hover:text-white"
                      >
                        Print
                      </a>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="tests" className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Past papers
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-zinc-400">
            Two Reading and Writing modules, two Math modules, adaptive between
            them the same way the real thing is.
          </p>

          <div className="mt-8">
            {SAT_ARCHIVE.map((t) => (
              <Link
                key={t.id}
                href={`/practice/sat/${t.id}`}
                className="row-rule group flex flex-wrap items-baseline gap-x-5 gap-y-1 py-4 transition hover:bg-white/[0.02]"
              >
                <span className="min-w-[13rem] font-display text-[17px] font-semibold text-white">
                  {t.name}
                </span>
                <span className="text-[13px] text-zinc-500">
                  {t.administered}
                </span>
                <span className="nums text-[13px] text-zinc-500">
                  {t.questions} questions
                </span>
                <span className="nums text-[13px] text-zinc-500">
                  {t.minutes} min
                </span>
                <span className="ml-auto text-[13px] font-semibold text-mint">
                  Start
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Drill one topic
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-zinc-400">
            Questions pulled from across the archive and grouped by what
            they&rsquo;re testing.
          </p>

          <ul className="mt-7 flex flex-wrap gap-2.5">
            {drills.map((d) => (
              <li key={d}>
                <Link
                  href={`/practice/sat/drill/${d
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")}`}
                  className="panel block px-3.5 py-2 text-[13px] font-medium text-zinc-200"
                >
                  {d}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
