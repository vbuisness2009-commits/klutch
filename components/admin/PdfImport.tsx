"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCURATE_EXTRACT_MODE,
  findPlaceholders,
  type Placeholder,
} from "@/lib/pdf/extractPrompt";
import type { ExtractedQuestion } from "@/lib/testEngine/importExtracted";

const inputClass =
  "w-full rounded border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none";

const MODELS = [
  { id: ACCURATE_EXTRACT_MODE, label: "Accurate (Flash + Pro figures)" },
  { id: "google/gemini-2.5-flash", label: "Flash only, fast" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro only" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro only" },
];

type Stage = "pick" | "extracting" | "crop" | "saving" | "done";

type PassInfo = {
  label?: string;
  seconds?: number;
  figures?: number;
};

type ExtractMeta = {
  pageCount?: number;
  failures?: string[];
  pass?: string;
  stage?: string;
  progress?: string;
  mode?: string;
  passASeconds?: number;
  passBSeconds?: number;
  passes?: { a?: PassInfo; b?: PassInfo };
};

function stripImageTag(
  questions: ExtractedQuestion[],
  tag: string
): ExtractedQuestion[] {
  const scrub = (s?: string) => (s ? s.split(tag).join("").replace(/\n{3,}/g, "\n\n") : s);
  return questions.map((q) => ({
    ...q,
    stimulus: scrub(q.stimulus),
    stem: scrub(q.stem),
    choices: q.choices?.map((c) => ({ ...c, content: scrub(c.content) ?? c.content })),
  }));
}

function injectImageTag(
  questions: ExtractedQuestion[],
  questionIndex: number,
  tag: string
): ExtractedQuestion[] {
  return questions.map((q, i) => {
    if (i !== questionIndex) return q;
    const stimulus = q.stimulus?.trim() ? `${q.stimulus.trim()}\n${tag}` : tag;
    return { ...q, stimulus };
  });
}

function questionLabel(q: ExtractedQuestion, i: number): string {
  const sec = q.section ? String(q.section) : "Q";
  const num = q.number ?? String(i + 1);
  const mod = q.module != null ? ` M${q.module}` : "";
  return `${sec}${mod} #${num}`;
}

/** Prefer live stage/progress fields; otherwise a short Pass A/B timing summary. */
function formatExtractProgress(meta: ExtractMeta): string | null {
  if (meta.progress || meta.stage) return meta.progress ?? meta.stage ?? null;

  const bits: string[] = [];
  if (meta.passes?.a?.seconds != null) {
    bits.push(`${meta.passes.a.label ?? "Pass A"} ${meta.passes.a.seconds}s`);
  } else if (meta.passASeconds != null) {
    bits.push(`Pass A ${meta.passASeconds}s`);
  }
  if (meta.passes?.b?.seconds != null) {
    const figs =
      meta.passes.b.figures != null ? `, ${meta.passes.b.figures} figures` : "";
    bits.push(`${meta.passes.b.label ?? "Pass B"} ${meta.passes.b.seconds}s${figs}`);
  } else if (meta.passBSeconds != null) {
    bits.push(`Pass B ${meta.passBSeconds}s`);
  }
  if (bits.length) return bits.join(" · ");
  if (meta.pass && meta.pass !== "done") return `Pass ${meta.pass}`;
  return null;
}

