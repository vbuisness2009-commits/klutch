import { NextResponse } from "next/server";
import { clearUserSessionCookie } from "@/lib/userSession";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearUserSessionCookie(res);
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
