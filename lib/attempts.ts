import type { SessionAnalytics } from "./testEngine/analytics";

/** What a finished test stores on the student's account. */
export type AttemptInput = {
  formId: string;
  formName: string;
  scorable: boolean;
  total: number | null;
  totalMargin: number | null;
  sections: {
    id: string;
    name: string;
    route: string;
    score: number | null;
    correct: number;
    total: number;
  }[];
  totals: SessionAnalytics["totals"];
  skills: {
    sectionId: string;
    domain: string;
    skill: string;
    correct: number;
    total: number;
  }[];
};

export type AttemptRecord = AttemptInput & { id: string; createdAt: string };

export function attemptFromAnalytics(a: SessionAnalytics): AttemptInput {
  const sections = [...new Set(a.items.map((i) => i.sectionId))].map((id) => {
    const rows = a.items.filter((i) => i.sectionId === id && !i.pretest);
    const scored = a.score?.sections.find((s) => s.id === id);
    return {
      id,
      name: rows[0]?.sectionName ?? id,
      route: a.routes[id] ?? "lower",
      score: scored?.score ?? null,
      correct: rows.filter((r) => r.correct === true).length,
      total: rows.length,
    };
  });

  const bySkill = new Map<string, AttemptInput["skills"][number]>();
  for (const i of a.items) {
    if (i.pretest || i.correct === null) continue;
    const key = `${i.sectionId}|${i.skill}`;
    const row = bySkill.get(key) ?? {
      sectionId: i.sectionId,
      domain: i.domain,
      skill: i.skill,
      correct: 0,
      total: 0,
    };
    row.total++;
    if (i.correct) row.correct++;
    bySkill.set(key, row);
  }

  return {
    formId: a.formId,
    formName: a.formName,
    scorable: Boolean(a.score),
    total: a.score?.total ?? null,
    totalMargin: a.score?.totalMargin ?? null,
    sections,
    totals: a.totals,
    skills: [...bySkill.values()],
  };
}

/** Pending attempt kept in the browser until the student signs in. */
export const PENDING_ATTEMPT_KEY = "klutch_pending_attempt";
