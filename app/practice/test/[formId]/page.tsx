import Link from "next/link";
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

  const totalQuestions = loaded.form.sections.reduce(
    (acc, s) =>
      acc +
      (s.module1?.items?.length || 0) +
      (s.module2?.upper?.items?.length || 0),
    0
  );

  if (totalQuestions === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center bg-ink-950 px-5 text-center text-white">
        <div className="panel max-w-md p-8 border border-white/[0.1] rounded-xl bg-ink-900/60 shadow-2xl backdrop-blur">
          <span className="inline-block rounded-full bg-mint/10 border border-mint/20 px-3 py-1 text-xs font-semibold text-mint">
            In Preparation
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
            {loaded.form.name || "Practice Test"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            This practice test is currently being finalized. Check back soon or select another test.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded bg-mint px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/sat"
              className="rounded border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.04]"
            >
              All Tests
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
