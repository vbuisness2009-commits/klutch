import { NextResponse } from "next/server";
import { loadLastExtract } from "@/lib/pdf/lastExtract";

export const dynamic = "force-dynamic";

/** Resume the crop step from the last successful extract without re-reading. */
export async function GET() {
  const last = await loadLastExtract();
  if (!last || !last.questions?.length) {
    return NextResponse.json(
      { error: "No saved extract yet. Run Extract questions first." },
      { status: 404 }
    );
  }
  return NextResponse.json(last);
}
