import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  dbConfigured,
  ensureSchema,
  sql,
  type UserRow,
} from "@/lib/db";
import {
  GOOGLE_STATE_COOKIE,
  exchangeGoogleCode,
  googleConfigured,
  googleRedirectUri,
  publicOrigin,
} from "@/lib/googleOAuth";
import {
  isSecureRequest,
  safeNext,
  setUserSessionCookie,
} from "@/lib/userSession";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminEmail,
  signAdminSession,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function toLogin(req: Request, error: string, detail?: string) {
  const back = new URL("/login", publicOrigin(req));
  back.searchParams.set("error", error);
  if (detail) {
    back.searchParams.set("detail", detail.slice(0, 120));
  }
  const res = NextResponse.redirect(back);
  res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!googleConfigured() || !dbConfigured()) return toLogin(req, "google_unavailable");
  if (url.searchParams.get("error")) return toLogin(req, "google_cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const [expectedState, rawNext, storedRedirectUri] = (
    cookies().get(GOOGLE_STATE_COOKIE)?.value ?? ""
  ).split("|");
  if (!code || !state || !expectedState || state !== expectedState) {
    return toLogin(req, "google_state");
  }

  const redirectUri = storedRedirectUri || googleRedirectUri(req);
  let profile;
  try {
    profile = await exchangeGoogleCode(code, redirectUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Google token exchange error:", msg);
    return toLogin(req, "google_failed", msg);
  }
  if (!profile.email_verified) return toLogin(req, "google_unverified");

  await ensureSchema();
  const db = sql();
  const name = (profile.given_name || profile.name || "").slice(0, 60);

  let user = (
    (await db`SELECT * FROM users WHERE google_sub = ${profile.sub} LIMIT 1`) as UserRow[]
  )[0];

  if (!user) {
    const byEmail = (
      (await db`SELECT * FROM users WHERE email = ${profile.email} LIMIT 1`) as UserRow[]
    )[0];
    if (byEmail) {
      // Google just proved ownership of this email. Password accounts are never
      // email-verified, so drop any password someone else could have set on it.
      user = (
        (await db`
          UPDATE users SET
            google_sub = ${profile.sub},
            avatar_url = COALESCE(avatar_url, ${profile.picture ?? null}),
            name = CASE WHEN name = '' THEN ${name} ELSE name END,
            password_hash = CASE WHEN email_verified THEN password_hash ELSE NULL END,
            email_verified = true
          WHERE id = ${byEmail.id}
          RETURNING *`) as UserRow[]
      )[0];
    } else {
      user = (
        (await db`
          INSERT INTO users (email, name, google_sub, avatar_url, email_verified)
          VALUES (${profile.email}, ${name}, ${profile.sub}, ${profile.picture ?? null}, true)
          RETURNING *`) as UserRow[]
      )[0];
    }
  }

  const res = NextResponse.redirect(new URL(safeNext(rawNext), publicOrigin(req)));
  res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  await setUserSessionCookie(res, user!.id, req);

  // A Google-verified login with the operator's email also opens the admin hub.
  if (adminEmail() && profile.email === adminEmail()) {
    res.cookies.set(ADMIN_COOKIE, await signAdminSession(profile.email), {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(req),
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
  }
  return res;
}
