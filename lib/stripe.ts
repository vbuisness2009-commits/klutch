import "server-only";

import Stripe from "stripe";
import type { MembershipTier } from "./db";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

export const stripe = STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET, {
      apiVersion: "2026-09-30.endive",
      typescript: true,
    })
  : null;

export const STRIPE_PRICES: Record<Exclude<MembershipTier, "free">, {
  priceId: string | undefined;
  fallbackPriceUsd: number;
  name: string;
}> = {
  pro: {
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    fallbackPriceUsd: 19,
    name: "Klutch Pro (15 Tests/Mo)",
  },
  unlimited: {
    priceId: process.env.STRIPE_PRICE_ID_UNLIMITED,
    fallbackPriceUsd: 29,
    name: "Klutch Elite Unlimited",
  },
};

/**
 * Creates a Stripe Checkout Session for a recurring monthly membership subscription.
 * If STRIPE_SECRET_KEY is not configured yet, falls back to a simulated checkout URL
 * so developers and preview environments can test the flow immediately.
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  tier,
  appUrl,
}: {
  userId: string;
  userEmail: string;
  tier: "pro" | "unlimited";
  appUrl: string;
}): Promise<{ url: string; isMock: boolean }> {
  if (!stripe) {
    // Graceful demo/test mode: simulate successful checkout return
    const mockSuccessUrl = `${appUrl}/api/checkout/simulate?tier=${tier}&uid=${userId}&success=true`;
    return { url: mockSuccessUrl, isMock: true };
  }

  const plan = STRIPE_PRICES[tier];

  // If a price ID was configured in env, use it; otherwise create line_items with price_data
  const lineItems = plan.priceId
    ? [{ price: plan.priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan.name,
              description:
                tier === "pro"
                  ? "15 College Board-calibrated Digital SAT practice tests every month + score analytics."
                  : "Unlimited on-demand adaptive practice tests, AI score diagnostics, and AP exams.",
            },
            unit_amount: plan.fallbackPriceUsd * 100, // in cents
            recurring: { interval: "month" as const },
          },
          quantity: 1,
        },
      ];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
      tier,
    },
    line_items: lineItems,
    success_url: `${appUrl}/dashboard?upgrade=success&tier=${tier}`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: session.url, isMock: false };
}
