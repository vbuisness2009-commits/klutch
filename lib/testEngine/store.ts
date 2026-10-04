import "server-only";

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dbConfigured, ensureSchema, sql } from "@/lib/db";
import type { SectionId, TestForm } from "./types";

/**
 * Practice tests authored in the admin hub. Stored in Postgres (`tests`
 * table) whenever DATABASE_URL is set, which is always true on Vercel. Local
 * dev without a database falls back to JSON files under content/tests.
 */
const DIR = join(process.cwd(), "content", "tests");

export type StoredTest = {
  id: string;
  title: string;
  /** Free-text grouping, e.g. "Full-length tests". */
  collection: string;
  /** Who wrote it / notes. Recorded at upload, never shown to students. */
  source: string;
  /** Visible to students in the library and player. */
  published: boolean;
  /** False while any question is missing an answer key. */
  scorable: boolean;
  warnings: string[];
  uploadedAt: string;
  updatedAt: string;
  form: TestForm;
};

export type TestSummary = Omit<StoredTest, "form"> & {
  sections: { id: SectionId; name: string; module1: number; module2: number; splitModule2: boolean }[];
  questionCount: number;
};

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `test-${Date.now()}`
  );
}

function summarize(t: StoredTest): TestSummary {
  const { form, ...rest } = t;
  const sections = form.sections.map((s) => ({
    id: s.id,
    name: s.name,
    module1: s.module1.items.length,
    module2: s.module2.upper.items.length,
    splitModule2: s.module2.lower.id !== s.module2.upper.id,
  }));
  return {
    ...rest,
    sections,
    questionCount: sections.reduce((n, s) => n + s.module1 + s.module2, 0),
  };
}

/** Older file-store JSON carried `availability: { test, pdf }`. */
function normalizeFile(raw: Record<string, unknown>): StoredTest {
  const r = raw as Partial<StoredTest> & { availability?: { test?: boolean } };
  return {
    id: String(r.id),
    title: String(r.title ?? r.id),
    collection: r.collection ?? "Full-length tests",
    source: r.source ?? "",
    published: r.published ?? r.availability?.test ?? false,
    scorable: Boolean(r.scorable),
    warnings: r.warnings ?? [],
    uploadedAt: r.uploadedAt ?? new Date(0).toISOString(),
    updatedAt: r.updatedAt ?? r.uploadedAt ?? new Date(0).toISOString(),
    form: r.form as TestForm,
  };
}

type Row = {
  id: string;
  title: string;
  collection: string;
  source: string;
  published: boolean;
  scorable: boolean;
  warnings: string[];
  form: TestForm;
  created_at: string | Date;
  updated_at: string | Date;
};

function fromRow(r: Row): StoredTest {
  return {
    id: r.id,
    title: r.title,
    collection: r.collection,
    source: r.source,
    published: r.published,
    scorable: r.scorable,
    warnings: r.warnings ?? [],
    uploadedAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    form: r.form,
  };
}

// ------------------------------------------------------------------ files

async function fileList(): Promise<StoredTest[]> {
  let files: string[];
  try {
    files = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: StoredTest[] = [];
  for (const file of files) {
    try {
      out.push(normalizeFile(JSON.parse(await readFile(join(DIR, file), "utf8"))));
    } catch {
      // A malformed file should not take down the whole library view.
    }
  }
  return out;
}

async function fileGet(id: string): Promise<StoredTest | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    return normalizeFile(JSON.parse(await readFile(join(DIR, `${id}.json`), "utf8")));
  } catch {
    return null;
  }
}

function assertFileWritable() {
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set on this deploy, so tests cannot be saved. Connect the Neon database in Vercel.");
  }
}

// ------------------------------------------------------------------ API

export async function listTests(): Promise<TestSummary[]> {
  let tests: StoredTest[];
  if (dbConfigured()) {
    await ensureSchema();
    tests = ((await sql()`SELECT * FROM tests ORDER BY created_at DESC`) as Row[]).map(fromRow);
  } else {
    tests = await fileList();
  }
  return tests
    .filter((t) => t.form?.sections)
    .map(summarize)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Published tests for student-facing pages. Never throws: an outage shows the empty state. */
export async function listPublishedTests(): Promise<TestSummary[]> {
  try {
    return (await listTests()).filter((t) => t.published);
  } catch (e) {
    console.error("listPublishedTests failed", e);
    return [];
  }
}

export async function getTest(id: string): Promise<StoredTest | null> {
  if (dbConfigured()) {
    await ensureSchema();
    const rows = (await sql()`SELECT * FROM tests WHERE id = ${id} LIMIT 1`) as Row[];
    return rows[0] ? fromRow(rows[0]) : null;
  }
  return fileGet(id);
}

export async function saveTest(test: StoredTest): Promise<void> {
  if (dbConfigured()) {
    await ensureSchema();
    await sql()`
      INSERT INTO tests (id, title, collection, source, published, scorable, warnings, form, created_at, updated_at)
      VALUES (${test.id}, ${test.title}, ${test.collection}, ${test.source}, ${test.published},
              ${test.scorable}, ${JSON.stringify(test.warnings)}::jsonb, ${JSON.stringify(test.form)}::jsonb,
              ${test.uploadedAt}, now())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        collection = EXCLUDED.collection,
        source = EXCLUDED.source,
        published = EXCLUDED.published,
        scorable = EXCLUDED.scorable,
        warnings = EXCLUDED.warnings,
        form = EXCLUDED.form,
        updated_at = now()`;
    return;
  }
  assertFileWritable();
  await mkdir(DIR, { recursive: true });
  await writeFile(
    join(DIR, `${test.id}.json`),
    JSON.stringify({ ...test, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

export async function deleteTest(id: string): Promise<boolean> {
  if (dbConfigured()) {
    await ensureSchema();
    const rows = (await sql()`DELETE FROM tests WHERE id = ${id} RETURNING id`) as { id: string }[];
    return rows.length > 0;
  }
  assertFileWritable();
  if (!/^[a-z0-9-]+$/.test(id)) return false;
  try {
    await unlink(join(DIR, `${id}.json`));
    return true;
  } catch {
    return false;
  }
}

/** Ensures a new upload does not clobber an existing one (or the built-in form). */
export async function uniqueId(base: string): Promise<string> {
  let id = base === "practice-a" ? "practice-a-2" : base;
  let n = 2;
  while (await getTest(id)) id = `${base}-${n++}`;
  return id;
}
