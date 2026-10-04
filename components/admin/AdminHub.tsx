"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TestSummary } from "@/lib/testEngine/store";

const inputClass =
  "w-full rounded border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none";

export function AdminHub() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-bold tracking-tight text-white">
            Test library
          </h1>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-zinc-400">
            Upload a practice test as JSON. After import, Gemini fills any
            missing answer keys so the paper is scorable.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            window.location.href = "/admin/login";
          }}
          className="text-[13px] font-medium text-zinc-500 underline decoration-white/20 underline-offset-4 transition hover:text-zinc-300"
        >
          Sign out
        </button>
      </div>

      <UploadForm onUploaded={refresh} />

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
  const [publishNow, setPublishNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage({ kind: "error", text: "Pick a .json or .csv file first." });
      return;
    }
    const kind = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
    setBusy(true);
    setMessage(null);
    setErrors([]);
    try {
      let text = await file.text();
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title || file.name.replace(/\.(json|csv)$/i, ""),
          collection,
          source,
          published: publishNow,
          kind,
          text,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
        scorable?: boolean;
        warnings?: { where: string; message: string }[];
        errors?: { where: string; message: string }[];
        summary?: string;
      };
      if (!res.ok) {
        setErrors((json.errors ?? []).map((er) => `${er.where}: ${er.message}`));
        setMessage({ kind: "error", text: json.error ?? `Upload failed (HTTP ${res.status}).` });
        return;
      }
      const warn = json.warnings?.length
        ? ` ${json.warnings.length} warning${json.warnings.length === 1 ? "" : "s"}.`
        : "";
      setMessage({
        kind: "ok",
        text: `Imported as ${json.id}. ${json.summary ?? ""}${warn}${json.scorable ? "" : " Some keys still missing."}`,
      });
      setTitle("");
      setSource("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      setMessage({ kind: "error", text: `Upload failed: ${detail}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel mt-8 max-w-2xl space-y-4 p-6">
      <div>
        <label htmlFor="file" className="block text-[13px] text-zinc-400">
          Test file (.json or .csv)
        </label>
        <input
          id="file"
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="mt-1.5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border file:border-white/15 file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-white"
        />
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600">
          Author in the Klutch practice-test format — one row per question for
          CSV, or sections → modules → items for JSON. Download a template:{" "}
          <a href="/api/admin/tests/template?kind=json" className="text-mint underline underline-offset-4">JSON</a>
          {" · "}
          <a href="/api/admin/tests/template?kind=csv" className="text-mint underline underline-offset-4">CSV</a>
        </p>
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
            placeholder="Klutch SAT · Test 1"
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
          Author / notes
        </label>
        <input
          id="source"
          className={`mt-1.5 ${inputClass}`}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Who wrote it, internal notes (never shown to students)"
        />
      </div>

      <Check label="Publish now (students see it immediately)" checked={publishNow} onChange={setPublishNow} />

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        {message && (
          <p
            className={`max-w-[42ch] text-[13px] leading-relaxed ${
              message.kind === "ok" ? "text-mint" : "text-rose-300"
            }`}
            role="status"
          >
            {message.text}
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1 border-l-2 border-rose-400/50 pl-3 text-[12px] text-rose-300">
          {errors.slice(0, 20).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
          {errors.length > 20 && <li>…and {errors.length - 20} more.</li>}
        </ul>
      )}
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
                      checked={t.published}
                      onChange={(e) =>
                        patch(t.id, { published: e.target.checked })
                      }
                      className="h-4 w-4 accent-mint"
                    />
                    Published
                  </label>

                  <Link
                    href={`/practice/test/${t.id}`}
                    className="text-[12px] font-semibold text-mint hover:text-mint-300"
                  >
                    {t.published ? "Take it" : "Preview"}
                  </Link>
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