export function PdfImport({ onSaved }: { onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [title, setTitle] = useState("");
  const [collection, setCollection] = useState("");
  const [source, setSource] = useState("");
  const [model, setModel] = useState(ACCURATE_EXTRACT_MODE);

  const [stage, setStage] = useState<Stage>("pick");
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [crops, setCrops] = useState<Record<string, string>>({});
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [elapsed, setElapsed] = useState(0);
  const [hasLast, setHasLast] = useState(false);
  /** Set when the extract response includes stage/progress fields. */
  const [extractProgress, setExtractProgress] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/extract/last")
      .then((r) => setHasLast(r.ok))
      .catch(() => setHasLast(false));
  }, []);

  useEffect(() => {
    if (stage !== "extracting") {
      setElapsed(0);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  const applyExtract = (qs: ExtractedQuestion[], meta: ExtractMeta) => {
    const found = findPlaceholders(JSON.stringify(qs));
    setQuestions(qs);
    setPlaceholders(found);
    setCrops({});
    // Always enter crop so operators can add missed figures even when none were tagged.
    setStage("crop");
    const progressBit = formatExtractProgress(meta);
    setNote({
      kind: "ok",
      text: [
        `${qs.length} questions${meta.pageCount ? ` from ${meta.pageCount} pages` : ""}.`,
        found.length > 0
          ? `${found.length} figures need cropping — drag a box around each one.`
          : "No figures detected — use Add figure if something was missed.",
        progressBit ? `(${progressBit})` : "",
        ...(meta.failures ?? []),
      ]
        .filter(Boolean)
        .join(" "),
    });
  };

  const extract = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setNote({ kind: "error", text: "Pick a PDF first." });
      return;
    }

    setStage("extracting");
    setNote(null);
    setExtractProgress(null);
    // Keep the bytes client-side so pages can be rendered for cropping.
    setPdfBytes(await file.arrayBuffer());

    const body = new FormData();
    body.append("file", file);
    body.append("model", model);

    try {
      const res = await fetch("/api/admin/extract", { method: "POST", body });
      let json: ExtractMeta & {
        error?: string;
        questions?: ExtractedQuestion[];
      };
      try {
        json = await res.json();
      } catch {
        setNote({
          kind: "error",
          text: res.ok
            ? "Extract returned unreadable data."
            : `Extract failed (${res.status}). Refresh and try Flash.`,
        });
        setStage("pick");
        return;
      }
      if (!res.ok) {
        setNote({ kind: "error", text: json.error ?? "Extraction failed." });
        setStage("pick");
        return;
      }

      const progressBit = formatExtractProgress(json);
      if (progressBit) setExtractProgress(progressBit);

      const qs = json.questions ?? [];
      if (qs.length === 0) {
        setNote({
          kind: "error",
          text: "No questions came back. Try Flash, or check the API key credits.",
        });
        setStage("pick");
        return;
      }

      applyExtract(qs, json);
      setHasLast(true);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    } catch (err) {
      setNote({
        kind: "error",
        text:
          err instanceof TypeError
            ? "Connection dropped mid-extract (server restarted or network blip). Use Resume last extract if one was saved, or run again with Flash."
            : "Could not reach the extraction service. Is the server still running on :3100?",
      });
      setStage("pick");
    }
  };

  /** Skip re-reading: load the last saved extract and go straight to cropping. */
  const resumeLast = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setNote({
        kind: "error",
        text: "Pick the same PDF first — cropping needs the page images.",
      });
      return;
    }
    setNote(null);
    setPdfBytes(await file.arrayBuffer());
    try {
      const res = await fetch("/api/admin/extract/last");
      const json = await res.json();
      if (!res.ok) {
        setNote({ kind: "error", text: json.error ?? "No saved extract." });
        return;
      }
      applyExtract(json.questions ?? [], {
        pageCount: json.pageCount,
        failures: json.failures,
        pass: json.pass,
        stage: json.stage,
        progress: json.progress,
        mode: json.mode,
        passASeconds: json.passASeconds,
        passBSeconds: json.passBSeconds,
        passes: json.passes,
      });
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    } catch {
      setNote({ kind: "error", text: "Could not load the saved extract." });
    }
  };

  const removePlaceholder = (tag: string) => {
    setQuestions((qs) => stripImageTag(qs, tag));
    setPlaceholders((ps) => ps.filter((p) => p.tag !== tag));
    setCrops((c) => {
      const next = { ...c };
      delete next[tag];
      return next;
    });
  };

  const addFigure = (fig: {
    page: number;
    description: string;
    questionIndex: number;
    dataUrl: string;
  }) => {
    const desc = fig.description.trim() || "figure";
    const tag = `[IMAGE: Page ${fig.page} - ${desc}]`;
    setQuestions((qs) => injectImageTag(qs, fig.questionIndex, tag));
    setPlaceholders((ps) => {
      if (ps.some((p) => p.tag === tag)) return ps;
      return [...ps, { tag, page: fig.page, description: desc }].sort(
        (a, b) => a.page - b.page
      );
    });
    setCrops((c) => ({ ...c, [tag]: fig.dataUrl }));
  };

  const save = async () => {
    setStage("saving");
    const res = await fetch("/api/admin/tests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        collection,
        source,
        format: "extracted",
        crops,
        availability: { test: true, pdf: true },
        data: questions,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNote({ kind: "error", text: json.error ?? "Save failed." });
      setStage("crop");
      return;
    }
    setNote({
      kind: "ok",
      text: [`Saved as ${json.id}.`, ...(json.warnings ?? [])].join(" "),
    });
    setStage("done");
    onSaved();
  };

  const remaining = placeholders.filter((p) => !crops[p.tag]).length;
  const isAccurate = model === ACCURATE_EXTRACT_MODE;

  const extractingHint = (() => {
    if (extractProgress) return extractProgress;
    if (isAccurate) {
      return "Pass A (Flash questions)… then Pass B (Pro figures)… Usually 1–3 minutes.";
    }
    return "Flash usually finishes under a minute. Pro can take several. Hung chunks time out after 2 minutes so the run cannot stall forever.";
  })();

  return (
    <div className="panel mt-8 max-w-3xl p-6">
      <form onSubmit={extract} className="space-y-4">
        <div>
          <label htmlFor="pdf" className="block text-[13px] text-zinc-400">
            PDF paper
          </label>
          <input
            id="pdf"
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1.5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border file:border-white/15 file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-white"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ptitle" className="block text-[13px] text-zinc-400">
              Title
            </label>
            <input
              id="ptitle"
              className={`mt-1.5 ${inputClass}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pcoll" className="block text-[13px] text-zinc-400">
              Section
            </label>
            <input
              id="pcoll"
              className={`mt-1.5 ${inputClass}`}
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              placeholder="Full-length tests"
            />
          </div>
          <div>
            <label htmlFor="pmodel" className="block text-[13px] text-zinc-400">
              Mode
            </label>
            <select
              id="pmodel"
              className={`mt-1.5 ${inputClass}`}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="psource" className="block text-[13px] text-zinc-400">
            Source
          </label>
          <input
            id="psource"
            className={`mt-1.5 ${inputClass}`}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Where this came from and who owns it"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={stage === "extracting"}
            className="rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-50"
          >
            {stage === "extracting" ? "Reading the paper…" : "Extract questions"}
          </button>
          {hasLast && stage === "pick" && (
            <button
              type="button"
              onClick={resumeLast}
              className="rounded border border-white/20 px-4 py-2 text-[13px] font-semibold text-white transition hover:border-mint/50 hover:text-mint"
            >
              Resume last extract → crop
            </button>
          )}
          {stage === "extracting" && (
            <span className="text-[13px] text-zinc-400">
              {elapsed}s · {extractingHint}
            </span>
          )}
          {note && (
            <p
              className={`basis-full text-[13px] leading-relaxed sm:basis-auto ${
                note.kind === "ok" ? "text-mint" : "text-rose-300"
              }`}
            >
              {note.text}
            </p>
          )}
        </div>
      </form>

      {stage === "crop" && pdfBytes && (
        <div className="mt-8 border-t border-white/[0.14] pt-6">
          <h3 className="text-sm font-semibold text-white">
            Crop the figures
            {placeholders.length > 0 && (
              <span className="nums ml-2 font-normal text-zinc-500">
                {placeholders.length - remaining} of {placeholders.length}
              </span>
            )}
          </h3>
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-zinc-500">
            Drag a box around each figure. Remove false positives, or add a
            missed figure by page and description before saving.
          </p>
          <CropTool
            pdfBytes={pdfBytes}
            placeholders={placeholders}
            crops={crops}
            questions={questions}
            onCrop={(tag, dataUrl) =>
              setCrops((c) => ({ ...c, [tag]: dataUrl }))
            }
            onRemove={removePlaceholder}
            onAdd={addFigure}
          />
          <button
            type="button"
            onClick={save}
            className="mt-6 rounded bg-mint px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400"
          >
            {remaining > 0
              ? `Save with ${remaining} figures skipped`
              : "Save to library"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders one PDF page to an image and lets the operator drag a rectangle over
 * it. Coordinates are kept in the page's natural pixel space and scaled by the
 * displayed size, so the crop stays sharp regardless of how the page is fitted
 * on screen.
 */
function CropTool({
  pdfBytes,
  placeholders,
  crops,
  questions,
  onCrop,
  onRemove,
  onAdd,
}: {
  pdfBytes: ArrayBuffer;
  placeholders: Placeholder[];
  crops: Record<string, string>;
  questions: ExtractedQuestion[];
  onCrop: (tag: string, dataUrl: string) => void;
  onRemove: (tag: string) => void;
  onAdd: (fig: {
    page: number;
    description: string;
    questionIndex: number;
    dataUrl: string;
  }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(placeholders.length === 0);
  const [addPage, setAddPage] = useState(1);
  const [addDesc, setAddDesc] = useState("");
  const [addQuestion, setAddQuestion] = useState(0);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const focusTag = useRef<string | null>(null);

  useEffect(() => {
    if (placeholders.length === 0) {
      setAdding(true);
      return;
    }
    if (focusTag.current) {
      const i = placeholders.findIndex((p) => p.tag === focusTag.current);
      if (i >= 0) {
        setIndex(i);
        focusTag.current = null;
        return;
      }
    }
    if (index >= placeholders.length) {
      setIndex(Math.max(0, placeholders.length - 1));
    }
  }, [placeholders, index]);

  const current = !adding && placeholders.length > 0 ? placeholders[index] : null;
  const renderPage = adding ? Math.max(1, addPage) : current?.page ?? 1;

  // Render the page this placeholder (or add-form) came from.
  useEffect(() => {
    let cancelled = false;
    setPageUrl(null);
    setBox(null);

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      // getDocument consumes the buffer, so hand it a copy each time.
      const doc = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise;
      const pageNo = Math.min(Math.max(1, renderPage), doc.numPages);
      const page = await doc.getPage(pageNo);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({
        canvas,
        canvasContext: canvas.getContext("2d")!,
        viewport,
      }).promise;
      if (!cancelled) setPageUrl(canvas.toDataURL());
    })().catch(() => {
      if (!cancelled) setPageUrl(null);
    });

    return () => {
      cancelled = true;
    };
  }, [renderPage, pdfBytes]);

  const redraw = useCallback(() => {
    const canvas = overlayRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.clientWidth) return;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!box) return;
    const scale = img.naturalWidth / img.clientWidth;
    ctx.strokeStyle = "#3DFFC1";
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(61,255,193,0.15)";
    ctx.fillRect(box.x / scale, box.y / scale, box.w / scale, box.h / scale);
    ctx.strokeRect(box.x / scale, box.y / scale, box.w / scale, box.h / scale);
  }, [box]);

  useEffect(redraw, [redraw, pageUrl]);

  const toNatural = (e: React.PointerEvent) => {
    const img = imgRef.current!;
    const rect = img.getBoundingClientRect();
    const scale = img.naturalWidth / img.clientWidth;
    return {
      x: Math.max(0, Math.min((e.clientX - rect.left) * scale, img.naturalWidth)),
      y: Math.max(0, Math.min((e.clientY - rect.top) * scale, img.naturalHeight)),
    };
  };

  const commit = () => {
    const img = imgRef.current;
    if (!img || !box || box.w < 8 || box.h < 8) return;
    const out = document.createElement("canvas");
    out.width = box.w;
    out.height = box.h;
    out
      .getContext("2d")!
      .drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    const dataUrl = out.toDataURL("image/png");

    if (adding) {
      if (!questions.length) return;
      const desc = addDesc.trim() || "figure";
      const page = Math.max(1, addPage);
      const tag = `[IMAGE: Page ${page} - ${desc}]`;
      focusTag.current = tag;
      onAdd({
        page,
        description: desc,
        questionIndex: Math.min(addQuestion, questions.length - 1),
        dataUrl,
      });
      setAddDesc("");
      setBox(null);
      setAdding(false);
      return;
    }

    if (current) onCrop(current.tag, dataUrl);
  };

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        {!adding && placeholders.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="rounded border border-white/15 px-2.5 py-1 text-[12px] text-white disabled:opacity-35"
            >
              Previous
            </button>
            <span className="nums text-[12px] text-zinc-500">
              {index + 1} / {placeholders.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(placeholders.length - 1, i + 1))}
              disabled={index === placeholders.length - 1}
              className="rounded border border-white/15 px-2.5 py-1 text-[12px] text-white disabled:opacity-35"
            >
              Next
            </button>
          </>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {!adding && current && (
            <button
              type="button"
              onClick={() => onRemove(current.tag)}
              className="rounded border border-rose-400/40 px-2.5 py-1 text-[12px] font-semibold text-rose-200 transition hover:border-rose-300/60"
            >
              Remove figure
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setBox(null);
            }}
            className="rounded border border-white/20 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:border-mint/50 hover:text-mint"
          >
            {adding ? "Cancel add" : "Add figure"}
          </button>
        </div>
      </div>

      {adding ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="add-page" className="block text-[12px] text-zinc-400">
              PDF page
            </label>
            <input
              id="add-page"
              type="number"
              min={1}
              className={`mt-1 ${inputClass}`}
              value={addPage}
              onChange={(e) => setAddPage(Number(e.target.value) || 1)}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="add-desc" className="block text-[12px] text-zinc-400">
              Description
            </label>
            <input
              id="add-desc"
              className={`mt-1 ${inputClass}`}
              value={addDesc}
              onChange={(e) => setAddDesc(e.target.value)}
              placeholder="e.g. scatterplot of height vs age"
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="add-q" className="block text-[12px] text-zinc-400">
              Attach to question
            </label>
            <select
              id="add-q"
              className={`mt-1 ${inputClass}`}
              value={addQuestion}
              onChange={(e) => setAddQuestion(Number(e.target.value))}
              disabled={questions.length === 0}
            >
              {questions.map((q, i) => (
                <option key={i} value={i}>
                  {questionLabel(q, i)}
                  {q.stem ? ` — ${q.stem.replace(/<[^>]+>/g, "").slice(0, 60)}` : ""}
                </option>
              ))}
            </select>
          </div>
          <p className="sm:col-span-3 text-[13px] text-zinc-500">
            Drag a box on page {Math.max(1, addPage)}, then confirm to inject the
            figure tag into that question.
          </p>
        </div>
      ) : current ? (
        <div className="mt-4 rounded border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="nums text-lg font-semibold tracking-tight text-white">
            Page {current.page}
          </p>
          <p className="mt-1 text-[15px] leading-snug text-zinc-200">
            {current.description || "(no description)"}
          </p>
          {crops[current.tag] && (
            <p className="mt-2 text-[12px] font-semibold text-mint">Cropped</p>
          )}
        </div>
      ) : null}

      <div className="relative mt-4 inline-block max-w-full select-none">
        {pageUrl ? (
          <>
            <img
              ref={imgRef}
              src={pageUrl}
              alt={`Page ${renderPage}`}
              draggable={false}
              onLoad={redraw}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                dragStart.current = toNatural(e);
                setBox(null);
              }}
              onPointerMove={(e) => {
                if (!dragStart.current) return;
                const p = toNatural(e);
                const s = dragStart.current;
                setBox({
                  x: Math.min(s.x, p.x),
                  y: Math.min(s.y, p.y),
                  w: Math.abs(p.x - s.x),
                  h: Math.abs(p.y - s.y),
                });
              }}
              onPointerUp={() => {
                dragStart.current = null;
              }}
              className="max-h-[70vh] w-auto cursor-crosshair border border-white/15 bg-white"
            />
            <canvas
              ref={overlayRef}
              className="pointer-events-none absolute left-0 top-0"
            />
          </>
        ) : (
          <p className="text-[13px] text-zinc-500">Rendering page.</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={commit}
          disabled={!box || (adding && questions.length === 0)}
          className="rounded border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:border-white/40 disabled:opacity-35"
        >
          {adding ? "Add crop to question" : "Use this crop"}
        </button>
        {!adding && current && crops[current.tag] && (
          <img
            src={crops[current.tag]}
            alt="crop preview"
            className="h-12 w-auto border border-white/15 bg-white"
          />
        )}
      </div>
    </div>
  );
}
