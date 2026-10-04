import Link from "next/link";
import { notFound } from "next/navigation";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { loadMeta, subjectSummary } from "@/lib/apLoader";
import { mcqSection } from "@/lib/apMock";
import { SubjectNav } from "@/components/ap/SubjectNav";

export function generateStaticParams() {
  return AP_SUBJECTS.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

/** Header and sub-navigation shared by a subject's home, exam, mock and unit pages. */
export default function SubjectLayout({
  params,
  children,
}: {
  params: { slug: string };
  children: React.ReactNode;
}) {
  const summary = subjectSummary(params.slug);
  if (!summary) notFound();
  const meta = loadMeta(params.slug);
  const hasMock = Boolean(meta && mcqSection(meta).count > 0 && summary.totals.mcq > 0);

  const idx = AP_SUBJECTS.findIndex((s) => s.slug === summary.slug);
  const prev = AP_SUBJECTS[idx - 1];
  const next = AP_SUBJECTS[idx + 1];

  const facts = [
    summary.category,
    `${summary.units.length} units`,
    meta?.examMode,
    meta?.totalMinutes ? formatMinutes(meta.totalMinutes) : null,
    "scored 1 to 5",
  ].filter(Boolean);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <Link href="/ap" className="text-sm text-zinc-400 transition hover:text-white">
        All AP subjects
      </Link>

      <h1 className="mt-6 font-display text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
        {summary.name}
      </h1>
      <p className="nums mt-2 text-sm text-zinc-500">{facts.join(" · ")}</p>

      {summary.provisional && (
        <p className="mt-5 max-w-[62ch] border-l-2 border-white/20 pl-4 text-[13px] leading-relaxed text-zinc-400">
          This course was redesigned recently or doesn&rsquo;t use conventional
          content units, so treat the breakdown below as provisional until
          it&rsquo;s checked against the current course description.
        </p>
      )}

      <div className="mt-8">
        <SubjectNav slug={summary.slug} hasExam={Boolean(meta)} hasMock={hasMock} />
      </div>

      <div className="mt-8">{children}</div>

      <nav className="mt-14 flex flex-wrap justify-between gap-4 border-t border-white/[0.07] pt-6">
        {prev ? (
          <Link href={`/ap/${prev.slug}`} className="text-[13px] text-zinc-400 transition hover:text-white">
            {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/ap/${next.slug}`} className="text-[13px] text-zinc-400 transition hover:text-white">
            {next.name}
          </Link>
        )}
      </nav>
    </section>
  );
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} hr${r ? ` ${r} min` : ""}` : `${r} min`;
}
