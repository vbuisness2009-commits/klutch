import "server-only";

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TestForm } from "./types";

/**
 * Uploaded tests live as JSON files on disk under content/tests. There is no
 * database yet, and for an admin tool driven by one person this is enough:
 * the files are inspectable, diffable, and trivially backed up.
 */
const DIR = join(process.cwd(), "content", "tests");

export type Availability = {
  /** Playable in the Klutch test player. */
  test: boolean;
  /** Offered as a printable paper. */
  pdf: boolean;
};

export type StoredTest = {
  id: string;
  title: string;
  /** Free-text grouping so the library can be split up, e.g. "Full-length". */
  collection: string;
  /** Where the material came from. Recorded at upload, not inferred. */
  source: string;
  availability: Availability;
  /** False when the upload carried no answer key. */
  scorable: boolean;
  warnings: string[];
  uploadedAt: string;
  form: TestForm;
};

/** Everything except the form body, for listing without parsing megabytes. */
export type TestSummary = Omit<StoredTest, "form"> & {
  sections: { name: string; module1: number; module2: number }[];
  questionCount: number;
};

async function ensureDir() {
  await mkdir(DIR, { recursive: true });
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `test-${Date.now()}`
  );
}

export async function listTests(): Promise<TestSummary[]> {
  await ensureDir();
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
  const out: TestSummary[] = [];

  for (const file of files) {
    try {
      const stored = JSON.parse(
        await readFile(join(DIR, file), "utf8")
      ) as StoredTest;
      const { form, ...rest } = stored;
      out.push({
        ...rest,
        sections: form.sections.map((s) => ({
          name: s.name,
          module1: s.module1.items.length,
          module2: s.module2.upper.items.length,
        })),
        questionCount: form.sections.reduce(
          (n, s) =>
            n + s.module1.items.length + s.module2.upper.items.length,
          0
        ),
      });
    } catch {
      // A malformed file should not take down the whole library view.
    }
  }

  return out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getTest(id: string): Promise<StoredTest | null> {
  await ensureDir();
  try {
    return JSON.parse(
      await readFile(join(DIR, `${id}.json`), "utf8")
    ) as StoredTest;
  } catch {
    return null;
  }
}

export async function saveTest(test: StoredTest): Promise<void> {
  await ensureDir();
  await writeFile(
    join(DIR, `${test.id}.json`),
    JSON.stringify(test, null, 2),
    "utf8"
  );
}

export async function deleteTest(id: string): Promise<boolean> {
  try {
    await unlink(join(DIR, `${id}.json`));
    return true;
  } catch {
    return false;
  }
}

/** Ensures a new upload does not clobber an existing one. */
export async function uniqueId(base: string): Promise<string> {
  let id = base;
  let n = 2;
  while (await getTest(id)) id = `${base}-${n++}`;
  return id;
}
