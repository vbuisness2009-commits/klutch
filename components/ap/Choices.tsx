"use client";

import type { ApMcq } from "@/lib/apSchema";
import { Markdown } from "@/components/ap/Markdown";

/**
 * Stimulus + stem + answer choices for one MCQ, shared by unit practice and
 * the practice exam. Choices are real radio inputs, so arrow keys move between
 * them and the surrounding form submits on Enter.
 *
 * `reveal` switches to the checked state: the right answer goes mint, the
 * student's wrong pick goes rose, and the inputs lock.
 */
export function McqBody({
  q,
  name,
  selected,
  onSelect,
  reveal = false,
}: {
  q: ApMcq;
  name: string;
  selected: string | undefined;
  onSelect: (id: string) => void;
  reveal?: boolean;
}) {
  return (
    <div>
      {q.stimulus && (
        <div className="mb-5 border-l-2 border-white/15 pl-4">
          <Markdown source={q.stimulus} className="text-[15px] text-zinc-200" />
        </div>
      )}
      <Markdown source={q.stem} className="text-[15px] font-medium text-white" />

      <fieldset className="mt-5">
        <legend className="sr-only">Answer choices</legend>
        <div className="space-y-2">
          {q.choices.map((c) => {
            const isSel = selected === c.id;
            const isAns = c.id === q.answer;
            const state = reveal
              ? isAns
                ? "border-mint/70 bg-mint/[0.07]"
                : isSel
                  ? "border-rose-400/70 bg-rose-400/[0.06]"
                  : "border-white/[0.08] opacity-70"
              : isSel
                ? "border-mint bg-mint/10"
                : "border-white/12 hover:border-white/30 hover:bg-white/[0.03]";
            const badge = reveal
              ? isAns
                ? "border-mint bg-mint text-ink-950"
                : isSel
                  ? "border-rose-400 bg-rose-400 text-ink-950"
                  : "border-white/20 text-zinc-500"
              : isSel
                ? "border-mint bg-mint text-ink-950"
                : "border-white/25 text-zinc-300";
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-start gap-3 rounded border px-3.5 py-3 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mint/60 ${state} ${reveal ? "cursor-default" : ""}`}
              >
                <input
                  type="radio"
                  name={name}
                  value={c.id}
                  checked={isSel}
                  disabled={reveal}
                  onChange={() => onSelect(c.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-px flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[12px] font-bold ${badge}`}
                >
                  {c.id}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-relaxed text-zinc-100">
                  <span className="sr-only">{c.id}. </span>
                  <Markdown source={c.text} inline />
                  {reveal && isAns && <span className="sr-only"> (correct answer)</span>}
                  {reveal && isSel && !isAns && <span className="sr-only"> (your answer)</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

/** True when a keystroke is meant for a text field, not a shortcut. */
export function typingTarget(e: KeyboardEvent | React.KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (tag === "INPUT" && !["radio", "checkbox", "button"].includes((t as HTMLInputElement).type)) ||
    t.isContentEditable
  );
}
