"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PricingCards({
  userTier,
  isLoggedIn,
  currentBalance,
}: {
  userTier: "free" | "pro" | "unlimited" | null;
  isLoggedIn: boolean;
  currentBalance: number;
}) {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (tier: "pro" | "unlimited") => {
    if (!isLoggedIn) {
      router.push(`/signup?next=${encodeURIComponent("/pricing")}`);
      return;
    }

    setLoadingTier(tier);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to start checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingTier(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* FREE STARTER */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-ink-900/40 p-6 backdrop-blur transition hover:border-white/20 sm:p-8">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-white">
                Free Starter
              </h3>
              <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                Kickstart
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Ideal for initial baseline testing and experiencing the official Digital SAT environment.
            </p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold text-white">
                $0
              </span>
              <span className="text-xs text-zinc-400">/ forever</span>
            </div>

            <div className="my-6 border-t border-white/[0.06]" />

            <ul className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span className="font-semibold text-white">2 Practice Test Credits</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Full 98-Question College Board Blueprint</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Section Accuracy &amp; Question Distribution</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Digital SAT Math &amp; RW Timing Engine</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            {isLoggedIn ? (
              userTier === "free" ? (
                <button
                  disabled
                  className="w-full rounded-xl border border-white/20 bg-white/[0.04] py-3 text-xs font-semibold text-zinc-400 cursor-default"
                >
                  Current Plan ({currentBalance} credits left)
                </button>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-transparent py-3 text-xs font-semibold text-zinc-500 cursor-default"
                >
                  Included with Your Account
                </button>
              )
            ) : (
              <Link
                href="/signup?next=/pricing"
                className="block w-full rounded-xl border border-white/20 bg-white/[0.04] py-3 text-center text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
              >
                Sign Up Free
              </Link>
            )}
          </div>
        </div>

        {/* KLUTCH PRO */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-mint bg-gradient-to-b from-mint/[0.08] via-ink-900/60 to-ink-950 p-6 shadow-xl shadow-mint/5 backdrop-blur sm:p-8">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-mint px-4 py-1 text-[11px] font-black uppercase tracking-wider text-ink-950">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-white">
                Klutch Pro
              </h3>
              <span className="rounded-full bg-mint/20 border border-mint/30 px-2.5 py-0.5 text-xs font-bold text-mint">
                15 Tests / Mo
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              For serious score improvement. Take up to 3–4 full tests every week with weak-skill breakdown.
            </p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold text-white">
                $19
              </span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>

            <div className="my-6 border-t border-white/[0.08]" />

            <ul className="space-y-3 text-xs text-zinc-200">
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span className="font-semibold text-white">15 Practice Test Credits / Month</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Shared Bank Access ($0.00 instant delivery)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Personalized Weak-Skill Diagnostics</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Detailed Question Rationales</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Unused Credits Roll Over Every Month</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            {userTier === "pro" ? (
              <button
                disabled
                className="w-full rounded-xl bg-mint/20 border border-mint/40 py-3 text-xs font-bold text-mint cursor-default"
              >
                Current Active Plan
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade("pro")}
                disabled={Boolean(loadingTier)}
                className="w-full rounded-xl bg-mint py-3 text-xs font-bold text-ink-950 transition hover:bg-mint-400 active:scale-[0.99] disabled:opacity-75"
              >
                {loadingTier === "pro" ? "Opening Stripe..." : "Upgrade to Pro"}
              </button>
            )}
          </div>
        </div>

        {/* KLUTCH ELITE / UNLIMITED */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.1] bg-ink-900/40 p-6 backdrop-blur transition hover:border-white/20 sm:p-8">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-white">
                Klutch Elite
              </h3>
              <span className="rounded-full bg-white/[0.1] px-2.5 py-0.5 text-xs font-bold text-zinc-200">
                Unlimited
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              The ultimate testing suite. Endless on-demand practice tests plus complete AP Exam prep.
            </p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold text-white">
                $29
              </span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>

            <div className="my-6 border-t border-white/[0.06]" />

            <ul className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span className="font-semibold text-white">Unlimited Adaptive Practice Tests</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>All 38 AP Course Mock Exams &amp; FRQ Drills</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>Priority AI Test Generation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mint font-bold">✓</span>
                <span>AI Tutor Explanations &amp; Feedback</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            {userTier === "unlimited" ? (
              <button
                disabled
                className="w-full rounded-xl bg-mint/20 border border-mint/40 py-3 text-xs font-bold text-mint cursor-default"
              >
                Current Active Plan
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade("unlimited")}
                disabled={Boolean(loadingTier)}
                className="w-full rounded-xl border border-white/20 bg-white/[0.06] py-3 text-xs font-bold text-white transition hover:border-white/40 hover:bg-white/[0.12] active:scale-[0.99] disabled:opacity-75"
              >
                {loadingTier === "unlimited" ? "Opening Stripe..." : "Upgrade to Elite"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
