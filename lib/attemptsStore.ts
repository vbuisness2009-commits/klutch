import "server-only";

import { ensureSchema, sql } from "./db";
import type { AttemptInput, AttemptRecord } from "./attempts";

export async function listAttempts(userId: string): Promise<AttemptRecord[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT * FROM attempts WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 100
  `) as {
    id: string;
    form_id: string;
    form_name: string;
    scorable: boolean;
    total: number | null;
    total_margin: number | null;
    sections: AttemptInput["sections"];
    totals: AttemptInput["totals"];
    skills: AttemptInput["skills"];
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    formId: r.form_id,
    formName: r.form_name,
    scorable: r.scorable,
    total: r.total,
    totalMargin: r.total_margin,
    sections: r.sections,
    totals: r.totals,
    skills: r.skills,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}
