import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  dbConfigured,
  ensureSchema,
  findUserByEmail,
  sql,
  toPublicUser,
  type UserRow,
} from "@/lib/db";
import { setUserSessionCookie } from "@/lib/userSession";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!dbConfigured()) {
    return NextResponse.json(
      { error: "Accounts aren't set up on this server yet." },
      { status: 503 }
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 60);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) {
    return NextResponse.json({ error: "Enter your first name." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Use at least 8 characters for your password." },
      { status: 400 }
    );
  }
  if (password.length > 200) {
    return NextResponse.json({ error: "That password is too long." }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      {
        error: existing.password_hash
          ? "An account with that email already exists. Log in instead."
          : "That email is linked to Google. Use “Continue with Google”.",
      },
      { status: 409 }
    );
  }

  await ensureSchema();
  const hash = await bcrypt.hash(password, 10);
  let user: UserRow | undefined;
  try {
    const rows = (await sql()`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, ${name}, ${hash})
      RETURNING *
    `) as UserRow[];
    user = rows[0];
  } catch {
    // Unique violation from a concurrent signup with the same email.
    return NextResponse.json(
      { error: "An account with that email already exists. Log in instead." },
      { status: 409 }
    );
  }

  const res = NextResponse.json({ user: toPublicUser(user!) });
  await setUserSessionCookie(res, user!.id, req);
  return res;
}
