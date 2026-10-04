/**
 * Practice-exam ("mock") helpers. Pure, so they run in the browser: the mock
 * page gets a small config from the server and fetches the question pool from
 * /api/ap/<slug>/mock only when a student starts.
 */

import type { ApMcq, ApSubjectMeta } from "@/lib/apSchema";

export type MockUnit = { number: number; title: string; weight?: string; available: number };

export type MockConfig = {
  slug: string;
  /** Real exam's MCQ section(s), summed. 0 when the exam has no MCQ. */
  mcqCount: number;
  mcqMinutes: number;
  cutoffs: { score: 5 | 4 | 3 | 2; minPercent: number }[] | null;
  units: MockUnit[];
  available: number;
};

export type MockLength = { key: "short" | "full"; label: string; count: number; minutes: number };

/** Sum of the exam's multiple-choice sections. */
export function mcqSection(meta: ApSubjectMeta): { count: number; minutes: number } {
  const mc = meta.sections.filter((s) => /multiple[\s-]*choice|\bmcq\b/i.test(`${s.questionType} ${s.name}`));
  return {
    count: mc.reduce((n, s) => n + s.count, 0),
    minutes: mc.reduce((n, s) => n + s.minutes, 0),
  };
}

/** The lengths on offer: ~20 questions, and the real section when the pool can fill it. */
export function mockLengths(c: MockConfig): MockLength[] {
  if (!c.mcqCount || !c.available) return [];
  const pace = c.mcqMinutes > 0 ? c.mcqMinutes / c.mcqCount : 1.5;
  const out: MockLength[] = [];
  const short = Math.min(20, c.mcqCount, c.available);
  if (short >= 5) {
    out.push({ key: "short", label: "Short", count: short, minutes: Math.max(5, Math.round(short * pace)) });
  }
  if (c.mcqCount > short && c.available >= c.mcqCount) {
    out.push({
      key: "full",
      label: "Full section",
      count: c.mcqCount,
      minutes: c.mcqMinutes || Math.round(c.mcqCount * pace),
    });
  }
  return out;
}

/** "10–12%" -> 11. Missing or unreadable weights return null. */
export function weightMid(w: string | undefined): number | null {
  if (!w) return null;
  const nums = (w.match(/\d+(\.\d+)?/g) ?? []).map(Number).filter((n) => n > 0);
  if (!nums.length) return null;
  return nums.slice(0, 2).reduce((a, b) => a + b, 0) / Math.min(2, nums.length);
}

/**
 * How many questions to draw from each unit: proportional to the published
 * weightings (largest remainder), capped by what each unit has, with any
 * shortfall handed to units that still have questions. Units without a
 * weight get the average weight.
 */
export function allocate(units: MockUnit[], total: number): Map<number, number> {
  const mids = units.map((u) => weightMid(u.weight));
  const known = mids.filter((m): m is number => m !== null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  const weights = mids.map((m) => m ?? avg);
  const out = new Map<number, number>(units.map((u) => [u.number, 0]));

  let remaining = Math.min(total, units.reduce((n, u) => n + u.available, 0));
  let open = units.map((_, k) => k).filter((k) => units[k].available > 0);

  while (remaining > 0 && open.length) {
    const wsum = open.reduce((n, k) => n + weights[k], 0) || open.length;
    const shares = open.map((k) => ({ k, exact: (remaining * (weights[k] || 1)) / wsum }));
    let given = 0;
    for (const s of shares) {
      const room = units[s.k].available - out.get(units[s.k].number)!;
      const take = Math.min(room, Math.floor(s.exact));
      out.set(units[s.k].number, out.get(units[s.k].number)! + take);
      given += take;
    }
    // Hand out the leftovers by largest fractional part.
    const left = remaining - given;
    const byFrac = shares
      .filter((s) => units[s.k].available > out.get(units[s.k].number)!)
      .sort((a, b) => (b.exact % 1) - (a.exact % 1));
    let extra = 0;
    for (const s of byFrac) {
      if (extra >= left) break;
      out.set(units[s.k].number, out.get(units[s.k].number)! + 1);
      extra++;
    }
    remaining -= given + extra;
    open = open.filter((k) => units[k].available > out.get(units[k].number)!);
    if (given + extra === 0) break;
  }
  return out;
}

export function shuffle<T>(xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type PoolItem = { unit: number; q: ApMcq };

/** Draws the exam: allocate per unit by weight, sample within each unit, shuffle. */
export function buildMock(pool: PoolItem[], units: MockUnit[], count: number): PoolItem[] {
  const live = units.map((u) => ({ ...u, available: pool.filter((p) => p.unit === u.number).length }));
  const plan = allocate(live, count);
  const picked: PoolItem[] = [];
  for (const u of live) {
    const n = plan.get(u.number) ?? 0;
    picked.push(...shuffle(pool.filter((p) => p.unit === u.number)).slice(0, n));
  }
  return shuffle(picked);
}

/** Estimated AP score from an MCQ percentage, or null without cutoffs. */
export function estimateScore(percent: number, cutoffs: MockConfig["cutoffs"]): number | null {
  if (!cutoffs?.length) return null;
  const sorted = cutoffs.slice().sort((a, b) => b.score - a.score);
  for (const c of sorted) if (percent >= c.minPercent) return c.score;
  return 1;
}
