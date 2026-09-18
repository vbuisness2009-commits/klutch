import { notFound } from "next/navigation";
import { TestPlayer } from "@/components/test/TestPlayer";
import { FORMS } from "@/lib/testEngine/practiceFormA";
import { getTest } from "@/lib/testEngine/store";
import { ensureHeuristicPaces } from "@/lib/testEngine/pace";

// Uploaded forms are read from disk at request time, so this cannot be static.
export const dynamic = "force-dynamic";

export default async function TestPage({
  params,
  searchParams,
}: {
  params: { formId: string };
  searchParams: { fast?: string };
}) {
  // Built-in placeholder forms first, then the uploaded library.
  const stored = FORMS[params.formId] ? null : await getTest(params.formId);
  const raw = FORMS[params.formId] ?? stored?.form;

  if (!raw) notFound();
  if (stored && !stored.availability.test) notFound();

  // Ensure every item has an expectedPace band for post-test timing.
  const form = ensureHeuristicPaces(raw);

  // ?fast=1 compresses every clock so the full flow can be walked quickly.
  return (
    <TestPlayer
      form={form}
      fast={searchParams.fast === "1"}
      scorable={stored ? stored.scorable : true}
      // Built-in practice-a is synthetic; uploaded library forms are real papers.
      realPaper={Boolean(stored)}
    />
  );
}
