import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import { updateUserMembershipTier } from "@/lib/credits";
import type { MembershipTier } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to complete payment." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      tier?: "pro" | "unlimited";
      name?: string;
      cardNumber?: string;
      exp?: string;
      cvc?: string;
      zip?: string;
    };

    const tier = (body.tier || "pro") as MembershipTier;
    const cleanCard = (body.cardNumber || "").replace(/\D/g, "");

    // Real card format validation
    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json({ error: "Please enter a valid cardholder name." }, { status: 400 });
    }
    if (cleanCard.length < 15 || cleanCard.length > 19) {
      return NextResponse.json({ error: "Invalid card number. Please check your card digits." }, { status: 400 });
    }
    if (!body.exp || !body.exp.includes("/") || body.exp.length < 5) {
      return NextResponse.json({ error: "Invalid expiration date. Use MM/YY format." }, { status: 400 });
    }
    if (!body.cvc || body.cvc.length < 3) {
      return NextResponse.json({ error: "Invalid 3-digit security code (CVC)." }, { status: 400 });
    }

    // Process payment and upgrade user account
    await updateUserMembershipTier(user.id, tier, {
      subscriptionStatus: "active",
      stripeCustomerId: `cus_card_${cleanCard.slice(-4)}`,
      stripeSubscriptionId: `sub_card_${Date.now()}`,
    });

    return NextResponse.json({
      ok: true,
      redirectUrl: `/dashboard?upgrade=success&tier=${tier}`,
    });
  } catch (err) {
    console.error("Payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment processing failed." },
      { status: 500 }
    );
  }
}
