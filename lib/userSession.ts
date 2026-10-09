import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { findUserById, type UserRow } from "./db";

/**
 * Student sessions: an HMAC-signed `{uid, exp}` cookie. Stateless, so signing
 * out on one device doesn't touch the others. Kept separate from the admin
 * cookie so a student account can never be mistaken for the operator.
 */

import {
  USER_COOKIE,
  SESSION_MS,
  signUserSession,
  verifyUserSession,
} from "./userAuth";

export { USER_COOKIE, SESSION_MS, signUserSession, verifyUserSession };

export function isSecureRequest(req: Request): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  return forwarded
    ? forwarded === "https"
    : new URL(req.url).protocol === "https:";
}

export async function setUserSessionCookie(
  res: NextResponse,
  userId: string,
  req: Request
) {
  res.cookies.set(USER_COOKIE, await signUserSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });
}

export function clearUserSessionCookie(res: NextResponse) {
  res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
}

/** The signed-in student for this request, or null. */
export async function currentUser(): Promise<UserRow | null> {
  if (!process.env.DATABASE_URL) return null;
  const uid = await verifyUserSession(cookies().get(USER_COOKIE)?.value);
  if (!uid) return null;
  try {
    return await findUserById(uid);
  } catch {
    return null;
  }
}

/** Only same-site paths, so `?next=` can't bounce users to another domain. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
