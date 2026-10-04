import { NextResponse } from "next/server";
import { keyedFormForRoutes, loadPlayableForm } from "@/lib/testEngine/redact";
import { isAdminRequest } from "@/lib/adminRequest";
import type { Route, SectionId } from "@/lib/testEngine/types";

export const dynamic = "force-dynamic";

/**
 * Called when a student finishes: returns the answer keys for the questions
 * they answered in the modules they sat, so the results screen can score them.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const loaded = await loadPlayableForm(params.id, {
    admin: await isAdminRequest(),
  });
  if (!loaded) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    routes?: Partial<Record<SectionId, Route>>;
    responses?: Record<string, unknown>;
  };
  const routes: Partial<Record<SectionId, Route>> = {};
  for (const [k, v] of Object.entries(body.routes ?? {})) {
    if (v === "upper" || v === "lower") routes[k as SectionId] = v;
  }
  const responses: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.responses ?? {})) {
    if (typeof v === "string") responses[k] = v.slice(0, 50);
  }
  return NextResponse.json(
    { form: keyedFormForRoutes(loaded.form, routes, responses) },
    { headers: { "cache-control": "no-store" } }
  );
}
