import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { currentUser } from "@/lib/userSession";
import type { AttemptInput } from "@/lib/attempts";
import { listAttempts } from "@/lib/attemptsStore";

export const dynamic = "force-dynamic";

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, max = 200) => String(v ?? "").slice(0, max);

function sanitize(raw: Partial<AttemptInput>): AttemptInput | null {
  if (!raw.formId || !raw.formName) return null;
  return {
    formId: str(raw.formId, 120),
    formName: str(raw.formName),
    scorable: Boolean(raw.scorable),
    total: num(raw.total),
    totalMargin: num(raw.totalMargin),
    sections: (Array.isArray(raw.sections) ? raw.sections : []).slice(0, 6).map((s) => ({
      id: str(s.id, 20),
      name: str(s.name, 60),
      route: str(s.route, 10),
      score: num(s.score),
      correct: num(s.correct) ?? 0,
      total: num(s.total) ?? 0,
    })),
    totals: {
      timeSec: num(raw.totals?.timeSec) ?? 0,
      answered: num(raw.totals?.answered) ?? 0,
      correct: num(raw.totals?.correct) ?? 0,
      incorrect: num(raw.totals?.incorrect) ?? 0,
      blank: num(raw.totals?.blank) ?? 0,
      flagged: num(raw.totals?.flagged) ?? 0,
      excessive: num(raw.totals?.excessive) ?? 0,
    },
    skills: (Array.isArray(raw.skills) ? raw.skills : []).slice(0, 80).map((s) => ({
      sectionId: str(s.sectionId, 20),
      domain: str(s.domain, 80),
      skill: str(s.skill, 120),
      correct: num(s.correct) ?? 0,
      total: num(s.total) ?? 0,
    })),
  };
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save results." }, { status: 401 });
  }

  let attempt: AttemptInput | null = null;
  try {
    attempt = sanitize((await req.json()) as Partial<AttemptInput>);
  } catch {
    /* handled below */
  }
  if (!attempt) {
    return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  }

  await ensureSchema();
  const rows = (await sql()`
    INSERT INTO attempts
      (user_id, form_id, form_name, scorable, total, total_margin, sections, totals, skills)
    VALUES (
      ${user.id}, ${attempt.formId}, ${attempt.formName}, ${attempt.scorable},
      ${attempt.total}, ${attempt.totalMargin},
      ${JSON.stringify(attempt.sections)}::jsonb,
      ${JSON.stringify(attempt.totals)}::jsonb,
      ${JSON.stringify(attempt.skills)}::jsonb
    )
    RETURNING id, created_at
  `) as { id: string; created_at: string }[];

  return NextResponse.json({ id: rows[0]!.id, createdAt: rows[0]!.created_at });
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to see your results." }, { status: 401 });
  }
  return NextResponse.json({ attempts: await listAttempts(user.id) });
}
