import { NextResponse } from "next/server";
import { getTest, saveTest } from "@/lib/testEngine/store";
import { solveFormAnswers } from "@/lib/testEngine/solveForm";
import { SOLVER_MODEL } from "@/lib/testEngine/solvePrompt";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Run a bounded Gemini solve pass on an uploaded test, then save.
 * Call repeatedly until `remaining` is 0 (client loops in ~12-item chunks
 * so browser / tunnel timeouts don't wipe progress).
 *
 * Body: { limit?: number }  default 12
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const existing = await getTest(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let limit = 12;
  try {
    const body = (await request.json()) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0) {
      limit = Math.min(30, Math.floor(body.limit));
    }
  } catch {
    /* empty body is fine */
  }

  const persist = async () => {
    await saveTest({
      ...existing,
      scorable: false,
      form: existing.form,
    });
  };

  const result = await solveFormAnswers(existing.form, undefined, {
    limit,
    onCheckpoint: persist,
  });

  const warnings = [
    ...existing.warnings.filter((w) => !w.startsWith("Gemini solved")),
    ...result.warnings,
  ];
  if (result.stats.solved > 0 || result.stats.needed > 0) {
    warnings.push(
      result.scorable
        ? `Gemini solved keys (${SOLVER_MODEL}) — form is scorable.`
        : `Gemini progress: +${result.stats.solved} this pass; ${result.stats.failed} still open (${SOLVER_MODEL}).`
    );
  }

  await saveTest({
    ...existing,
    scorable: result.scorable,
    warnings,
    form: existing.form,
  });

  return NextResponse.json({
    id: existing.id,
    scorable: result.scorable,
    remaining: result.stats.failed,
    warnings,
    solve: {
      solved: result.stats.solved,
      needed: result.stats.needed,
      failed: result.stats.failed,
      apiCalls: result.stats.apiCalls,
      model: result.stats.model || SOLVER_MODEL,
    },
  });
}
