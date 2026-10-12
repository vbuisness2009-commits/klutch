"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { flushPendingAttempt } from "@/lib/attemptsClient";

const links = [
  { href: "/sat", label: "SAT" },
  { href: "/ap", label: "AP" },
  { href: "/practice", label: "Practice" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
];

type Me = {
  user: { name: string; email: string; avatarUrl: string | null } | null;
  isAdmin: boolean;
};

export function Nav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<Me>)
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        if (data.user) void flushPendingAttempt();
      })
      .catch(() => {
        if (!cancelled) setMe({ user: null, isAdmin: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  const user = me?.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#04040A]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            const href = user
              ? link.href
              : `/signup?next=${encodeURIComponent(link.href)}`;

            return (
              <Link
                key={link.href}
                href={href}
                className={`text-[13px] font-medium transition duration-150 ${
                  isActive
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3.5">
          {me?.isAdmin && (
            <Link
              href="/admin"
              className="rounded-md border border-mint/30 bg-mint/10 px-2.5 py-1 text-xs font-semibold text-mint transition hover:bg-mint/20"
            >
              Admin
            </Link>
          )}

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                title={user.email}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint/20 text-[10px] font-bold text-mint">
                    {(user.name || user.email)[0]!.toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline font-medium">{user.name || user.email}</span>
              </Link>
              <button
                type="button"
                onClick={logOut}
                className="text-xs text-zinc-400 transition hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`hidden text-[13px] font-medium text-zinc-400 transition hover:text-white sm:block ${me ? "" : "invisible"}`}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={`rounded-lg bg-mint px-3.5 py-1.5 text-xs font-bold text-ink-950 shadow-sm transition hover:bg-mint-400 ${me ? "" : "invisible"}`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
