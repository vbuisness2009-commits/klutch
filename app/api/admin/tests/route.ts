import { NextResponse } from "next/server";
import { parseUpload } from "@/lib/testEngine/authoring";
import {
  listTests,
  saveTest,
  slugify,
  uniqueId,
  type StoredTest,
} from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";

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
 * Upload a Klutch practice test (CSV or JSON authoring format).
 * Body: { title, collection?, source?, published?, kind: "csv" | "json", text }
 * The file is re-validated here; the client-side preview is never trusted.
 */
export async function POST(request: Request) {
  let body: {
    title?: string;
    collection?: string;
    source?: string;
    published?: boolean;
    kind?: "csv" | "json";
    text?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  if (body.kind !== "csv" && body.kind !== "json") {
    return NextResponse.json({ error: "kind must be csv or json." }, { status: 400 });
  }
  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }

  try {
    const id = await uniqueId(slugify(title));
    const result = parseUpload(body.kind, body.text, { id, name: title });
    if (!result.form) {
      return NextResponse.json(
        { error: `${result.errors.length} problem(s) must be fixed before saving.`, errors: result.errors, warnings: result.warnings },
        { status: 422 }
      );
    }
    const now = new Date().toISOString();
    const stored: StoredTest = {
      id,
      title,
      collection: body.collection?.trim() || result.doc?.collection?.trim() || "Full-length tests",
      source: body.source?.trim() || "",
      published: Boolean(body.published),
      scorable: result.scorable,
      warnings: result.warnings.map((w) => `${w.where}: ${w.message}`),
      uploadedAt: now,
      updatedAt: now,
      form: result.form,
    };
    await saveTest(stored);
    return NextResponse.json({ id, scorable: stored.scorable, warnings: result.warnings, summary: result.summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save the test." },
      { status: 500 }
    );
  }
}
