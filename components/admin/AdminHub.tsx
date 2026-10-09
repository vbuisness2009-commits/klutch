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
            Upload a practice test as a PDF, JSON, or CSV. When uploading a PDF with an answer key,
            Klutch automatically extracts the questions, detects the key from tables or scoring guides,
            and solves any missing items with AI so the paper is immediately playable and scorable.
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [collection, setCollection] = useState("");
  const [source, setSource] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [hasKey, setHasKey] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyStatus, setBusyStatus] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const isPdf = Boolean(
    selectedFile &&
      (selectedFile.name.toLowerCase().endsWith(".pdf") ||
        selectedFile.type === "application/pdf")
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setCreatedId(null);
    setMessage(null);
    setErrors([]);
    if (file && !title) {
      // Auto-suggest title based on filename
      const suggested = file.name
        .replace(/\.(pdf|json|csv)$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(suggested);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = selectedFile || fileRef.current?.files?.[0];
    if (!file) {
      setMessage({ kind: "error", text: "Select a .pdf, .json, or .csv file first." });
      return;
    }

    setBusy(true);
    setCreatedId(null);
    setMessage(null);
    setErrors([]);

    try {
      const fileName = file.name.toLowerCase();
      const currentIsPdf =
        fileName.endsWith(".pdf") || file.type === "application/pdf";

      if (currentIsPdf) {
        const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB chunks to avoid Vercel 4.5MB body limit
        let res: Response;

        if (file.size > CHUNK_SIZE) {
          const uploadId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `up-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

          for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(file.size, start + CHUNK_SIZE);
            const chunkBlob = file.slice(start, end);
            const pct = Math.round(((i + 1) / totalChunks) * 100);

            setBusyStatus(`Uploading file part ${i + 1} of ${totalChunks} (${pct}%)…`);

            const chunkFormData = new FormData();
            chunkFormData.append("uploadId", uploadId);
            chunkFormData.append("chunkIndex", String(i));
            chunkFormData.append("totalChunks", String(totalChunks));
            chunkFormData.append("chunk", chunkBlob);

            const chunkRes = await fetch("/api/admin/tests/chunk", {
              method: "POST",
              body: chunkFormData,
            });

            if (!chunkRes.ok) {
              const chunkJson = await chunkRes.json().catch(() => ({}));
              throw new Error(chunkJson.error || `Upload of chunk ${i + 1} failed (HTTP ${chunkRes.status}).`);
            }
          }

          setBusyStatus(
            hasKey
              ? "Reading PDF, extracting questions & detecting answer key with AI…"
              : "Reading PDF & extracting questions with AI…"
          );

          res = await fetch("/api/admin/tests", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              uploadId,
              title: title || file.name.replace(/\.pdf$/i, ""),
              collection: collection || "Full-length tests",
              source,
              published: publishNow,
              hasKey,
              kind: "pdf",
            }),
          });
        } else {
          setBusyStatus(
            hasKey
              ? "Reading PDF, extracting questions & detecting answer key with AI…"
              : "Reading PDF & extracting questions with AI…"
          );

          const formData = new FormData();
          formData.append("file", file);
          formData.append("title", title || file.name.replace(/\.pdf$/i, ""));
          formData.append("collection", collection || "Full-length tests");
          formData.append("source", source);
          formData.append("published", String(publishNow));
          formData.append("hasKey", String(hasKey));

          res = await fetch("/api/admin/tests", {
            method: "POST",
            body: formData,
          });
        }

        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          id?: string;
          scorable?: boolean;
          summary?: string;
          warnings?: string[];
          stats?: {
            totalQuestions: number;
            keysDetectedFromPdf: number;
            keysSolvedByAi: number;
          };
        };

        if (!res.ok) {
          setMessage({
            kind: "error",
            text: json.error ?? `Upload failed (HTTP ${res.status}).`,
          });
          return;
        }

        setCreatedId(json.id || null);
        setMessage({
          kind: "ok",
          text: `Successfully imported as ${json.id}! ${json.summary ?? ""}`,
        });
        setTitle("");
        setSource("");
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
        onUploaded();
      } else {
        // JSON or CSV
        setBusyStatus("Validating test format…");
        const kind = fileName.endsWith(".csv") ? "csv" : "json";
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
          setErrors(
            (json.errors ?? []).map((er) => `${er.where}: ${er.message}`)
          );
          setMessage({
            kind: "error",
            text: json.error ?? `Upload failed (HTTP ${res.status}).`,
          });
          return;
        }

        const warn = json.warnings?.length
          ? ` ${json.warnings.length} warning(s).`
          : "";
        setCreatedId(json.id || null);
        setMessage({
          kind: "ok",
          text: `Imported as ${json.id}. ${json.summary ?? ""}${warn}${
            json.scorable ? "" : " Some keys still missing."
          }`,
        });
        setTitle("");
        setSource("");
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
        onUploaded();
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      setMessage({ kind: "error", text: `Upload failed: ${detail}` });
    } finally {
      setBusy(false);
      setBusyStatus("");
    }
  };

  return (
    <form onSubmit={submit} className="panel mt-8 max-w-2xl space-y-4 p-6">
      <div>
        <label htmlFor="file" className="block text-[13px] font-medium text-zinc-300">
          Practice test file (.pdf, .json, or .csv)
        </label>
        <input
          id="file"
          ref={fileRef}
          type="file"
          accept=".pdf,.json,.csv,application/pdf,application/json,text/csv"
          onChange={handleFileChange}
          className="mt-1.5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border file:border-white/15 file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-white"
        />
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
          Upload an official or practice SAT PDF, or author in JSON/CSV. Templates:{" "}
          <a
            href="/api/admin/tests/template?kind=json"
            className="text-mint underline underline-offset-4"
          >
            JSON
          </a>
          {" · "}
          <a
            href="/api/admin/tests/template?kind=csv"
            className="text-mint underline underline-offset-4"
          >
            CSV
          </a>
        </p>
      </div>

      {isPdf && (
        <div className="rounded-lg border border-mint/20 bg-mint/[0.04] p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <input
              id="hasKey"
              type="checkbox"
              checked={hasKey}
              onChange={(e) => setHasKey(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-mint"
            />
            <div>
              <label
                htmlFor="hasKey"
                className="cursor-pointer text-[13px] font-semibold text-mint"
              >
                PDF includes answer key (auto-detect key)
              </label>
              <p className="mt-0.5 text-[12px] text-zinc-400 leading-relaxed">
                When checked, Klutch scans the PDF for embedded answer keys, answer tables,
                and scoring guides. Any remaining missing answers will automatically be solved
                by AI so the test is 100% scorable and ready to play.
              </p>
            </div>
          </div>
        </div>
      )}

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
            placeholder="e.g. Practice Test 1"
          />
        </div>
        <div>
          <label htmlFor="collection" className="block text-[13px] text-zinc-400">
            Section / Collection
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
            <option value="Official Practice Tests" />
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

      <Check
        label="Publish now (students see it immediately in test library)"
        checked={publishNow}
        onChange={setPublishNow}
      />

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-50"
        >
          {busy ? "Processing…" : isPdf ? "Upload & Ingest PDF" : "Upload"}
        </button>

        {busy && busyStatus && (
          <span className="text-[13px] text-zinc-400 animate-pulse">
            {busyStatus}
          </span>
        )}

        {message && !busy && (
          <div className="flex flex-wrap items-center gap-3">
            <p
              className={`max-w-[46ch] text-[13px] leading-relaxed ${
                message.kind === "ok" ? "text-mint font-medium" : "text-rose-300"
              }`}
              role="status"
            >
              {message.text}
            </p>
            {createdId && (
              <Link
                href={`/practice/test/${createdId}`}
                className="inline-flex items-center gap-1.5 rounded border border-mint/40 bg-mint/10 px-3 py-1 text-[12px] font-semibold text-mint hover:bg-mint/20 transition"
              >
                Open in test player &rarr;
              </Link>
            )}
          </div>
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
    if (!confirm(`Delete "${title}"? This removes the test permanently.`))
      return;
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
                      {!t.scorable ? (
                        <span className="ml-2 text-amber-300">no answer key</span>
                      ) : (
                        <span className="ml-2 text-mint font-medium">scorable</span>
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
                    Open in tester &rarr;
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
