import { NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  cleanGoogleClientId,
  googleConfigured,
  googleRedirectUri,
} from "@/lib/googleOAuth";
import { isSecureRequest, safeNext } from "@/lib/userSession";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));

  if (!googleConfigured()) {
    const back = new URL("/login", url);
    back.searchParams.set("error", "google_unavailable");
    return NextResponse.redirect(back);
  }

  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString(
    "base64url"
  );
  const redirectUri = googleRedirectUri(req);
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: cleanGoogleClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(auth);
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}|${next}|${redirectUri}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: 600,
  });
  return res;
}
