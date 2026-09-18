import Link from "next/link";
import { SAT_ARCHIVE } from "@/lib/satArchive";

export function SatSection() {
  return (
    <section id="sat" className="border-b border-white/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              The SAT archive
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-zinc-400">
              Each one is a full paper: two Reading and Writing modules, two
              Math modules, adaptive between them the way the real thing is.
            </p>
          </div>
          <Link
            href="/sat"
            className="text-sm font-medium text-mint underline decoration-mint/30 underline-offset-4 transition hover:decoration-mint"
          >
            Open the SAT hub
          </Link>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.14] text-[11px] font-medium text-zinc-500">
                <th className="pb-2.5 font-medium">Administration</th>
                <th className="pb-2.5 font-medium">Region</th>
                <th className="nums pb-2.5 text-right font-medium">Questions</th>
                <th className="nums pb-2.5 text-right font-medium">Length</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {SAT_ARCHIVE.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-white/[0.07] text-sm last:border-b-0"
                >
                  <td className="py-3 pr-4 font-medium text-white">{t.name}</td>
                  <td className="py-3 pr-4 text-zinc-400">{t.region}</td>
                  <td className="nums py-3 pr-4 text-right text-zinc-400">
                    {t.questions}
                  </td>
                  <td className="nums py-3 pr-4 text-right text-zinc-400">
                    {t.minutes} min
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/practice/sat/${t.id}`}
                      className="text-[13px] font-semibold text-mint transition hover:text-mint-300"
                    >
                      Start
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-[13px] text-zinc-500">
          Any paper can also be printed, with or without the answer key, if
          you&rsquo;d rather work on paper.
        </p>
      </div>
    </section>
  );
}
