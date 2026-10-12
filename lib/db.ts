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
    // Track tests assigned to or taken by users for bank deduplication
    await db`
      CREATE TABLE IF NOT EXISTS user_test_assignments (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        test_id text NOT NULL,
        status text NOT NULL DEFAULT 'assigned',
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, test_id)
      )`;
    // Membership tiers & credit balances
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier text NOT NULL DEFAULT 'free'`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 2`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none'`;

    // Credit transactions audit ledger
    await db`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount integer NOT NULL,
        reason text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE INDEX IF NOT EXISTS credit_transactions_user_idx
        ON credit_transactions (user_id, created_at DESC)`;

    // Targeted practice question sets bank
    await db`
      CREATE TABLE IF NOT EXISTS targeted_question_sets (
        id text PRIMARY KEY,
        section text NOT NULL,
        domain text NOT NULL,
        topic text NOT NULL,
        skill text NOT NULL,
        questions jsonb NOT NULL,
        easy_count integer NOT NULL DEFAULT 10,
        medium_count integer NOT NULL DEFAULT 10,
        hard_count integer NOT NULL DEFAULT 10,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE INDEX IF NOT EXISTS targeted_sets_section_idx
        ON targeted_question_sets (section, topic)`;

    // Targeted practice student attempts ledger
    await db`
      CREATE TABLE IF NOT EXISTS targeted_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        set_id text,
        section text NOT NULL,
        domain text NOT NULL,
        topic text NOT NULL,
        total_questions integer NOT NULL DEFAULT 30,
        answered_count integer NOT NULL DEFAULT 0,
        correct_count integer NOT NULL DEFAULT 0,
        easy_correct integer NOT NULL DEFAULT 0,
        medium_correct integer NOT NULL DEFAULT 0,
        hard_correct integer NOT NULL DEFAULT 0,
        score_percent integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE INDEX IF NOT EXISTS targeted_attempts_user_idx
        ON targeted_attempts (user_id, created_at DESC)`;
  })().catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

export type MembershipTier = "free" | "pro" | "unlimited";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  google_sub: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
  membership_tier: MembershipTier;
  credits_balance: number;
  credits_reset_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  membershipTier: MembershipTier;
  creditsBalance: number;
  creditsResetAt: string;
  subscriptionStatus: string;
};

export function toPublicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatar_url,
    hasPassword: Boolean(u.password_hash),
    hasGoogle: Boolean(u.google_sub),
    membershipTier: u.membership_tier ?? "free",
    creditsBalance: u.credits_balance ?? 2,
    creditsResetAt: u.credits_reset_at ? new Date(u.credits_reset_at).toISOString() : new Date().toISOString(),
    subscriptionStatus: u.subscription_status ?? "none",
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
