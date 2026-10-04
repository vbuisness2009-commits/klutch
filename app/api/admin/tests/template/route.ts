import { NextResponse } from "next/server";
import { docToCsv } from "@/lib/testEngine/authoring";
import { TEMPLATE_DOC } from "@/lib/testEngine/authoringTemplate";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") === "csv" ? "csv" : "json";
  if (kind === "csv") {
    return new NextResponse(docToCsv(TEMPLATE_DOC), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="klutch-practice-template.csv"',
      },
    });
  }
  return new NextResponse(JSON.stringify(TEMPLATE_DOC, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="klutch-practice-template.json"',
    },
  });
}
