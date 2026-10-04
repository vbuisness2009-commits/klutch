import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { toPublicUser } from "@/lib/db";
import { currentUser } from "@/lib/userSession";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [user, admin] = await Promise.all([
    currentUser(),
    verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value),
  ]);
  return NextResponse.json(
    {
      user: user ? toPublicUser(user) : null,
      isAdmin: Boolean(admin),
      googleEnabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
