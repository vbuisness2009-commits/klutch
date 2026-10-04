import Link from "next/link";
import { listTests } from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";

export default async function SatHub() {
  const uploaded = (await listTests()).filter(
    (t) => t.published || t.published
  );

  return (
    <>
      <section className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h1 className="max-w-[18ch] font-display text-[38px] font-bold leading-[1.08] tracking-tight text-white sm:text-[46px]">
            Digital SAT practice tests
          </h1>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-zinc-400">
            {uploaded.length === 0
              ? "Papers appear here when they are uploaded to the library."
              : `${uploaded.length} paper${uploaded.length === 1 ? "" : "s"} ready to sit under timing.`}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            {uploaded[0]?.published && (
              <Link
                href={`/practice/test/${uploaded[0].id}`}
                className="rounded bg-mint px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
              >
                Start {uploaded[0].title}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section id="tests" className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Papers
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-zinc-400">
            Sit the adaptive player for a timed score.
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
