import Link from "next/link";
import { AP_SUBJECTS, type ApSubject } from "@/lib/apSubjects";
import { AP_UNITS } from "@/lib/apContent";
import { currentUser } from "@/lib/userSession";

const CATEGORIES: ApSubject["category"][] = [
  "Math & CS",
  "Sciences",
  "History & Social Science",
  "English",
  "World Languages",
  "Arts",
];

const features = [
  {
    title: "Full-Length Mock Exams",
    body: "Timed exam practice under authentic conditions, scored on the official 1 to 5 scale with section pacing analytics.",
  },
  {
    title: "Graded by Difficulty",
    body: "Problems tiered from Foundational to Exam Level and Hardest, ensuring you master both the baseline and score-deciding items.",
  },
  {
    title: "Unit-by-Unit Walkthroughs",
    body: "Concise, high-yield walkthroughs for each College Board course unit, written for rapid review before test day.",
  },
  {
    title: "Key Exam Vocabulary",
    body: "Essential terminology with the exact conceptual definitions rewarded on free-response and multiple-choice rubrics.",
  },
  {
    title: "Curated Video Deep Dives",
    body: "Hand-selected video walkthroughs for the most challenging topics, so you see hard proofs and concepts worked step by step.",
  },
  {
    title: "Targeted FRQ Strategy",
    body: "Step-by-step breakdowns for free-response rubrics, showing where points are won or lost.",
  },
];

export async function ApSection() {
  const user = await currentUser();
  const apHref = user ? "/ap" : "/signup?next=/ap";
  const unitCount = Object.values(AP_UNITS).reduce((n, u) => n + u.length, 0);

  return (
    <section id="ap" className="border-b border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-magenta" />
              <span>38 Subjects · {unitCount} Units</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Advanced Placement (AP) Suite
            </h2>
            <p className="nums mt-2 max-w-[58ch] text-sm leading-relaxed text-zinc-400">
              Complete course preparation for all 38 College Board AP courses, structured by authentic unit blueprints with guided practice and full-length exam simulations.
            </p>
          </div>
          <Link
            href={apHref}
            className="text-xs font-semibold text-mint hover:text-mint-300 transition"
          >
            Browse All Subjects →
          </Link>
        </div>

        {/* Categories Grid */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const subjects = AP_SUBJECTS.filter((s) => s.category === cat);
            return (
              <Link
                key={cat}
                href={user ? `/ap#${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : `/signup?next=/ap`}
                className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition duration-150 hover:border-white/20 hover:bg-white/[0.04]"
              >
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {cat}
                </span>
                <span className="nums rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-mono font-medium text-zinc-400 group-hover:text-mint transition-colors">
                  {subjects.length} Subjects
                </span>
              </Link>
            );
          })}
        </div>

        {/* Core Subject Pillars */}
        <h3 className="mt-12 font-display text-base font-bold text-white border-t border-white/[0.08] pt-8">
          The Anatomy of Each AP Subject
        </h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5"
            >
              <div className="text-sm font-semibold text-zinc-100">
                {f.title}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
