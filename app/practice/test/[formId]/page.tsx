import { notFound } from "next/navigation";
import { TestPlayer } from "@/components/test/TestPlayer";
import { loadPlayableForm, redactForm } from "@/lib/testEngine/redact";
import { isAdminRequest } from "@/lib/adminRequest";

// Tests are read from the database at request time, so this cannot be static.
export const dynamic = "force-dynamic";

export default async function TestPage({
  params,
  searchParams,
}: {
  params: { formId: string };
  searchParams: { fast?: string; preview?: string };
}) {
  const admin = await isAdminRequest();
  const loaded = await loadPlayableForm(params.formId, { admin });
  if (!loaded) notFound();

  // ?fast=1 compresses every clock so the full flow can be walked quickly.
  return (
    <TestPlayer
      // Keys are stripped here; routing and scoring fetch them from the server.
      form={redactForm(loaded.form)}
      fast={searchParams.fast === "1"}
      scorable={loaded.scorable}
      formId={params.formId}
      builtIn={loaded.builtIn}
      preview={admin && (!loaded.published || searchParams.preview === "1")}
    />
  );
}
