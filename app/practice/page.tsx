import Link from "next/link";
import { ARCHIVE_COUNT } from "@/lib/satArchive";
import { AP_SUBJECTS } from "@/lib/apSubjects";

const options = [
  {
    href: "/practice/demo",
    title: "One question",
    body: "A single question in the player, so you can see the interface before committing two hours to it.",
    meta: "About a minute",
  },
  {
    href: "/practice/test/practice-a",
    title: "A full timed test",
    body: "Two sections, two timed modules each, module 2 chosen by how you do on module 1. Questions are placeholders while the item pool is built.",
    meta: "134 minutes",
  },
  {
    href: "/sat",
    title: "The past paper archive",
    body: `${ARCHIVE_COUNT} past administrations, browsable by date.`,
    meta: "Varies",
  },
  {
    href: "/sat#tests",
    title: "One SAT topic",
    body: "Questions pulled from across the archive and grouped by what they're testing.",
    meta: "As long as you want",
  },
  {
    href: "/ap",
    title: "An AP subject",
    body: `All ${AP_SUBJECTS.length} subjects broken into their units. Practice and guides are still being loaded.`,
    meta: "Unit by unit",
  },
];

export default function PracticeIndex() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
        Practice
      </h1>
      <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
        Four ways in, depending on which exam you&rsquo;re sitting and how much
        time you have.
      </p>

      <div className="mt-8 max-w-2xl">
        {options.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="block border-b border-white/[0.07] py-5 transition hover:bg-white/[0.02]"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-display text-[17px] font-semibold text-white">
                {o.title}
              </span>
              <span className="nums flex-shrink-0 text-[12px] text-zinc-500">
                {o.meta}
              </span>
            </div>
            <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-zinc-400">
              {o.body}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
