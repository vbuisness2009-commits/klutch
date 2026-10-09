import "server-only";

export const GOOGLE_STATE_COOKIE = "klutch_g_state";

export function cleanGoogleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

export function cleanGoogleClientSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

export function googleConfigured(): boolean {
  return Boolean(cleanGoogleClientId() && cleanGoogleClientSecret());
}

/**
 * Public origin of this request. Must match a redirect URI registered in
 * Google Cloud exactly, so APP_URL can pin it when proxies rewrite the host.
 */
export function publicOrigin(req: Request): string {
  const envAppUrl = (process.env.APP_URL || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
  if (envAppUrl) return envAppUrl;

  const url = new URL(req.url);
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  let proto =
    req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  if (host.includes(".vercel.app") || !host.includes("localhost")) {
    proto = "https";
  }
  return `${proto}://${host}`;
}

export function googleRedirectUri(req: Request): string {
  return `${publicOrigin(req)}/api/auth/google/callback`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
};

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cleanGoogleClientId(),
      client_secret: cleanGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !token.access_token) {
    const detail =
      token.error_description || token.error || `HTTP ${tokenRes.status}`;
    throw new Error(`Google token exchange failed: ${detail}`);
  }

  // Fetched server-to-server over TLS with our own access token, so the
  // profile is authentic without verifying the id_token signature ourselves.
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  const info = (await infoRes.json()) as Partial<GoogleProfile>;
  if (!infoRes.ok || !info.sub || !info.email) {
    throw new Error("Google didn't return a profile.");
  }
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    email_verified: info.email_verified === true,
    name: info.name,
    given_name: info.given_name,
    picture: info.picture,
  };
}
