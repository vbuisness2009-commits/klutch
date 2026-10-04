import { NextResponse } from "next/server";
import { loadPlayableForm, routeFor } from "@/lib/testEngine/redact";
import { isAdminRequest } from "@/lib/adminRequest";
import type { SectionId } from "@/lib/testEngine/types";

export const dynamic = "force-dynamic";

/** Picks the module 2 route from module 1 responses, without exposing keys. */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const loaded = await loadPlayableForm(params.id, {
    admin: await isAdminRequest(),
  });
  if (!loaded) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    sectionId?: SectionId;
    responses?: Record<string, string>;
  };
  if (!body.sectionId || typeof body.responses !== "object" || !body.responses) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  return NextResponse.json({
    route: routeFor(loaded.form, body.sectionId, body.responses),
  });
}
