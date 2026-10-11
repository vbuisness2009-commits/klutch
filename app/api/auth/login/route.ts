import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConfigured, findUserByEmail, toPublicUser } from "@/lib/db";
import { setUserSessionCookie, isSecureRequest } from "@/lib/userSession";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, isAdminEmail, signAdminSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** Slows password guessing; serverless instances don't share memory for a real limiter. */
const FAILED_LOGIN_DELAY_MS = 1000;

async function fail(message: string, status = 401) {
  await new Promise((r) => setTimeout(r, FAILED_LOGIN_DELAY_MS));
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!dbConfigured()) {
    return NextResponse.json(
      { error: "Accounts aren't set up on this server yet." },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 }
    );
  }

  const user = await findUserByEmail(email);
  if (user && !user.password_hash) {
    return fail("This account uses Google. Use “Continue with Google”.", 400);
  }
  if (!user || !(await bcrypt.compare(password, user.password_hash!))) {
    return fail("Wrong email or password.");
  }

  const isAdm = isAdminEmail(user.email);
  const res = NextResponse.json({
    user: {
      ...toPublicUser(user),
      isAdmin: isAdm,
      membershipTier: isAdm ? "unlimited" : user.membership_tier ?? "free",
      creditsBalance: isAdm ? 99999 : user.credits_balance ?? 2,
    },
  });
  await setUserSessionCookie(res, user.id, req);

  if (isAdm) {
    res.cookies.set(ADMIN_COOKIE, await signAdminSession(user.email), {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(req),
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
  }

  return res;
}
