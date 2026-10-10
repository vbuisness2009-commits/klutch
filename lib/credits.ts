import "server-only";

import { ensureSchema, sql, type MembershipTier, type UserRow } from "./db";

export const PLAN_LIMITS: Record<MembershipTier, { monthlyCredits: number; name: string; priceUsd: number }> = {
  free: { monthlyCredits: 2, name: "Free Starter", priceUsd: 0 },
  pro: { monthlyCredits: 12, name: "Klutch Pro", priceUsd: 19 },
  unlimited: { monthlyCredits: 9999, name: "Klutch Elite / Unlimited", priceUsd: 29 },
};

export type UserCreditInfo = {
  tier: MembershipTier;
  balance: number;
  isUnlimited: boolean;
  resetsAt: string;
  subscriptionStatus: string;
  monthlyAllowance: number;
};

/**
 * Returns user's current credit balance, automatically replenishing monthly quota if expired.
 */
export async function getUserCreditInfo(userId: string): Promise<UserCreditInfo> {
  await ensureSchema();

  const rows = (await sql()`
    SELECT membership_tier, credits_balance, credits_reset_at, subscription_status
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `) as Pick<UserRow, "membership_tier" | "credits_balance" | "credits_reset_at" | "subscription_status">[];

  if (!rows[0]) {
    return {
      tier: "free",
      balance: 0,
      isUnlimited: false,
      resetsAt: new Date().toISOString(),
      subscriptionStatus: "none",
      monthlyAllowance: PLAN_LIMITS.free.monthlyCredits,
    };
  }

  const user = rows[0];
  const tier: MembershipTier = user.membership_tier || "free";
  const now = new Date();
  const resetAt = user.credits_reset_at ? new Date(user.credits_reset_at) : now;

  // Monthly replenishment check
  if (now > resetAt) {
    const nextReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newAllowance = PLAN_LIMITS[tier].monthlyCredits;

    await sql()`
      UPDATE users
      SET credits_balance = ${newAllowance},
          credits_reset_at = ${nextReset}
      WHERE id = ${userId}
    `;

    await sql()`
      INSERT INTO credit_transactions (user_id, amount, reason, created_at)
      VALUES (${userId}, ${newAllowance}, 'monthly_allowance_refill', now())
    `;

    return {
      tier,
      balance: newAllowance,
      isUnlimited: tier === "unlimited",
      resetsAt: nextReset,
      subscriptionStatus: user.subscription_status ?? "none",
      monthlyAllowance: newAllowance,
    };
  }

  const isUnlimited = tier === "unlimited";
  return {
    tier,
    balance: user.credits_balance ?? 0,
    isUnlimited,
    resetsAt: resetAt.toISOString(),
    subscriptionStatus: user.subscription_status ?? "none",
    monthlyAllowance: PLAN_LIMITS[tier].monthlyCredits,
  };
}

/**
 * Deduct 1 test credit for generating or allocating a practice test.
 * Returns success: true if allowed, false if user has 0 credits.
 */
export async function deductTestCredit(
  userId: string,
  reason = "generated_test"
): Promise<{
  success: boolean;
  remaining: number;
  isUnlimited: boolean;
  error?: string;
}> {
  await ensureSchema();
  const info = await getUserCreditInfo(userId);

  if (info.isUnlimited) {
    await sql()`
      INSERT INTO credit_transactions (user_id, amount, reason, created_at)
      VALUES (${userId}, 0, ${reason}, now())
    `;
    return { success: true, remaining: 9999, isUnlimited: true };
  }

  if (info.balance <= 0) {
    return {
      success: false,
      remaining: 0,
      isUnlimited: false,
      error: "insufficient_credits",
    };
  }

  const updated = (await sql()`
    UPDATE users
    SET credits_balance = GREATEST(0, credits_balance - 1)
    WHERE id = ${userId} AND credits_balance > 0
    RETURNING credits_balance
  `) as { credits_balance: number }[];

  if (!updated[0]) {
    return {
      success: false,
      remaining: 0,
      isUnlimited: false,
      error: "insufficient_credits",
    };
  }

  const remaining = updated[0].credits_balance;

  await sql()`
    INSERT INTO credit_transactions (user_id, amount, reason, created_at)
    VALUES (${userId}, -1, ${reason}, now())
  `;

  return { success: true, remaining, isUnlimited: false };
}

/**
 * Upgrade or update a user's membership tier and set credits accordingly.
 */
export async function updateUserMembershipTier(
  userId: string,
  tier: MembershipTier,
  options?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
  }
): Promise<void> {
  await ensureSchema();
  const allowance = PLAN_LIMITS[tier].monthlyCredits;
  const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await sql()`
    UPDATE users
    SET membership_tier = ${tier},
        credits_balance = ${allowance},
        credits_reset_at = ${nextReset},
        stripe_customer_id = COALESCE(${options?.stripeCustomerId ?? null}, stripe_customer_id),
        stripe_subscription_id = COALESCE(${options?.stripeSubscriptionId ?? null}, stripe_subscription_id),
        subscription_status = COALESCE(${options?.subscriptionStatus ?? "active"}, subscription_status)
    WHERE id = ${userId}
  `;

  await sql()`
    INSERT INTO credit_transactions (user_id, amount, reason, created_at)
    VALUES (${userId}, ${allowance}, ${`plan_upgrade_to_${tier}`}, now())
  `;
}
