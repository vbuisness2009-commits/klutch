import { NextResponse } from "next/server";
import { deleteTest, getTest, saveTest } from "@/lib/testEngine/store";

export const dynamic = "force-dynamic";

/** Updates the editable metadata: title, grouping, source, availability. */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const existing = await getTest(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    collection?: string;
    source?: string;
    availability?: { test?: boolean; pdf?: boolean };
  };

  const updated = {
    ...existing,
    title: body.title?.trim() || existing.title,
    collection: body.collection?.trim() || existing.collection,
    source: body.source === undefined ? existing.source : body.source.trim(),
    availability: {
      test: body.availability?.test ?? existing.availability.test,
      pdf: body.availability?.pdf ?? existing.availability.pdf,
    },
  };

  // The form body keeps its original name so the player header matches.
  updated.form = { ...existing.form, name: updated.title };

  await saveTest(updated);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ok = await deleteTest(params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
