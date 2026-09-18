"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TestSummary } from "@/lib/testEngine/store";
import { PdfImport } from "./PdfImport";

const inputClass =
  "w-full rounded border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none";

export function AdminHub() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"json" | "pdf">("json");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/tests", { cache: "no-store" });
    const json = await res.json();
    setTests(json.tests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
        Test library
      </h1>
      <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-zinc-400">
        Upload a test, give it a title and a grouping, and choose whether it can
        be sat in the player, printed, or both. Exported JSON imports directly.
        A PDF goes through extraction first, which also picks up the answer key.
      </p>

      <div className="mt-7 flex gap-6 border-b border-white/[0.14]">
        {(
          [
            ["json", "Exported JSON"],
            ["pdf", "PDF paper"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 pb-2.5 text-sm transition ${
              tab === id
                ? "border-mint font-semibold text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "json" ? (
        <UploadForm onUploaded={refresh} />
      ) : (
        <PdfImport onSaved={refresh} />
      )}

      <h2 className="mt-14 font-display text-xl font-bold tracking-tight text-white">
        Uploaded
        {!loading && (
          <span className="nums ml-2 text-base font-normal text-zinc-600">
            {tests.length}
          </span>
        )}
      </h2>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading.</p>
      ) : tests.length === 0 ? (
        <p className="mt-4 max-w-[56ch] text-sm leading-relaxed text-zinc-500">
          Nothing uploaded yet. The built-in placeholder form stays available in
          the player regardless.
        </p>
      ) : (
        <TestTable tests={tests} onChanged={refresh} />
      )}
    </section>
  );
}

function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [collection, setCollection] = useState("");
  const [source, setSource] = useState("");
  const [asTest, setAsTest] = useState(true);
  const [asPdf, setAsPdf] = useState(true);
  const [swap, setSwap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage({ kind: "error", text: "Pick a JSON file first." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const data = JSON.parse(await file.text());
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title || file.name.replace(/\.json$/i, ""),
          collection,
          source,
          swapModuleTwo: swap,
          availability: { test: asTest, pdf: asPdf },
          data,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setMessage({ kind: "error", text: json.error ?? "Upload failed." });
      } else {
        const counts = (json.sections ?? [])
          .map(
            (s: { name: string; module1: number; module2: number }) =>
              `${s.name} ${s.module1}+${s.module2}`
          )
          .join(", ");
        setMessage({
          kind: "ok",
          text: [
            `Imported as ${json.id}.`,
            counts,
            ...(json.warnings ?? []),
          ]
            .filter(Boolean)
            .join(" "),
        });
        setTitle("");
        setSource("");
        if (fileRef.current) fileRef.current.value = "";
        onUploaded();
      }
    } catch {
      setMessage({ kind: "error", text: "That file is not valid JSON." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="panel mt-8 max-w-2xl space-y-4 p-6"
    >
      <div>
        <label htmlFor="file" className="block text-[13px] text-zinc-400">
          Test file
        </label>
        <input
          id="file"
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="mt-1.5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border file:border-white/15 file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-white"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="block text-[13px] text-zinc-400">
            Title
          </label>
          <input
            id="title"
            className={`mt-1.5 ${inputClass}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="September U.S. SAT"
          />
        </div>
        <div>
          <label htmlFor="collection" className="block text-[13px] text-zinc-400">
            Section
          </label>
          <input
            id="collection"
            className={`mt-1.5 ${inputClass}`}
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            placeholder="Full-length tests"
            list="collections"
          />
          <datalist id="collections">
            <option value="Full-length tests" />
            <option value="Math only" />
            <option value="Reading and Writing only" />
            <option value="Klutch originals" />
          </datalist>
        </div>
      </div>

      <div>
        <label htmlFor="source" className="block text-[13px] text-zinc-400">
          Source
        </label>
        <input
          id="source"
          className={`mt-1.5 ${inputClass}`}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Where this came from and who owns it"
        />
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600">
          Recorded per upload so the library can be audited later. Only publish
          material you have the right to distribute.
        </p>
      </div>

      <fieldset>
        <legend className="text-[13px] text-zinc-400">Available as</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          <Check label="Test in the player" checked={asTest} onChange={setAsTest} />
          <Check label="Printable PDF" checked={asPdf} onChange={setAsPdf} />
          <Check
            label="Swap module 2 forms"
            checked={swap}
            onChange={setSwap}
          />
        </div>
        <p className="mt-2 max-w-[60ch] text-[12px] leading-relaxed text-zinc-600">
          Module 2 arrives as two interleaved forms with nothing marking which
          is harder. If the routing looks backwards after a run, re-upload with
          the swap on.
        </p>
      </fieldset>

      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-50"
        >
          {busy ? "Importing" : "Upload"}
        </button>
        {message && (
          <p
            className={`text-[13px] leading-relaxed ${
              message.kind === "ok" ? "text-mint" : "text-rose-300"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-zinc-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-mint"
      />
      {label}
    </label>
  );
}

function TestTable({
  tests,
  onChanged,
}: {
  tests: TestSummary[];
  onChanged: () => void;
}) {
  const groups = Array.from(new Set(tests.map((t) => t.collection)));

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/tests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    onChanged();
  };

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This removes the file from disk.`)) return;
    await fetch(`/api/admin/tests/${id}`, { method: "DELETE" });
    onChanged();
  };

  return (
    <>
      {groups.map((group) => (
        <div key={group} className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-300">{group}</h3>
          <div className="mt-2">
            {tests
              .filter((t) => t.collection === group)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/[0.07] py-3.5"
                >
                  <div className="min-w-[14rem] flex-1">
                    <div className="text-sm font-medium text-white">
                      {t.title}
                    </div>
                    <div className="nums mt-0.5 text-[12px] text-zinc-500">
                      {t.questionCount} questions &middot;{" "}
                      {t.sections.map((s) => s.name).join(" + ")}
                      {!t.scorable && (
                        <span className="ml-2 text-amber-300">no answer key</span>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[12px] text-zinc-300">
                    <input
                      type="checkbox"
                      checked={t.availability.test}
                      onChange={(e) =>
                        patch(t.id, {
                          availability: {
                            test: e.target.checked,
                            pdf: t.availability.pdf,
                          },
                        })
                      }
                      className="h-4 w-4 accent-mint"
                    />
                    Player
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-zinc-300">
                    <input
                      type="checkbox"
                      checked={t.availability.pdf}
                      onChange={(e) =>
                        patch(t.id, {
                          availability: {
                            test: t.availability.test,
                            pdf: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-mint"
                    />
                    PDF
                  </label>

                  {t.availability.test && (
                    <Link
                      href={`/practice/test/${t.id}`}
                      className="text-[12px] font-semibold text-mint hover:text-mint-300"
                    >
                      Take it
                    </Link>
                  )}
                  {t.availability.pdf && (
                    <>
                      <a
                        href={`/api/admin/tests/${t.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] font-semibold text-mint hover:text-mint-300"
                      >
                        PDF
                      </a>
                      <a
                        href={`/api/admin/tests/${t.id}/pdf?answers=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] text-zinc-400 transition hover:text-white"
                      >
                        PDF + key
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(t.id, t.title)}
                    className="text-[12px] text-zinc-500 transition hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </>
  );
}
