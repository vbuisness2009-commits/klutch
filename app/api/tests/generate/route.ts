import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import { assignOrGenerateTestForUser, getBankOverviewForUser } from "@/lib/generator/bank";
import { getUserCreditInfo, deductTestCredit } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes

export async function POST() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please log in to generate an adaptive practice test." },
      { status: 401 }
    );
  }

  // 1. Paywall Guard: Verify user has available test credits
  const creditInfo = await getUserCreditInfo(user.id);

  if (!creditInfo.isUnlimited && creditInfo.balance <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_credits",
        message:
          "You've used all of your practice test credits for this billing period. Upgrade to Pro for 15 tests or Unlimited to keep going.",
        upgradeUrl: "/pricing",
      },
      { status: 402 } // Payment Required
    );
  }

  try {
    // 2. Allocate from bank or synthesize brand-new test
    const result = await assignOrGenerateTestForUser(user.id);

    // 3. Deduct 1 credit (taking from bank or generating both cost 1 credit)
    const deduction = await deductTestCredit(user.id, `test_${result.testId}`);

    return NextResponse.json({
      ok: true,
      ...result,
      creditsRemaining: deduction.remaining,
      isUnlimited: deduction.isUnlimited,
    });
  } catch (err) {
    console.error("Test generation error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to allocate or generate test.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({
      totalBankTests: 0,
      userCompletedCount: 0,
      nextAvailableFromBank: false,
      credits: { balance: 0, tier: "free", isUnlimited: false },
    });
  }

  try {
    const [bankStats, creditInfo] = await Promise.all([
      getBankOverviewForUser(user.id),
      getUserCreditInfo(user.id),
    ]);

    return NextResponse.json({
      ...bankStats,
      credits: creditInfo,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not load bank status." },
      { status: 500 }
    );
  }
}
