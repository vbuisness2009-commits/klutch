import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminEmail,
  adminPasswordConfigured,
  checkAdminCredentials,
  signAdminSession,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** Slows password guessing; serverless instances don't share memory for a real limiter. */
const FAILED_LOGIN_DELAY_MS = 1500;

export async function POST(req: Request) {
  if (!adminEmail() || !adminPasswordConfigured()) {
    return NextResponse.json(
      {
        error:
          "ADMIN_EMAIL and ADMIN_PASSWORD are not set on the server.",
      },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = String(body.email || "");
  const password = String(body.password || "");

  if (!checkAdminCredentials(email, password)) {
    await new Promise((r) => setTimeout(r, FAILED_LOGIN_DELAY_MS));
    return NextResponse.json(
      { error: "Wrong email or password." },
      { status: 401 }
    );
  }

  const token = await signAdminSession(email);
  const res = NextResponse.json({ ok: true, email: adminEmail() });
  const forwarded = req.headers.get("x-forwarded-proto");
  const secure =
    forwarded === "https" ||
    (!forwarded && new URL(req.url).protocol === "https:");
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
