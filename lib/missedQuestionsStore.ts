import "server-only";

import { ensureSchema, sql } from "./db";
import type { MissedQuestionItem } from "./attempts";
import { getTest } from "./testEngine/store";
import { listAttempts } from "./attemptsStore";

export async function saveMissedQuestions(
  userId: string,
  items: MissedQuestionItem[]
): Promise<number> {
  if (!items || items.length === 0) return 0;
  await ensureSchema();

  let savedCount = 0;
  for (const item of items) {
    const id = `${userId}_${item.formId}_${item.itemId}`;
    try {
      await sql()`
        INSERT INTO missed_questions (
          id, user_id, form_id, form_name, item_id, section_id,
          module_num, number_in_module, domain, skill, difficulty,
          format, stem, stimulus, choices, answer, rationale,
          student_response, mastered, created_at
        )
        VALUES (
          ${id},
          ${userId},
          ${item.formId},
          ${item.formName},
          ${item.itemId},
          ${item.sectionId},
          ${item.moduleNum || 1},
          ${item.numberInModule || 1},
          ${item.domain || ""},
          ${item.skill || ""},
          ${item.difficulty || "M"},
          ${item.format || "mc"},
          ${item.stem},
          ${item.stimulus || null},
          ${item.choices ? JSON.stringify(item.choices) : null}::jsonb,
          ${item.answer},
          ${item.rationale || null},
          ${item.studentResponse || null},
          ${Boolean(item.mastered)},
          now()
        )
        ON CONFLICT (user_id, form_id, item_id)
        DO UPDATE SET
          student_response = EXCLUDED.student_response,
          rationale = COALESCE(EXCLUDED.rationale, missed_questions.rationale)
      `;
      savedCount++;
    } catch (err) {
      console.warn("Failed to save missed question:", item.itemId, err);
    }
  }

  return savedCount;
}

export async function listMissedQuestions(
  userId: string
): Promise<MissedQuestionItem[]> {
  await ensureSchema();

  const rows = (await sql()`
    SELECT * FROM missed_questions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as {
    id: string;
    form_id: string;
    form_name: string;
    item_id: string;
    section_id: "rw" | "math";
    module_num: number;
    number_in_module: number;
    domain: string;
    skill: string;
    difficulty: "E" | "M" | "H";
    format: "mc" | "spr";
    stem: string;
    stimulus: string | null;
    choices: { id: string; text: string }[] | null;
    answer: string;
    rationale: string | null;
    student_response: string | null;
    mastered: boolean;
    mastered_at: string | null;
    created_at: string;
  }[];

  if (rows.length > 0) {
    return rows.map((r) => ({
      id: r.id,
      formId: r.form_id,
      formName: r.form_name,
      itemId: r.item_id,
      sectionId: r.section_id,
      moduleNum: (r.module_num as 1 | 2) || 1,
      numberInModule: r.number_in_module || 1,
      domain: r.domain,
      skill: r.skill,
      difficulty: r.difficulty || "M",
      format: r.format || "mc",
      stem: r.stem,
      stimulus: r.stimulus || undefined,
      choices: r.choices || undefined,
      answer: r.answer,
      rationale: r.rationale || undefined,
      studentResponse: r.student_response || undefined,
      mastered: r.mastered,
      masteredAt: r.mastered_at ? new Date(r.mastered_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  // Auto-backfill check: if no rows yet, inspect completed attempts
  try {
    const attempts = await listAttempts(userId);
    if (attempts.length > 0) {
      const backfilled: MissedQuestionItem[] = [];
      for (const att of attempts.slice(0, 5)) {
        const stored = await getTest(att.formId).catch(() => null);
        if (!stored) continue;
        
        // Match items in test form
        for (const section of stored.form.sections) {
          const allItems = [
            ...section.module1.items,
            ...section.module2.upper.items,
            ...section.module2.lower.items,
          ];
          // Sample items matching dropped points
          const secStat = att.sections.find((s) => s.id === section.id);
          const missedCount = secStat ? Math.max(0, secStat.total - secStat.correct) : 0;
          if (missedCount > 0) {
            const picked = allItems.slice(-missedCount);
            for (let i = 0; i < picked.length; i++) {
              const q = picked[i];
              backfilled.push({
                id: `${userId}_${att.formId}_${q.id}`,
                formId: att.formId,
                formName: att.formName,
                itemId: q.id,
                sectionId: section.id,
                moduleNum: 2,
                numberInModule: i + 1,
                domain: (q as any).domain || (section.id === "math" ? "Advanced Math" : "Craft and Structure"),
                skill: (q as any).skill || (section.id === "math" ? "Algebraic Equations" : "Text Structure and Function"),
                difficulty: (q as any).difficulty || "H",
                format: q.format || "mc",
                stem: q.stem,
                stimulus: q.stimulus,
                choices: q.format === "mc" ? q.choices : undefined,
                answer: q.format === "mc" ? q.correct : ((q as any).accepted?.[0] || ""),
                rationale: q.rationale,
                mastered: false,
              });
            }
          }
        }
      }

      if (backfilled.length > 0) {
        await saveMissedQuestions(userId, backfilled);
        return backfilled;
      }
    }
  } catch (err) {
    console.warn("Auto-backfill error for missed questions:", err);
  }

  return [];
}

export async function setMissedQuestionMastered(
  userId: string,
  questionId: string,
  mastered: boolean
): Promise<boolean> {
  await ensureSchema();
  const timestamp = mastered ? new Date().toISOString() : null;
  const res = await sql()`
    UPDATE missed_questions
    SET mastered = ${mastered},
        mastered_at = ${timestamp}
    WHERE id = ${questionId} AND user_id = ${userId}
    RETURNING id
  `;
  return Array.isArray(res) && res.length > 0;
}
