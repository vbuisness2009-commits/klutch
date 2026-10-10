import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import { updateUserMembershipTier } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tier = (url.searchParams.get("tier") || "pro") as "pro" | "unlimited";
  const user = await currentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/pricing", req.url));
  }

  // Simulate upgrade in test/dev mode
  await updateUserMembershipTier(user.id, tier, {
    subscriptionStatus: "active",
    stripeCustomerId: "mock_cus_dev",
    stripeSubscriptionId: "mock_sub_dev",
  });

  return NextResponse.redirect(
    new URL(`/dashboard?upgraded=${tier}&mock=true`, req.url)
  );
}
