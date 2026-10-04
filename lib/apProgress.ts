/**
 * Per-student AP progress, kept in localStorage so a student can leave and
 * come back. Browser only; every access is wrapped because storage throws in
 * private windows and when it's full or blocked. Losing progress is fine,
 * crashing the practice view is not.
 */

export type McqRecord = { kind: "mcq"; choice: string; correct: boolean; at: number };
export type FrqRecord = {
  kind: "frq";
  draft: string;
  revealed: boolean;
  /** Self-scored points per rubric row, in rubric order. */
  scores: (number | null)[];
  at: number;
};
export type QuestionRecord = McqRecord | FrqRecord;

/** Keyed by `${unit}/${questionId}` so a stray duplicate id across units can't collide. */
export type SubjectProgress = Record<string, QuestionRecord>;

const PREFIX = "klutch.ap.";

export function qKey(unit: number, id: string): string {
  return `${unit}/${id}`;
}

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: progress just won't persist.
  }
}

export const progressKey = (slug: string) => `${slug}.progress`;
export const knownKey = (slug: string, unit: number) => `${slug}.known.${unit}`;
export const mockKey = (slug: string) => `${slug}.mock`;
