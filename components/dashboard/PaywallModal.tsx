"use client";

import { useState } from "react";
import Link from "next/link";

export function PaywallModal({
  isOpen,
  onClose,
  initialTier = "pro",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTier?: "pro" | "unlimited";
}) {
  const [selectedTier, setSelectedTier] = useState<"pro" | "unlimited">(initialTier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (tier: "pro" | "unlimited") => {
    setLoading(true);
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

      // Redirect to Stripe checkout (or simulation)
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.15] bg-ink-950 p-6 shadow-2xl sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 border border-mint/30 px-3 py-1 text-xs font-bold text-mint">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Practice Limit Reached
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Unlock Unlimited SAT Practice
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            Free accounts include 2 full-length practice tests. Upgrade your membership to continue generating fresh adaptive tests with deep score diagnostics.
          </p>
        </div>

        {/* Plan Cards Selection */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Pro Card */}
          <div
            onClick={() => setSelectedTier("pro")}
            className={`cursor-pointer rounded-xl border p-4 transition ${
              selectedTier === "pro"
                ? "border-mint bg-mint/[0.08] shadow-lg shadow-mint/5"
                : "border-white/[0.1] bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-bold text-white">
                Klutch Pro
              </span>
              <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-mint">
                POPULAR
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl font-black text-white">$19</span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
              <li className="flex items-center gap-1.5">
                <span className="text-mint">✓</span> 12 Practice Tests / month
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-mint">✓</span> Shared Test Bank Access
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-mint">✓</span> Weak-Skill Diagnostics
              </li>
            </ul>
          </div>

          {/* Unlimited Card */}
          <div
            onClick={() => setSelectedTier("unlimited")}
            className={`cursor-pointer rounded-xl border p-4 transition ${
              selectedTier === "unlimited"
                ? "border-mint bg-mint/[0.08] shadow-lg shadow-mint/5"
                : "border-white/[0.1] bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-bold text-white">
                Klutch Elite
              </span>
              <span className="rounded-full bg-white/[0.1] px-2 py-0.5 text-[10px] font-bold text-zinc-200">
                MAX VALUE
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl font-black text-white">$29</span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
              <li className="flex items-center gap-1.5">
                <span className="text-mint">✓</span> Unlimited Adaptive Tests
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-mint">✓</span> All SAT &amp; AP Exams
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-mint">✓</span> Priority AI Synthesis
              </li>
            </ul>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-xs font-medium text-rose-400">
            {error}
          </p>
        )}

        {/* CTA Button */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => handleCheckout(selectedTier)}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-mint py-3 text-sm font-bold text-ink-950 transition hover:bg-mint-400 active:scale-[0.99] disabled:opacity-75"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Opening Checkout...</span>
              </>
            ) : (
              <span>Upgrade to {selectedTier === "pro" ? "Pro ($19/mo)" : "Elite ($29/mo)"}</span>
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <Link href="/pricing" onClick={onClose} className="hover:text-white underline">
              View all plan details
            </Link>
            <span>Cancel anytime with 1-click</span>
          </div>
        </div>
      </div>
    </div>
  );
}
