import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import { createCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please log in to select a membership plan." },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as { tier?: "pro" | "unlimited" };
    const tier = body.tier;

    if (tier !== "pro" && tier !== "unlimited") {
      return NextResponse.json(
        { error: "Invalid membership plan selected." },
        { status: 400 }
      );
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const appUrl = `${proto}://${host}`;

    const { url, isMock } = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      tier,
      appUrl,
    });

    return NextResponse.json({ ok: true, url, isMock });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not create checkout session.",
      },
      { status: 500 }
    );
  }
}
