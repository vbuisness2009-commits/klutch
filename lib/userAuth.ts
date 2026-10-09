/**
 * Edge-compatible student session token verification.
 * Uses Web Crypto and standard Base64URL encoding so it can safely run
 * inside Next.js Edge Middleware without Node dependencies or "server-only".
 */

export const USER_COOKIE = "klutch_session";
export const SESSION_MS = 90 * 24 * 60 * 60 * 1000;

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
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
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
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, await sign(payload))) return null;
  try {
    const jsonStr = new TextDecoder().decode(fromB64url(payload));
    const data = JSON.parse(jsonStr) as {
      uid?: string;
      exp?: number;
    };
    if (!data.uid || !data.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}
