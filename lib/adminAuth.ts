/**
 * Cookie-based admin session. Only ADMIN_EMAIL may log in with ADMIN_PASSWORD.
 * Uses Web Crypto so this module is safe to import from Edge middleware.
 */

export const ADMIN_COOKIE = "klutch_admin";
/** Year-long session so this browser stays trusted after one login. */
const DEVICE_MS = 365 * 24 * 60 * 60 * 1000;
export const ADMIN_COOKIE_MAX_AGE = Math.floor(DEVICE_MS / 1000);

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_SECRET ||
    "dev-only-change-me"
  );
}

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
}

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.length);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/** Constant-time-ish password check against ADMIN_PASSWORD. */
export function checkAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = adminEmail();
  const expectedPass = process.env.ADMIN_PASSWORD || "";
  if (!expectedEmail || !expectedPass) return false;

  const emailOk = email.trim().toLowerCase() === expectedEmail;
  const passOk = timingSafeEqualStr(password, expectedPass);
  return emailOk && passOk;
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

async function hmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payload: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return b64url(sig);
}

export async function signAdminSession(email: string): Promise<string> {
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(8)));
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        email: email.trim().toLowerCase(),
        exp: Date.now() + DEVICE_MS,
        n: nonce,
      })
    )
  );
  const sig = await signPayload(payload);
  return `${payload}.${sig}`;
}

export async function verifyAdminSession(
  token: string | undefined | null
): Promise<{ email: string } | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = await signPayload(payload);
  if (!timingSafeEqualStr(sig, expected)) return null;

  try {
    const data = JSON.parse(
      new TextDecoder().decode(fromB64url(payload))
    ) as { email?: string; exp?: number };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    if (data.email !== adminEmail()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}
