import Link from "next/link";
import { listTests } from "@/lib/testEngine/store";

export async function SatSection() {
  const uploaded = (await listTests()).filter(
    (t) => t.published || t.published
  );

  return (
    <section id="sat" className="border-b border-white/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              The SAT archive
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-zinc-400">
              Full papers you can sit under real timing: two Reading and Writing
              modules, two Math modules, adaptive between them.
            </p>
          </div>
          <Link
            href="/sat"
            className="text-sm font-medium text-mint underline decoration-mint/30 underline-offset-4 transition hover:decoration-mint"
          >
            Open the SAT hub
          </Link>
        </div>

        {uploaded.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">
            No papers uploaded yet.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.14] text-[11px] font-medium text-zinc-500">
                  <th className="pb-2.5 font-medium">Paper</th>
                  <th className="pb-2.5 font-medium">Section</th>
                  <th className="nums pb-2.5 text-right font-medium">
                    Questions
                  </th>
                  <th className="pb-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploaded.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/[0.07] text-sm last:border-b-0"
                  >
                    <td className="py-3 pr-4 font-medium text-white">
                      {t.title}
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">{t.collection}</td>
                    <td className="nums py-3 pr-4 text-right text-zinc-400">
                      {t.questionCount}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1">
                        {t.published ? (
                          <Link
                            href={`/practice/test/${t.id}`}
                            className="text-[13px] font-semibold text-mint transition hover:text-mint-300"
                          >
                            Start
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

        <p className="mt-5 text-[13px] text-zinc-500">
          Sit a paper in the player for a score..
        </p>
      </div>
    </section>
  );
}
