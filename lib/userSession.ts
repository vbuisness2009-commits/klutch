import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { findUserById, type UserRow } from "./db";

/**
 * Student sessions: an HMAC-signed `{uid, exp}` cookie. Stateless, so signing
 * out on one device doesn't touch the others. Kept separate from the admin
 * cookie so a student account can never be mistaken for the operator.
 */

export const USER_COOKIE = "klutch_session";
const SESSION_MS = 90 * 24 * 60 * 60 * 1000;

function secret(): string {
  const base =
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-only-change-me";
  // Domain-separate from admin tokens that may share the same base secret.
  return `user-session:${base}`;
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Buffer.from(u8).toString("base64url");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return b64url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function signUserSession(userId: string): Promise<string> {
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ uid: userId, exp: Date.now() + SESSION_MS })
    )
  );
  return `${payload}.${await sign(payload)}`;
}

export async function verifyUserSession(
  token: string | undefined | null
): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, await sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
      exp?: number;
    };
    if (!data.uid || !data.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

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
