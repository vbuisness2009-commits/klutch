import Link from "next/link";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { listTests } from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";

export default async function PracticeIndex() {
  const papers = (await listTests()).filter(
    (t) => t.published || t.published
  );
  const newestPlayable = papers.find((t) => t.published);

  const options = [
    {
      href: "/practice/demo",
      title: "One question",
      body: "A single question in the player, so you can see the interface before committing two hours to it.",
      meta: "About a minute",
    },
    ...(newestPlayable
      ? [
          {
            href: `/practice/test/${newestPlayable.id}`,
            title: "A full timed test",
            body: `${newestPlayable.title}: two sections, two timed modules each, module 2 chosen by how you do on module 1.`,
            meta: "134 minutes",
          },
        ]
      : []),
    {
      href: "/sat",
      title: "The SAT practice library",
      body:
        papers.length === 0
          ? "Practice tests appear here as they are uploaded."
          : `${papers.length} practice test${papers.length === 1 ? "" : "s"}, ready to sit under timing.`,
      meta: "Varies",
    },
    {
      href: "/ap",
      title: "An AP subject",
      body: `All ${AP_SUBJECTS.length} subjects broken into their units. Practice and guides are still being loaded.`,
      meta: "Unit by unit",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
        Practice
      </h1>
      <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-zinc-400">
        Pick a way in, depending on which exam you&rsquo;re sitting and how much
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
