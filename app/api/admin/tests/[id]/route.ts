import { NextResponse } from "next/server";
import { formToDoc, validateDoc, type AuthoringDoc } from "@/lib/testEngine/authoring";
import { deleteTest, getTest, saveTest } from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";

/** Full test (with keys) plus its authoring doc, for the in-hub editor. Admin only via middleware. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const test = await getTest(params.id);
  if (!test) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { form, ...meta } = test;
  return NextResponse.json(
    { meta, doc: formToDoc(form, { title: test.title, collection: test.collection }) },
    { headers: { "cache-control": "no-store" } }
  );
}

/** Metadata only: title, collection, source, published. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const existing = await getTest(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    collection?: string;
    source?: string;
    published?: boolean;
  };
  const title = body.title?.trim() || existing.title;
  await saveTest({
    ...existing,
    title,
    collection: body.collection?.trim() || existing.collection,
    source: body.source === undefined ? existing.source : body.source.trim(),
    published: typeof body.published === "boolean" ? body.published : existing.published,
    form: { ...existing.form, name: title },
  });
  return NextResponse.json({ ok: true });
}

/** Replace the questions from the editor. Body: { doc: AuthoringDoc }. */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const existing = await getTest(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { doc?: AuthoringDoc } | null;
  if (!body?.doc || typeof body.doc !== "object") {
    return NextResponse.json({ error: "Missing doc." }, { status: 400 });
  }
  const result = validateDoc(body.doc, { id: existing.id, name: existing.title });
  if (!result.form) {
    return NextResponse.json(
      { error: `${result.errors.length} problem(s) must be fixed before saving.`, errors: result.errors, warnings: result.warnings },
      { status: 422 }
    );
  }
  await saveTest({
    ...existing,
    scorable: result.scorable,
    warnings: result.warnings.map((w) => `${w.where}: ${w.message}`),
    form: result.form,
  });
  return NextResponse.json({ ok: true, scorable: result.scorable, warnings: result.warnings });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ok = await deleteTest(params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
