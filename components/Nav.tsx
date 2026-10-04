"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { flushPendingAttempt } from "@/lib/attemptsClient";

const links = [
  { href: "/sat", label: "SAT" },
  { href: "/ap", label: "AP" },
  { href: "/practice", label: "Practice" },
  { href: "/dashboard", label: "Dashboard" },
];

type Me = {
  user: { name: string; email: string; avatarUrl: string | null } | null;
  isAdmin: boolean;
};

export function Nav() {
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
          {me?.isAdmin && (
            <Link
              href="/admin"
              className="text-sm font-medium text-mint transition hover:text-mint-300"
            >
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
                title={user.email}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint/15 text-[11px] font-bold text-mint">
                    {(user.name || user.email)[0]!.toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline">{user.name || user.email}</span>
              </Link>
              <button
                type="button"
                onClick={logOut}
                className="text-sm text-zinc-500 transition hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`hidden text-sm text-zinc-400 transition hover:text-white sm:block ${me ? "" : "invisible"}`}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={`rounded bg-mint px-3.5 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 ${me ? "" : "invisible"}`}
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
