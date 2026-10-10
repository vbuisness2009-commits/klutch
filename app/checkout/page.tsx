import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/userSession";
import { PLAN_LIMITS } from "@/lib/credits";
import type { MembershipTier } from "@/lib/db";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: { tier?: string };
}) {
  const user = await currentUser();
  const rawTier = searchParams?.tier || "pro";

  if (rawTier !== "pro" && rawTier !== "unlimited") {
    notFound();
  }

  const tier = rawTier as "pro" | "unlimited";

  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/checkout?tier=${tier}`)}`);
  }

  const plan = PLAN_LIMITS[tier];
  const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Pricing
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Order Summary (Left) */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-white/[0.08] bg-ink-900/60 p-6 backdrop-blur sm:p-8">
            <span className="inline-flex items-center gap-1 rounded-full border border-mint/30 bg-mint/15 px-2.5 py-0.5 text-xs font-bold text-mint">
              Order Summary
            </span>

            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white">
              {plan.name}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Recurring monthly membership. Billed automatically every 30 days.
            </p>

            <div className="mt-6 border-t border-white/[0.07] pt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-zinc-300">Monthly Subscription</span>
                <span className="nums font-display text-lg font-bold text-white">
                  ${plan.priceUsd}.00
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-xs text-zinc-400">
                <span>Estimated Sales Tax</span>
                <span className="nums">$0.00</span>
              </div>
            </div>

            <div className="mt-6 border-t border-white/[0.07] pt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-white">Total Due Today</span>
                <span className="nums font-display text-2xl font-black text-mint">
                  ${plan.priceUsd}.00
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Auto-renews at ${plan.priceUsd}.00/month. Cancel anytime with 1 click.
              </p>
            </div>

            {/* Plan Features */}
            <div className="mt-8 border-t border-white/[0.07] pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                What&apos;s Included:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-mint font-bold">✓</span>
                  <span>
                    {tier === "pro"
                      ? "15 Practice Test Credits / Month"
                      : "Unlimited Adaptive Practice Tests"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-mint font-bold">✓</span>
                  <span>Full College Board 98-Question Blueprint</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-mint font-bold">✓</span>
                  <span>Instant Shared Bank Delivery &amp; Deduplication</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-mint font-bold">✓</span>
                  <span>Detailed Score Bands &amp; Question Distributions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Checkout Card Form (Right) */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-white/[0.08] bg-ink-900/60 p-6 backdrop-blur sm:p-8">
            <CheckoutForm
              tier={tier}
              priceUsd={plan.priceUsd}
              planName={plan.name}
              userEmail={user.email}
              isStripeConfigured={isStripeConfigured}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
