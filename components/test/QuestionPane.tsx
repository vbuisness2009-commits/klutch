"use client";

import { isSpr, type Item } from "@/lib/testEngine/types";

type Props = {
  item: Item;
  number: number;
  response: string | undefined;
  flagged: boolean;
  eliminated: string[];
  eliminatorOn: boolean;
  onRespond: (value: string) => void;
  onToggleFlag: () => void;
  onToggleEliminate: (choiceId: string) => void;
  onToggleEliminator: () => void;
};

const LETTERS = ["A", "B", "C", "D"] as const;

export function QuestionPane({
  item,
  number,
  response,
  flagged,
  eliminated,
  eliminatorOn,
  onRespond,
  onToggleFlag,
  onToggleEliminate,
  onToggleEliminator,
}: Props) {
  const twoPane = Boolean(item.stimulus) && !isSpr(item);

  const question = (
    <div className="max-w-[46rem]">
      <div className="flex items-center gap-3 border-b border-white/[0.14] pb-2.5">
        <span className="nums flex h-6 w-6 items-center justify-center rounded bg-white text-[13px] font-bold text-ink-950">
          {number}
        </span>
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          className={`text-[13px] font-medium transition ${
            flagged ? "text-amber-300" : "text-zinc-400 hover:text-white"
          }`}
        >
          {flagged ? "Marked for review" : "Mark for review"}
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onToggleEliminator}
            aria-pressed={eliminatorOn}
            title="Cross out answer choices"
            className={`rounded border px-2 py-1 text-[12px] font-semibold transition ${
              eliminatorOn
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/15 text-zinc-400 hover:text-white"
            }`}
          >
            Cross out
          </button>
        </div>
      </div>

      {!twoPane && item.stimulus && (
        <Rich
          html={item.html}
          content={item.stimulus}
          className="mt-5 text-[15px] leading-relaxed text-zinc-200"
        />
      )}

      <Rich
        html={item.html}
        content={item.stem}
        className="mt-5 text-[15px] font-semibold leading-relaxed text-white"
      />

      {isSpr(item) ? (
        <div className="mt-5 max-w-xs">
          <label
            htmlFor={`spr-${item.id}`}
            className="block text-[12px] text-zinc-500"
          >
            Enter your answer
          </label>
          <input
            id={`spr-${item.id}`}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={response ?? ""}
            onChange={(e) => onRespond(e.target.value)}
            className="nums mt-1.5 w-full rounded border border-white/15 bg-white/[0.03] px-3 py-2.5 text-[15px] text-white focus:border-mint/60 focus:outline-none"
          />
          <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
            Fractions and decimals are both accepted. No commas or dollar signs.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {item.choices.map((c) => {
            const struck = eliminated.includes(c.id);
            const selected = response === c.id;
            return (
              <li key={c.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onRespond(c.id)}
                  disabled={struck}
                  aria-pressed={selected}
                  className={`flex flex-1 items-start gap-3 rounded border px-3.5 py-3 text-left transition ${
                    selected
                      ? "border-mint bg-mint/10"
                      : "border-white/12 hover:border-white/30 hover:bg-white/[0.03]"
                  } ${struck ? "opacity-35" : ""}`}
                >
                  <span
                    className={`mt-px flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[12px] font-bold ${
                      selected
                        ? "border-mint bg-mint text-ink-950"
                        : "border-white/25 text-zinc-300"
                    }`}
                  >
                    {c.id}
                  </span>
                  <Rich
                    html={item.html}
                    content={c.text}
                    as="span"
                    className={`text-[15px] leading-relaxed text-zinc-100 ${
                      struck ? "line-through" : ""
                    }`}
                  />
                </button>
                {eliminatorOn && (
                  <button
                    type="button"
                    onClick={() => onToggleEliminate(c.id)}
                    title={struck ? `Undo cross out ${c.id}` : `Cross out ${c.id}`}
                    aria-label={
                      struck ? `Undo cross out ${c.id}` : `Cross out ${c.id}`
                    }
                    className={`w-10 flex-shrink-0 rounded border text-[12px] font-bold transition ${
                      struck
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/12 text-zinc-500 hover:text-white"
                    }`}
                  >
                    {struck ? c.id : LETTERS[0] && "\u2014"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (!twoPane) {
    return <div className="mx-auto max-w-4xl px-6 py-8">{question}</div>;
  }

  return (
    <div className="mx-auto grid max-w-[84rem] gap-0 px-6 py-8 lg:grid-cols-2 lg:gap-10">
      <div className="lg:border-r lg:border-white/[0.1] lg:pr-10">
        <Rich
          html={item.html}
          content={item.stimulus ?? ""}
          className="text-[16px] leading-[1.75] text-zinc-100"
        />
      </div>
      <div>{question}</div>
    </div>
  );
}

/**
 * Authored items are plain text unless the author set `html`. Rendering markup
 * is why uploads only go through the admin hub, never from end users.
 */
function Rich({
  html,
  content,
  className,
  as = "div",
}: {
  html?: boolean;
  content: string;
  className?: string;
  as?: "div" | "span";
}) {
  const Tag = as;
  if (html) {
    return (
      <Tag
        className={`${className ?? ""} [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:my-2 [&_td]:border [&_td]:border-white/15 [&_td]:px-2 [&_td]:py-1 [&_math]:px-[0.05em] [&_math]:text-[1.05em] [&_math]:text-inherit [&_img]:my-2 [&_img]:mx-auto [&_img]:block [&_img]:max-h-[min(420px,70vh)] [&_img]:max-w-full [&_img]:rounded-md [&_img]:bg-white [&_img]:p-1.5`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  // Authored plain text keeps its line breaks (passages, poems, tables of values).
  return <Tag className={`${className ?? ""} whitespace-pre-line`}>{content}</Tag>;
}
