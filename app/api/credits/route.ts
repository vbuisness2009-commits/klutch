import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import { getUserCreditInfo, PLAN_LIMITS } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({
      loggedIn: false,
      tier: "free",
      balance: 0,
      isUnlimited: false,
      monthlyAllowance: PLAN_LIMITS.free.monthlyCredits,
      resetsAt: new Date().toISOString(),
    });
  }

  const info = await getUserCreditInfo(user.id);
  return NextResponse.json({
    loggedIn: true,
    ...info,
  });
}
