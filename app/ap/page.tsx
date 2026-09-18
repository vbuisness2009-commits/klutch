import Link from "next/link";
import { AP_SUBJECTS, type ApSubject } from "@/lib/apSubjects";
import { NEEDS_CHECK, needsCheck } from "@/lib/apContent";

const CATEGORIES: ApSubject["category"][] = [
  "Math & CS",
  "Sciences",
  "History & Social Science",
  "English",
  "World Languages",
  "Arts",
];

export default function ApHub() {
  const totalUnits = AP_SUBJECTS.reduce((n, s) => n + s.units, 0);

  return (
    <>
      <section className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h1 className="max-w-[20ch] font-display text-[38px] font-bold leading-[1.08] tracking-tight text-white sm:text-[46px]">
            AP subjects
          </h1>
          <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-zinc-400">
            Every subject the College Board offers, broken into the units its
            course description actually uses. Each unit is built out with a
            guide, its vocab, practice graded by difficulty, and past exam
            questions that hit it.
          </p>

          <dl className="nums mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-[11px] text-zinc-500">Subjects</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-white">
                {AP_SUBJECTS.length}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-500">Units total</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-white">
                {totalUnits}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-500">Marked provisional</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-white">
                {NEEDS_CHECK.size}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="subjects" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {CATEGORIES.map((cat) => {
          const subjects = AP_SUBJECTS.filter((s) => s.category === cat);
          return (
            <div key={cat} className="mb-12 last:mb-0">
              <div className="flex items-baseline justify-between border-b border-white/[0.14] pb-2">
                <h2 className="font-display text-lg font-bold text-white">
                  {cat}
                </h2>
                <span className="nums text-[12px] text-zinc-500">
                  {subjects.length}
                </span>
              </div>

              <div className="mt-1 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/ap/${s.slug}`}
                    className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] py-3 transition hover:bg-white/[0.02]"
                  >
                    <span className="text-sm text-zinc-200">{s.name}</span>
                    <span className="flex flex-shrink-0 items-baseline gap-2.5">
                      {needsCheck(s.slug) && (
                        <span className="text-[11px] text-zinc-600">
                          Provisional
                        </span>
                      )}
                      <span className="nums text-[12px] text-zinc-500">
                        {s.units} units
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
