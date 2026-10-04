"use client";

import React, { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { flushPendingAttempt } from "@/lib/attemptsClient";

type Props = {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  cta: string;
  alt: React.ReactNode;
};

const inputClass =
  "w-full rounded border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none";

const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up yet. Use email for now.",
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "That Google sign-in link expired. Try again.",
  google_failed: "Google sign-in failed. Try again.",
  google_unverified: "That Google account's email isn't verified.",
};

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function AuthForm({ mode, title, subtitle, cta, alt }: Props) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(
    GOOGLE_ERRORS[params.get("error") ?? ""] ?? null
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Something went wrong. Try again.");
      await flushPendingAttempt();
      // Full navigation so the nav and server pages pick up the new session.
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-sm flex-col justify-center px-5 py-14">
      <h1 className="font-display text-2xl font-bold tracking-tight text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p>

      <a
        href={`/api/auth/google?next=${encodeURIComponent(next)}`}
        className="mt-7 flex w-full items-center justify-center gap-2.5 rounded border border-white/15 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
      >
        <GoogleMark />
        Continue with Google
      </a>

      <div className="my-5 flex items-center gap-3 text-[12px] text-zinc-600">
        <span className="h-px flex-1 bg-white/10" />
        or with email
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-2.5">
        {mode === "signup" && (
          <input
            name="name"
            type="text"
            required
            autoComplete="given-name"
            placeholder="First name"
            className={inputClass}
          />
        )}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
          className={inputClass}
        />
        {error && (
          <p className="text-[13px] text-rose-300/90" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-mint px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-50"
        >
          {loading ? "One sec…" : cta}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-400">{alt}</p>
    </section>
  );
}

export function AuthShell(props: Props) {
  return (
    <Suspense fallback={null}>
      <AuthForm {...props} />
    </Suspense>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}
