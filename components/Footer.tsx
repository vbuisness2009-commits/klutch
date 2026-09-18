import Link from "next/link";

// Only pages that actually exist. A link farm to /about, /blog, and /status
// when none of them are built is filler.
const links = [
  { href: "/sat", label: "SAT" },
  { href: "/ap", label: "AP" },
  { href: "/practice", label: "Practice" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 max-w-[62ch] text-[13px] leading-relaxed text-zinc-500">
          Klutch is an independent study site. It isn&rsquo;t affiliated with
          or endorsed by the College Board, and SAT and AP are their
          trademarks, not ours.
        </p>

        <p className="mt-4 text-[13px] text-zinc-600">
          &copy; {new Date().getFullYear()} Klutch
        </p>
      </div>
    </footer>
  );
}
