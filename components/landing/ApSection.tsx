import Link from "next/link";
import { AP_SUBJECTS, type ApSubject } from "@/lib/apSubjects";
import { AP_UNITS, NEEDS_CHECK } from "@/lib/apContent";

const CATEGORIES: ApSubject["category"][] = [
  "Math & CS",
  "Sciences",
  "History & Social Science",
  "English",
  "World Languages",
  "Arts",
];

const pieces = [
  {
    title: "Past exams",
    body: "Released papers, handled the same way as the SAT archive: real questions, real timing, scored 1 to 5.",
  },
  {
    title: "Practice by difficulty",
    body: "Every problem graded Intro, Exam level, or Hardest, so you can warm up or go straight at the ones that decide your score.",
  },
  {
    title: "Unit guides",
    body: "One walkthrough per unit of the College Board course, written to be read the night before rather than over a semester.",
  },
  {
    title: "Vocab",
    body: "The terms each unit expects you to already know, with the definition the exam actually rewards.",
  },
  {
    title: "Video",
    body: "Links out to the explanation that covers a unit best, rather than us re-recording something worse.",
  },
];

export function ApSection() {
  const unitCount = Object.values(AP_UNITS).reduce((n, u) => n + u.length, 0);

  return (
    <section id="ap" className="border-b border-white/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              AP, subject by subject
            </h2>
            <p className="nums mt-2 max-w-[58ch] text-sm leading-relaxed text-zinc-400">
              All {AP_SUBJECTS.length} subjects the College Board offers, broken
              into the {unitCount} units their course descriptions use.{" "}
              {NEEDS_CHECK.size} of them were redesigned recently and are marked
              provisional until we recheck the breakdown.
            </p>
          </div>
          <Link
            href="/ap"
            className="text-sm font-medium text-mint underline decoration-mint/30 underline-offset-4 transition hover:decoration-mint"
          >
            Browse all subjects
          </Link>
        </div>

        <div className="mt-8 grid gap-x-10 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const subjects = AP_SUBJECTS.filter((s) => s.category === cat);
            return (
              <Link
                key={cat}
                href="/ap#subjects"
                className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] py-3 transition hover:bg-white/[0.02]"
              >
                <span className="text-sm text-zinc-200">{cat}</span>
                <span className="nums flex-shrink-0 text-[12px] text-zinc-500">
                  {subjects.length}
                </span>
              </Link>
            );
          })}
        </div>

        <h3 className="mt-12 font-display text-base font-bold text-white">
          What goes into each subject
        </h3>
        <div className="mt-5 grid gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {pieces.map((p) => (
            <div key={p.title}>
              <div className="text-sm font-semibold text-zinc-100">
                {p.title}
              </div>
              <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-zinc-400">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-[62ch] text-[13px] leading-relaxed text-zinc-500">
          None of the five are loaded yet. Every subject page is built out
          against its real units, so you can see the shape of it and watch each
          one fill in.
        </p>
      </div>
    </section>
  );
}
