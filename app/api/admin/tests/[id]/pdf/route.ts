import { NextResponse } from "next/server";
import { getTest } from "@/lib/testEngine/store";
import { renderFormPdf } from "@/lib/pdf/renderForm";
import { FORMS } from "@/lib/testEngine/practiceFormA";

export const dynamic = "force-dynamic";
// Rendering a full paper through headless Chrome takes a while.
export const maxDuration = 300;

/**
 * Renders a stored test as a Klutch-branded PDF.
 *   ?answers=1  includes the answer key and explanations
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const showAnswers = searchParams.get("answers") === "1";

  const builtIn = FORMS[params.id];
  const stored = builtIn ? null : await getTest(params.id);
  const form = builtIn ?? stored?.form;

  if (!form) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (stored && !stored.availability.pdf) {
    return NextResponse.json(
      { error: "This test is not published as a PDF." },
      { status: 403 }
    );
  }

  try {
    const pdf = await renderFormPdf(form, { showAnswers });
    const suffix = showAnswers ? "-with-answers" : "";
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${form.name.replace(/[^a-z0-9]+/gi, "-")}${suffix}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not render the PDF." },
      { status: 500 }
    );
  }
}
