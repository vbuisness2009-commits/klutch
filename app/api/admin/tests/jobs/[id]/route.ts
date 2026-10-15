import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import {
  discoverPdfStructure,
  extractReadingWritingQuestions,
  extractMathQuestions,
  extractAnswerKeyTable,
  extractGeneralQuestions,
  finalizePdfTest,
  type ExtractedQuestion,
  type AnswerKeyEntry,
} from "@/lib/pdf/extractPdfTest";
import {
  saveTest,
  slugify,
  uniqueId,
  type StoredTest,
} from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JobRow = {
  id: string;
  title: string;
  collection: string;
  source: string;
  published: boolean;
  has_key: boolean;
  status: string;
  step_data: {
    structure?: {
      detectedTitle?: string;
      hasReadingWriting: boolean;
      hasMath: boolean;
      hasAnswerKey: boolean;
      isStandardSat: boolean;
      estimatedQuestions?: number;
    };
    rwQuestions?: ExtractedQuestion[];
    mathQuestions?: ExtractedQuestion[];
    generalQuestions?: ExtractedQuestion[];
    answerKeys?: AnswerKeyEntry[];
  };
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const jobId = params.id;
    const rows = (await sql()`
      SELECT * FROM test_import_jobs WHERE id = ${jobId}
    `) as JobRow[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Import job not found or expired." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, job: rows[0] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load job." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const jobId = params.id;

    const body = (await req.json().catch(() => ({}))) as {
      step?: "discover" | "rw" | "math" | "keys" | "general" | "finalize";
    };
    const step = body.step;

    if (!step) {
      return NextResponse.json({ error: "Missing step parameter." }, { status: 400 });
    }

    // Fetch Job state
    const jobRows = (await sql()`
      SELECT * FROM test_import_jobs WHERE id = ${jobId}
    `) as JobRow[];

    if (jobRows.length === 0) {
      return NextResponse.json(
        { error: "Import job not found or expired. Please upload the PDF again." },
        { status: 404 }
      );
    }

    const job = jobRows[0];
    const stepData = job.step_data || {};

    // For PDF processing steps, load the file buffer from chunks
    let fileBuffer: Buffer | null = null;
    if (step !== "finalize") {
      const chunkRows = (await sql()`
        SELECT data FROM upload_chunks WHERE id = ${jobId} ORDER BY chunk_index ASC
      `) as { data: string }[];

      if (chunkRows.length === 0) {
        return NextResponse.json(
          { error: "Uploaded PDF chunks not found or expired. Please upload again." },
          { status: 400 }
        );
      }

      fileBuffer = Buffer.concat(chunkRows.map((r) => Buffer.from(r.data, "base64")));
    }

    // Process specific step
    switch (step) {
      case "discover": {
        if (!fileBuffer) throw new Error("No file buffer available.");
        const structure = await discoverPdfStructure(fileBuffer);
        stepData.structure = structure;

        await sql()`
          UPDATE test_import_jobs
          SET step_data = ${JSON.stringify(stepData)}::jsonb, updated_at = NOW()
          WHERE id = ${jobId}
        `;

        return NextResponse.json({
          ok: true,
          step: "discover",
          structure,
        });
      }

      case "rw": {
        if (!fileBuffer) throw new Error("No file buffer available.");
        const rwQuestions = await extractReadingWritingQuestions(fileBuffer);
        stepData.rwQuestions = rwQuestions;

        await sql()`
          UPDATE test_import_jobs
          SET step_data = ${JSON.stringify(stepData)}::jsonb, updated_at = NOW()
          WHERE id = ${jobId}
        `;

        return NextResponse.json({
          ok: true,
          step: "rw",
          count: rwQuestions.length,
        });
      }

      case "math": {
        if (!fileBuffer) throw new Error("No file buffer available.");
        const mathQuestions = await extractMathQuestions(fileBuffer);
        stepData.mathQuestions = mathQuestions;

        await sql()`
          UPDATE test_import_jobs
          SET step_data = ${JSON.stringify(stepData)}::jsonb, updated_at = NOW()
          WHERE id = ${jobId}
        `;

        return NextResponse.json({
          ok: true,
          step: "math",
          count: mathQuestions.length,
        });
      }

      case "keys": {
        if (!fileBuffer) throw new Error("No file buffer available.");
        const answerKeys = await extractAnswerKeyTable(fileBuffer);
        stepData.answerKeys = answerKeys;

        await sql()`
          UPDATE test_import_jobs
          SET step_data = ${JSON.stringify(stepData)}::jsonb, updated_at = NOW()
          WHERE id = ${jobId}
        `;

        return NextResponse.json({
          ok: true,
          step: "keys",
          count: answerKeys.length,
        });
      }

      case "general": {
        if (!fileBuffer) throw new Error("No file buffer available.");
        const general = await extractGeneralQuestions(fileBuffer, job.has_key);
        stepData.generalQuestions = general.questions;
        if (general.answerKeyTable && general.answerKeyTable.length > 0) {
          stepData.answerKeys = general.answerKeyTable;
        }

        await sql()`
          UPDATE test_import_jobs
          SET step_data = ${JSON.stringify(stepData)}::jsonb, updated_at = NOW()
          WHERE id = ${jobId}
        `;

        return NextResponse.json({
          ok: true,
          step: "general",
          count: general.questions.length,
        });
      }

      case "finalize": {
        const allQuestions: ExtractedQuestion[] = [
          ...(stepData.rwQuestions || []),
          ...(stepData.mathQuestions || []),
          ...(stepData.generalQuestions || []),
        ];

        if (allQuestions.length === 0) {
          return NextResponse.json(
            { error: "No questions were extracted. Please retry the extraction steps." },
            { status: 422 }
          );
        }

        const answerKeys = stepData.answerKeys || [];
        const testId = await uniqueId(slugify(job.title));
        const now = new Date().toISOString();

        const extractResult = await finalizePdfTest({
          id: testId,
          title: job.title,
          collection: job.collection,
          source: job.source,
          questions: allQuestions,
          answerKeyTable: answerKeys,
          hasKey: job.has_key,
        });

        const stored: StoredTest = {
          id: testId,
          title: job.title,
          collection: job.collection || "Full-length tests",
          source: job.source || "",
          published: Boolean(job.published),
          scorable: extractResult.scorable,
          warnings: extractResult.warnings,
          uploadedAt: now,
          updatedAt: now,
          form: extractResult.form,
        };

        await saveTest(stored);

        // Clean up job and chunks
        await sql()`DELETE FROM test_import_jobs WHERE id = ${jobId}`.catch(() => {});
        await sql()`DELETE FROM upload_chunks WHERE id = ${jobId}`.catch(() => {});

        return NextResponse.json({
          ok: true,
          id: testId,
          title: job.title,
          scorable: stored.scorable,
          warnings: extractResult.warnings,
          stats: extractResult.stats,
          summary: `Imported ${extractResult.stats.totalQuestions} questions (${extractResult.stats.keysDetectedFromPdf} keys detected from PDF${extractResult.stats.keysSolvedByAi > 0 ? `, ${extractResult.stats.keysSolvedByAi} solved by AI` : ""}).`,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown step '${step}'.` }, { status: 400 });
    }
  } catch (err) {
    console.error("Job step execution error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Step processing failed." },
      { status: 500 }
    );
  }
}
