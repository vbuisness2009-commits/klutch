import "server-only";

import { ensureSchema, sql, dbConfigured } from "@/lib/db";

export type TargetedQuestionItem = {
  id: string;
  number: number;
  difficulty: "E" | "M" | "H";
  stem: string;
  stimulus?: string;
  format: "mc" | "spr";
  choices?: { id: "A" | "B" | "C" | "D"; text: string }[];
  correct: string;
  accepted?: string[];
  rationale: string;
  desmosHint?: string;
};

export type TargetedQuestionSet = {
  id: string;
  section: "math" | "rw";
  domain: string;
  topic: string;
  skill: string;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  totalQuestions: number;
  questions: TargetedQuestionItem[];
  createdAt: string;
  updatedAt: string;
};

export function slugifyTopic(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "custom-topic"
  );
}

type Row = {
  id: string;
  section: string;
  domain: string;
  topic: string;
  skill: string;
  questions: TargetedQuestionItem[] | string;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  created_at: string | Date;
  updated_at: string | Date;
};

function fromRow(r: Row): TargetedQuestionSet {
  let questions: TargetedQuestionItem[] = [];
  if (typeof r.questions === "string") {
    try {
      questions = JSON.parse(r.questions);
    } catch {
      questions = [];
    }
  } else if (Array.isArray(r.questions)) {
    questions = r.questions;
  }

  return {
    id: r.id,
    section: r.section as "math" | "rw",
    domain: r.domain,
    topic: r.topic,
    skill: r.skill,
    easyCount: r.easy_count ?? 10,
    mediumCount: r.medium_count ?? 10,
    hardCount: r.hard_count ?? 10,
    totalQuestions: questions.length,
    questions,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

/**
 * Check if a question set for this topic exists in the bank.
 */
export async function getTargetedSetFromBank(
  id: string
): Promise<TargetedQuestionSet | null> {
  if (!dbConfigured()) return null;

  try {
    await ensureSchema();
    const rows = (await sql()`
      SELECT * FROM targeted_question_sets
      WHERE id = ${id}
      LIMIT 1
    `) as Row[];

    if (rows[0]) return fromRow(rows[0]);
  } catch (err) {
    console.error("Error fetching targeted question set from bank:", err);
  }
  return null;
}

/**
 * Save a newly synthesized targeted question set into the bank.
 */
export async function saveTargetedSetToBank(
  set: TargetedQuestionSet
): Promise<void> {
  if (!dbConfigured()) return;

  try {
    await ensureSchema();
    await sql()`
      INSERT INTO targeted_question_sets
        (id, section, domain, topic, skill, questions, easy_count, medium_count, hard_count, created_at, updated_at)
      VALUES (
        ${set.id}, ${set.section}, ${set.domain}, ${set.topic}, ${set.skill},
        ${JSON.stringify(set.questions)}::jsonb,
        ${set.easyCount}, ${set.mediumCount}, ${set.hardCount},
        ${set.createdAt}, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        questions = EXCLUDED.questions,
        easy_count = EXCLUDED.easy_count,
        medium_count = EXCLUDED.medium_count,
        hard_count = EXCLUDED.hard_count,
        updated_at = now()
    `;
  } catch (err) {
    console.error("Error saving targeted question set to bank:", err);
  }
}

/**
 * List all sets currently in the bank.
 */
export async function listTargetedSetsFromBank(
  section?: "math" | "rw"
): Promise<Omit<TargetedQuestionSet, "questions">[]> {
  if (!dbConfigured()) return [];

  try {
    await ensureSchema();
    const rows = (section
      ? await sql()`
          SELECT id, section, domain, topic, skill, easy_count, medium_count, hard_count, created_at, updated_at
          FROM targeted_question_sets
          WHERE section = ${section}
          ORDER BY updated_at DESC
        `
      : await sql()`
          SELECT id, section, domain, topic, skill, easy_count, medium_count, hard_count, created_at, updated_at
          FROM targeted_question_sets
          ORDER BY updated_at DESC
        `) as (Omit<Row, "questions"> & { total_questions?: number })[];

    return rows.map((r) => ({
      id: r.id,
      section: r.section as "math" | "rw",
      domain: r.domain,
      topic: r.topic,
      skill: r.skill,
      easyCount: r.easy_count,
      mediumCount: r.medium_count,
      hardCount: r.hard_count,
      totalQuestions: (r.easy_count || 10) + (r.medium_count || 10) + (r.hard_count || 10),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  } catch (err) {
    console.error("Error listing targeted sets:", err);
    return [];
  }
}
