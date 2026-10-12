import Link from "next/link";

const links = [
  { href: "/sat", label: "Digital SAT" },
  { href: "/practice/targeted", label: "Targeted Drills" },
  { href: "/ap", label: "AP Subjects" },
  { href: "/practice", label: "Practice Hub" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#04040a]">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs font-medium text-zinc-400 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mt-8 max-w-[62ch] text-xs leading-relaxed text-zinc-500">
          Klutch is an independent study site. It isn&rsquo;t affiliated with
          or endorsed by the College Board, and SAT and AP are their
          trademarks, not ours.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.05] pt-6 text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Klutch Prep. All rights reserved.</p>
          <p>
            Official contact:{" "}
            <a
              href="mailto:prep.klutch@gmail.com"
              className="font-medium text-zinc-300 transition hover:text-mint"
            >
              prep.klutch@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
