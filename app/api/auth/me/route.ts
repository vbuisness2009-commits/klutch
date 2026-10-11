import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { toPublicUser } from "@/lib/db";
import { currentUser } from "@/lib/userSession";
import { ADMIN_COOKIE, isAdminEmail, verifyAdminSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [user, admin] = await Promise.all([
    currentUser(),
    verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value),
  ]);
  const isAdm = Boolean(admin) || (user?.email ? isAdminEmail(user.email) : false);
  return NextResponse.json(
    {
      user: user
        ? {
            ...toPublicUser(user),
            isAdmin: isAdm,
            membershipTier: isAdm ? "unlimited" : user.membership_tier ?? "free",
            creditsBalance: isAdm ? 99999 : user.credits_balance ?? 2,
          }
        : null,
      isAdmin: isAdm,
      googleEnabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
