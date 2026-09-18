import Link from "next/link";
import { notFound } from "next/navigation";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { coverageFor, needsCheck, unitTitles } from "@/lib/apContent";
import { SubjectTabs } from "@/components/ap/SubjectTabs";

export function generateStaticParams() {
  return AP_SUBJECTS.map((s) => ({ slug: s.slug }));
}

export default function ApSubjectPage({
  params,
}: {
  params: { slug: string };
}) {
  const subject = AP_SUBJECTS.find((s) => s.slug === params.slug);
  if (!subject) notFound();

  const units = unitTitles(subject.slug, subject.units);
  const coverage = coverageFor(subject.slug);
  const idx = AP_SUBJECTS.findIndex((s) => s.slug === subject.slug);
  const prev = AP_SUBJECTS[idx - 1];
  const next = AP_SUBJECTS[idx + 1];

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <Link
        href="/ap"
        className="text-sm text-zinc-400 transition hover:text-white"
      >
        All AP subjects
      </Link>

      <h1 className="mt-6 font-display text-[32px] font-bold tracking-tight text-white">
        {subject.name}
      </h1>
      <p className="nums mt-2 text-sm text-zinc-500">
        {subject.category} &middot; {units.length} units &middot; scored 1 to 5
      </p>

      {needsCheck(subject.slug) && (
        <p className="mt-5 max-w-[62ch] border-l-2 border-white/20 pl-4 text-[13px] leading-relaxed text-zinc-400">
          This course was redesigned recently or doesn&rsquo;t use conventional
          content units, so treat the breakdown below as provisional until
          it&rsquo;s checked against the current course description.
        </p>
      )}

      <div className="mt-10">
        <SubjectTabs units={units} coverage={coverage} />
      </div>

      <nav className="mt-14 flex flex-wrap justify-between gap-4 border-t border-white/[0.07] pt-6">
        {prev ? (
          <Link
            href={`/ap/${prev.slug}`}
            className="text-[13px] text-zinc-400 transition hover:text-white"
          >
            {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/ap/${next.slug}`}
            className="text-[13px] text-zinc-400 transition hover:text-white"
          >
            {next.name}
          </Link>
        )}
      </nav>
    </section>
  );
}
