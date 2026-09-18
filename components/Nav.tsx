import Link from "next/link";
import { Logo } from "./Logo";

const links = [
  { href: "/sat", label: "SAT" },
  { href: "/ap", label: "AP" },
  { href: "/practice", label: "Practice" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm text-zinc-400 transition hover:text-white sm:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded bg-mint px-3.5 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
