import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Accounts, saved attempts, and authored practice tests live in Postgres
 * (Neon, provisioned through Vercel). Without DATABASE_URL (local dev) the
 * test library falls back to JSON files under content/tests.
 */

let client: NeonQueryFunction<false, false> | null = null;

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function sql(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set, so accounts are unavailable.");
  }
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent; runs once per server instance before the first query. */
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        name text NOT NULL DEFAULT '',
        password_hash text,
        google_sub text UNIQUE,
        avatar_url text,
        email_verified boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE TABLE IF NOT EXISTS attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        form_id text NOT NULL,
        form_name text NOT NULL,
        scorable boolean NOT NULL,
        total integer,
        total_margin integer,
        sections jsonb NOT NULL DEFAULT '[]'::jsonb,
        totals jsonb NOT NULL DEFAULT '{}'::jsonb,
        skills jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE INDEX IF NOT EXISTS attempts_user_created
        ON attempts (user_id, created_at DESC)`;
    // Practice tests authored and uploaded from the admin hub.
    await db`
      CREATE TABLE IF NOT EXISTS tests (
        id text PRIMARY KEY,
        title text NOT NULL,
        collection text NOT NULL DEFAULT 'Full-length tests',
        source text NOT NULL DEFAULT '',
        published boolean NOT NULL DEFAULT false,
        scorable boolean NOT NULL DEFAULT false,
        warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
        form jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE INDEX IF NOT EXISTS tests_published_created
        ON tests (published, created_at DESC)`;
  })().catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  google_sub: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
};

export function toPublicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatar_url,
    hasPassword: Boolean(u.password_hash),
    hasGoogle: Boolean(u.google_sub),
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT * FROM users WHERE email = ${email.trim().toLowerCase()} LIMIT 1
  `) as UserRow[];
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `) as UserRow[];
  return rows[0] ?? null;
}
