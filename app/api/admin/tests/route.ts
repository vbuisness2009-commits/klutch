import { NextResponse } from "next/server";
import { importBluebookJson, type SourceFile } from "@/lib/testEngine/importBluebook";
import {
  importExtracted,
  type ExtractedQuestion,
} from "@/lib/testEngine/importExtracted";
import {
  listTests,
  saveTest,
  slugify,
  uniqueId,
  type StoredTest,
} from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tests: await listTests() });
}

export async function POST(request: Request) {
  let body: {
    title?: string;
    collection?: string;
    source?: string;
    availability?: { test?: boolean; pdf?: boolean };
    swapModuleTwo?: boolean;
    /** "bluebook" for exported session JSON, "extracted" for PDF output. */
    format?: "bluebook" | "extracted";
    crops?: Record<string, string>;
    data?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }
  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json(
      { error: "No test file contents were included." },
      { status: 400 }
    );
  }

  const id = await uniqueId(slugify(title));

  let imported;
  try {
    imported =
      body.format === "extracted"
        ? importExtracted(body.data as ExtractedQuestion[], {
            id,
            name: title,
            crops: body.crops,
          })
        : importBluebookJson(body.data as SourceFile, {
            id,
            name: title,
            swapModuleTwo: body.swapModuleTwo,
          });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not read that file." },
      { status: 422 }
    );
  }

  const stored: StoredTest = {
    id,
    title,
    collection: body.collection?.trim() || "Uncategorized",
    source: body.source?.trim() || "",
    availability: {
      test: body.availability?.test ?? true,
      pdf: body.availability?.pdf ?? false,
    },
    scorable: imported.scorable,
    warnings: imported.warnings,
    uploadedAt: new Date().toISOString(),
    form: imported.form,
  };

  await saveTest(stored);

  return NextResponse.json({
    id,
    scorable: stored.scorable,
    warnings: stored.warnings,
    sections: imported.form.sections.map((s) => ({
      name: s.name,
      module1: s.module1.items.length,
      module2: s.module2.upper.items.length,
    })),
  });
}
