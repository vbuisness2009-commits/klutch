import Link from "next/link";
import { notFound } from "next/navigation";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { hasContent, loadMeta, subjectSummary, type ApUnitSummary } from "@/lib/apLoader";
import { Markdown } from "@/components/ap/Markdown";
import { UnitProgress } from "@/components/ap/UnitProgress";

export function generateStaticParams() {
  return AP_SUBJECTS.map((s) => ({ slug: s.slug }));
}

export default function ApSubjectPage({ params }: { params: { slug: string } }) {
  const summary = subjectSummary(params.slug);
  if (!summary) notFound();
  const meta = loadMeta(params.slug);
  const ready = hasContent(summary);
  const { totals } = summary;

  return (
    <div className="max-w-3xl">
      {meta?.overview && (
        <Markdown source={meta.overview} className="text-[15px] text-zinc-300" />
      )}

      {ready ? (
        <p className="nums mt-5 text-[13px] text-zinc-500">
          {[
            plural(totals.guides, "unit guide"),
            plural(totals.mcq, "multiple-choice question"),
            totals.frq ? plural(totals.frq, "free-response task") : null,
            plural(totals.vocab, "vocab term"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : (
        <div className="panel mt-2 p-6">
          <p className="text-sm text-zinc-300">
            {meta
              ? "The exam profile for this subject is in, but no unit has landed yet."
              : "Nothing for this subject has been written yet."}
          </p>
          <p className="mt-1.5 max-w-[56ch] text-[13px] leading-relaxed text-zinc-500">
            Each unit gets a guide, its vocab, and practice graded Intro, Exam
            level, and Hardest. They appear below as they&rsquo;re added.
          </p>
        </div>
      )}

      <ol className="mt-6">
        {summary.units.map((u) => (
          <UnitRow key={u.number} slug={summary.slug} u={u} />
        ))}
      </ol>
    </div>
  );
}

function UnitRow({ slug, u }: { slug: string; u: ApUnitSummary }) {
  const href = `/ap/${slug}/unit/${u.number}`;
  const open = u.status === "ready";
  const questions = u.mcq + u.frq;

  return (
    <li className="border-b border-white/[0.07] py-3.5">
      <div className="flex items-baseline gap-4">
        <span className="nums w-6 flex-shrink-0 text-[13px] text-zinc-600">{u.number}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            {open ? (
              <Link href={href} className="text-sm font-medium text-zinc-100 transition hover:text-mint">
                {u.title}
              </Link>
            ) : (
              <span className="text-sm text-zinc-300">{u.title}</span>
            )}
            {u.weight && <span className="nums flex-shrink-0 text-[12px] text-zinc-500">{u.weight} of exam</span>}
          </div>

          {open ? (
            <div className="nums mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
              {u.guide && (
                <Link href={href} className="text-zinc-400 hover:text-white">
                  Guide
                </Link>
              )}
              {questions > 0 && (
                <Link href={`${href}#practice`} className="text-zinc-400 hover:text-white">
                  Practice <span className="text-zinc-600">{questions}</span>
                </Link>
              )}
              {u.vocab > 0 && (
                <Link href={`${href}#vocab`} className="text-zinc-400 hover:text-white">
                  Vocab <span className="text-zinc-600">{u.vocab}</span>
                </Link>
              )}
              {u.videos > 0 && (
                <Link href={`${href}#videos`} className="text-zinc-400 hover:text-white">
                  Videos <span className="text-zinc-600">{u.videos}</span>
                </Link>
              )}
              <UnitProgress slug={slug} unit={u.number} total={questions} />
            </div>
          ) : (
            u.status !== "none" && (
              <p className="mt-1 text-[12px] text-zinc-600">
                {u.status === "malformed" ? "Being fixed" : "Not written yet"}
              </p>
            )
          )}
        </div>
      </div>
    </li>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
