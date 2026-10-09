import { NextResponse } from "next/server";
import { parseUpload } from "@/lib/testEngine/authoring";
import { extractPdfTest } from "@/lib/pdf/extractPdfTest";
import {
  listTests,
  saveTest,
  slugify,
  uniqueId,
  type StoredTest,
} from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    return NextResponse.json({ tests: await listTests() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load tests.", tests: [] },
      { status: 500 }
    );
  }
}

/**
 * Upload a Klutch practice test as PDF, JSON, or CSV.
 * Accepts either:
 *  - multipart/form-data: { file, title?, collection?, source?, published?, hasKey? }
 *  - application/json: { title, collection?, source?, published?, kind: "pdf" | "csv" | "json", text?, pdfBase64?, hasKey? }
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  let fileBuffer: Buffer | null = null;
  let fileText: string | null = null;
  let title = "";
  let collection = "Full-length tests";
  let source = "";
  let published = false;
  let hasKey = true;
  let kind: "pdf" | "csv" | "json" = "json";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      return NextResponse.json(
        { error: "Could not read form data." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a file to upload." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      kind = "pdf";
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else if (fileName.endsWith(".csv")) {
      kind = "csv";
      fileText = await file.text();
    } else {
      kind = "json";
      fileText = await file.text();
    }

    title =
      (formData.get("title") as string)?.trim() ||
      file.name.replace(/\.(pdf|json|csv)$/i, "");
    collection =
      (formData.get("collection") as string)?.trim() || "Full-length tests";
    source = (formData.get("source") as string)?.trim() || "";
    published = formData.get("published") === "true";
    hasKey =
      formData.get("hasKey") === "true" ||
      formData.get("hasKey") === "1" ||
      formData.get("hasKey") === "on";
  } else {
    // JSON body
    let body: {
      title?: string;
      collection?: string;
      source?: string;
      published?: boolean;
      hasKey?: boolean;
      kind?: "pdf" | "csv" | "json";
      text?: string;
      pdfBase64?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body must be JSON or multipart form data." }, { status: 400 });
    }

    title = body.title?.trim() || "";
    collection = body.collection?.trim() || "Full-length tests";
    source = body.source?.trim() || "";
    published = Boolean(body.published);
    hasKey = body.hasKey !== false;
    kind = body.kind || "json";

    if (kind === "pdf") {
      if (!body.pdfBase64) {
        return NextResponse.json(
          { error: "pdfBase64 is required for PDF upload." },
          { status: 400 }
        );
      }
      fileBuffer = Buffer.from(body.pdfBase64, "base64");
    } else {
      fileText = body.text || "";
    }
  }

  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  try {
    const id = await uniqueId(slugify(title));
    const now = new Date().toISOString();

    if (kind === "pdf") {
      if (!fileBuffer || fileBuffer.length === 0) {
        return NextResponse.json(
          { error: "The uploaded PDF file is empty." },
          { status: 400 }
        );
      }

      // Process PDF and detect answer keys
      const extractResult = await extractPdfTest(fileBuffer, {
        id,
        title,
        hasKey,
        collection,
        source,
      });

      const stored: StoredTest = {
        id,
        title,
        collection,
        source,
        published,
        scorable: extractResult.scorable,
        warnings: extractResult.warnings,
        uploadedAt: now,
        updatedAt: now,
        form: extractResult.form,
      };

      await saveTest(stored);

      return NextResponse.json({
        id,
        title,
        scorable: stored.scorable,
        warnings: extractResult.warnings,
        stats: extractResult.stats,
        summary: `Imported ${extractResult.stats.totalQuestions} questions (${extractResult.stats.keysDetectedFromPdf} keys detected from PDF${extractResult.stats.keysSolvedByAi > 0 ? `, ${extractResult.stats.keysSolvedByAi} solved by AI` : ""}).`,
      });
    }

    // CSV or JSON authoring format
    if (!fileText || !fileText.trim()) {
      return NextResponse.json({ error: "The file is empty." }, { status: 400 });
    }

    if (fileText.charCodeAt(0) === 0xfeff) {
      fileText = fileText.slice(1);
    }

    const result = parseUpload(kind, fileText, { id, name: title });
    if (!result.form) {
      return NextResponse.json(
        {
          error: `${result.errors.length} problem(s) must be fixed before saving.`,
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 422 }
      );
    }

    const stored: StoredTest = {
      id,
      title,
      collection: collection || result.doc?.collection?.trim() || "Full-length tests",
      source,
      published,
      scorable: result.scorable,
      warnings: result.warnings.map((w) => `${w.where}: ${w.message}`),
      uploadedAt: now,
      updatedAt: now,
      form: result.form,
    };

    await saveTest(stored);
    return NextResponse.json({
      id,
      title,
      scorable: stored.scorable,
      warnings: result.warnings,
      summary: result.summary,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save the test.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
