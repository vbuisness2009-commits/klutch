import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import { assignOrGenerateTestForUser, getBankOverviewForUser } from "@/lib/generator/bank";

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

  try {
    const result = await assignOrGenerateTestForUser(user.id);
    return NextResponse.json({
      ok: true,
      ...result,
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
    });
  }

  try {
    const stats = await getBankOverviewForUser(user.id);
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not load bank status." },
      { status: 500 }
    );
  }
}
