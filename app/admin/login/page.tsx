"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed.");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-sm flex-col justify-center px-5 py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint/70">
        Operator
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
        Admin login
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Upload papers and manage the library. After you sign in once, this
        browser stays trusted for a year.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-2.5">
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none"
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none"
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <a
        href={`/api/auth/google?next=${encodeURIComponent(next)}`}
        className="mt-3 block w-full rounded border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
      >
        Continue with Google
      </a>
    </section>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <p className="px-5 py-14 text-center text-sm text-zinc-500">Loading…</p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
