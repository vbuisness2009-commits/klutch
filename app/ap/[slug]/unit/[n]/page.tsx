import Link from "next/link";
import { notFound } from "next/navigation";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { loadUnit, subjectBySlug, unitList } from "@/lib/apLoader";
import type { ApUnit } from "@/lib/apSchema";
import { Markdown } from "@/components/ap/Markdown";
import { UnitTabs, type UnitTab } from "@/components/ap/UnitTabs";
import { PracticeSet } from "@/components/ap/PracticeSet";
import { Vocab } from "@/components/ap/Vocab";

// One page per unit, generated at build. Only this unit's questions and
// answers ship with it.
export function generateStaticParams() {
  return AP_SUBJECTS.flatMap((s) => unitList(s.slug).map((u) => ({ slug: s.slug, n: String(u.number) })));
}

export const dynamicParams = false;

export default function UnitPage({ params }: { params: { slug: string; n: string } }) {
  const subject = subjectBySlug(params.slug);
  const n = Number(params.n);
  const units = unitList(params.slug);
  const entry = units.find((u) => u.number === n);
  if (!subject || !entry) notFound();

  const unit = loadUnit(params.slug, n);
  const k = units.indexOf(entry);
  const prev = units[k - 1];
  const next = units[k + 1];

  const tabs: UnitTab[] = [];
  if (unit) {
    const g = unit.guide;
    if (g.summary || g.sections.length) tabs.push({ id: "guide", label: "Guide", content: <Guide unit={unit} /> });
    if (unit.practice.length) {
      tabs.push({
        id: "practice",
        label: "Practice",
        count: unit.practice.length,
        content: <PracticeSet slug={params.slug} unit={n} questions={unit.practice} />,
      });
    }
    if (unit.vocab.length) {
      tabs.push({
        id: "vocab",
        label: "Vocab",
        count: unit.vocab.length,
        content: <Vocab slug={params.slug} unit={n} terms={unit.vocab} />,
      });
    }
    if (unit.videos?.length) {
      tabs.push({ id: "videos", label: "Videos", count: unit.videos.length, content: <Videos unit={unit} /> });
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="nums text-[12px] text-zinc-500">
        Unit {n}
        {entry.weight && <> &middot; {entry.weight} of the exam</>}
      </p>
      <h2 className="mt-1 font-display text-[22px] font-bold tracking-tight text-white sm:text-[26px]">{entry.title}</h2>

      <div className="mt-8">
        {tabs.length ? (
          <UnitTabs tabs={tabs} />
        ) : (
          <div className="panel p-6">
            <p className="text-sm text-zinc-300">This unit hasn&rsquo;t been written yet.</p>
            <p className="mt-1.5 text-[13px] text-zinc-500">
              Its guide, vocab, and practice will show up here when they land.
            </p>
          </div>
        )}
      </div>

      <nav className="mt-12 flex flex-wrap justify-between gap-4 border-t border-white/[0.07] pt-5 text-[13px]">
        {prev ? (
          <Link href={`/ap/${params.slug}/unit/${prev.number}`} className="text-zinc-400 hover:text-white">
            Unit {prev.number}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/ap/${params.slug}/unit/${next.number}`} className="text-right text-zinc-400 hover:text-white">
            Unit {next.number}: {next.title}
          </Link>
        )}
      </nav>
    </div>
  );
}

function Guide({ unit }: { unit: ApUnit }) {
  const g = unit.guide;
  return (
    <article>
      {g.summary && <Markdown source={g.summary} className="text-[16px] text-zinc-200" />}

      {g.sections.length > 1 && (
        <nav aria-label="In this guide" className="mt-6 border-l border-white/[0.14] pl-4">
          <ol className="space-y-1 text-[13px]">
            {g.sections.map((s, k) => (
              <li key={k}>
                <a href={`#s-${k + 1}`} className="text-zinc-400 hover:text-white">
                  {s.heading || `Part ${k + 1}`}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {g.sections.map((s, k) => (
        <section key={k} id={`s-${k + 1}`} className="mt-10 scroll-mt-24">
          {s.heading && (
            <h3 className="border-b border-white/[0.14] pb-2 font-display text-lg font-bold text-white">{s.heading}</h3>
          )}
          <Markdown source={s.body} className="mt-4 text-[15px] text-zinc-300" />
        </section>
      ))}

      <ListBlock title="Key takeaways" items={g.keyTakeaways} />
      <ListBlock title="Common mistakes" items={g.commonMistakes} />
      <ListBlock title="On the exam" items={g.examTips} />

      {g.cramSheet && (
        <section className="mt-12">
          <h3 className="font-display text-lg font-bold text-white">Cram sheet</h3>
          <p className="mt-1 text-[12px] text-zinc-500">The whole unit on one screen, for the morning of.</p>
          <div className="panel mt-4 p-5">
            <Markdown source={g.cramSheet} className="text-[14px] text-zinc-200" />
          </div>
        </section>
      )}
    </article>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <h3 className="border-b border-white/[0.14] pb-2 font-display text-lg font-bold text-white">{title}</h3>
      <ul className="ap-text mt-4 list-disc space-y-2.5 pl-5 text-[14px] leading-relaxed text-zinc-300 marker:text-zinc-600">
        {items.map((s, k) => (
          <li key={k}>
            <Markdown source={s} inline />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Videos({ unit }: { unit: ApUnit }) {
  return (
    <ul>
      {unit.videos!.map((v) => (
        <li key={v.url} className="border-b border-white/[0.07] py-3">
          <a
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-100 underline decoration-white/20 underline-offset-4 hover:decoration-white/60"
          >
            {v.title}
          </a>
          {v.channel && <span className="ml-2 text-[12px] text-zinc-500">{v.channel}</span>}
        </li>
      ))}
    </ul>
  );
}
