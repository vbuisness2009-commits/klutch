import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Last successful PDF extract, kept so a hung or interrupted run can resume
 * straight into the crop step without paying for vision again.
 */
const DIR = join(process.cwd(), "content");
const FILE = join(DIR, "last-extract.json");

export type LastExtract = {
  savedAt: string;
  pageCount: number;
  model?: string;
  questions: unknown[];
  failures?: string[];
};

export async function saveLastExtract(data: LastExtract): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(data), "utf8");
}

export async function loadLastExtract(): Promise<LastExtract | null> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as LastExtract;
  } catch {
    return null;
  }
}
