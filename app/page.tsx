import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { SatSection } from "@/components/landing/SatSection";
import { ApSection } from "@/components/landing/ApSection";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SatSection />
      <ApSection />

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <p className="max-w-[54ch] text-[15px] leading-relaxed text-zinc-400">
          The fastest way to find out if this is useful is to sit one paper.
          It takes about two hours and you&rsquo;ll get a score at the end.
        </p>
        <Link
          href="/sat"
          className="mt-5 inline-block rounded bg-mint px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
        >
          Pick a paper
        </Link>
      </section>
    </>
  );
}
