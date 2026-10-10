"use client";

import { useState } from "react";
import { PaywallModal } from "./PaywallModal";

export function CreditsBadge({
  tier = "free",
  balance = 0,
  isUnlimited = false,
}: {
  tier?: "free" | "pro" | "unlimited";
  balance?: number;
  isUnlimited?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isUnlimited ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/15 px-3 py-1 text-xs font-semibold text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            <span>Klutch Elite · Unlimited Tests</span>
          </div>
        ) : (
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              balance > 0
                ? "border-mint/30 bg-mint/10 text-mint"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
          >
            <span>
              {balance > 0 ? (
                <>⚡ {balance} test {balance === 1 ? "credit" : "credits"} remaining</>
              ) : (
                <>⚠️ 0 test credits remaining</>
              )}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="capitalize text-zinc-300">
              {tier === "pro" ? "Pro Plan" : "Free Starter"}
            </span>
          </div>
        )}

        {/* Upgrade / Manage Button */}
        {tier !== "unlimited" && (
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white transition hover:border-white/40 hover:bg-white/[0.08]"
          >
            {balance <= 0 ? "Upgrade Now" : "Change Plan"}
          </button>
        )}
      </div>

      <PaywallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
