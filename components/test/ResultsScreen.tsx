"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FeedbackChat } from "./FeedbackChat";
import {
  HEURISTIC_NOTE,
  buildSessionAnalytics,
  formatTime,
  stemSnippet,
  toFeedbackPayload,
  type ItemAnalytics,
} from "@/lib/testEngine/analytics";
import {
  isSpr,
  type Item,
  type Route,
  type SectionId,
  type SolutionPath,
  type TestForm,
} from "@/lib/testEngine/types";

type Props = {
  form: TestForm;
  routes: Partial<Record<SectionId, Route>>;
  responses: Record<string, string>;
  flags?: Record<string, boolean>;
  itemTimes?: Record<string, number>;
  answerChanges?: Record<string, number>;
  scorable?: boolean;
};

export function ResultsScreen({
  form,
  routes,
  responses,
  flags = {},
  itemTimes = {},
  answerChanges = {},
  scorable = true,
}: Props) {
  const analytics = useMemo(
    () =>
      buildSessionAnalytics({
        form,
        routes,
        responses,
        flags,
        itemTimes,
        answerChanges,
        scorable,
      }),
    [form, routes, responses, flags, itemTimes, answerChanges, scorable]
  );

  const feedbackPayload = useMemo(() => {
    const snippets: Record<string, string> = {};
    for (const section of form.sections) {
      const route = routes[section.id] ?? "lower";
      for (const item of [
        ...section.module1.items,
        ...section.module2[route].items,
      ]) {
        const row = analytics.items.find((i) => i.itemId === item.id);
        if (row && (row.correct === false || row.excessive)) {
          snippets[item.id] = stemSnippet(item);
        }
      }
    }
    return toFeedbackPayload(analytics, snippets);
  }, [analytics, form, routes]);

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const section of form.sections) {
      const route = routes[section.id] ?? "lower";
      for (const item of [
        ...section.module1.items,
        ...section.module2[route].items,
      ]) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [form, routes]);

  const missed = analytics.items.filter(
    (i) => !i.pretest && i.correct === false
  );

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(52,211,153,0.09),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_20%,rgba(255,255,255,0.03),transparent)]"
      />

      <section
        className="relative mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12"
        data-testid="results-screen"
      >
        {!scorable ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint/70">
              Complete
            </p>
            <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight text-white">
              Test finished
            </h1>
            <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-zinc-400">
              No answer key on this form — timing and the coach still work from
              what you did.
            </p>
          </>
        ) : (
          <ScoreHero result={analytics.score!} totals={analytics.totals} />
        )}

        <FeedbackChat analytics={feedbackPayload} />

        <details className="mt-10 group border-t border-white/[0.08] pt-6">
          <summary className="cursor-pointer list-none font-display text-[18px] font-bold tracking-tight text-white [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-baseline gap-3">
              Question timing
              <span className="nums text-[12px] font-normal text-zinc-500">
                {analytics.totals.excessive} over target
              </span>
              <span className="text-[12px] font-normal text-zinc-600 group-open:hidden">
                Show
              </span>
              <span className="hidden text-[12px] font-normal text-zinc-600 group-open:inline">
                Hide
              </span>
            </span>
          </summary>
          <TimingSection items={analytics.items} compact />
        </details>

        {scorable && missed.length > 0 && (
          <details className="mt-4 group border-t border-white/[0.08] pt-6">
            <summary className="cursor-pointer list-none font-display text-[18px] font-bold tracking-tight text-white [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-baseline gap-3">
                What you missed
                <span className="nums text-[12px] font-normal text-zinc-500">
                  {missed.length}
                </span>
                <span className="text-[12px] font-normal text-zinc-600 group-open:hidden">
                  Show
                </span>
                <span className="hidden text-[12px] font-normal text-zinc-600 group-open:inline">
                  Hide
                </span>
              </span>
            </summary>
            <MissedSection
              form={form}
              missed={missed}
              itemById={itemById}
              responses={responses}
            />
          </details>
        )}

        <Link
          href="/practice"
          className="mt-10 inline-block text-[13px] font-semibold text-zinc-400 transition hover:text-mint"
        >
          ← Back to practice
        </Link>
      </section>
    </div>
  );
}

function ScoreHero({
  result,
  totals,
}: {
  result: NonNullable<ReturnType<typeof buildSessionAnalytics>["score"]>;
  totals: ReturnType<typeof buildSessionAnalytics>["totals"];
}) {
  return (
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint/70">
        Results
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <div className="nums font-display text-[56px] font-bold leading-none tracking-tight text-white sm:text-[64px]">
            {result.total}
          </div>
          <p className="mt-1.5 text-[12px] text-zinc-500">
            ±{result.totalMargin} · out of 1600
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {result.sections.map((s) => (
            <div key={s.id}>
              <div className="nums font-display text-[24px] font-bold leading-none text-white">
                {s.score}
              </div>
              <p className="mt-1 max-w-[12rem] text-[11px] leading-snug text-zinc-500">
                {s.name} · {s.correct}/{s.total} · {s.route}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="nums mt-6 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/[0.08] pt-4 text-[12px] text-zinc-400">
        <span>
          <span className="text-white">{formatTime(totals.timeSec)}</span> on
          items
        </span>
        <span>
          <span className="text-white">
            {totals.correct}/{totals.answered + totals.blank}
          </span>{" "}
          correct
        </span>
        <span>
          <span className="text-white">{totals.excessive}</span> over target
        </span>
      </div>
    </header>
  );
}

function TimingSection({
  items,
  compact = false,
}: {
  items: ItemAnalytics[];
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "slow" | "missed" | "flagged">(
    "all"
  );

  const shown = items.filter((i) => {
    if (filter === "slow") return i.excessive;
    if (filter === "missed") return i.correct === false;
    if (filter === "flagged") return i.flagged;
    return true;
  });

  return (
    <div className={compact ? "mt-4" : "mt-16"} data-testid="item-timing-table">
      {!compact && (
        <>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            Question timing
          </h2>
          <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-zinc-500">
            {HEURISTIC_NOTE}
          </p>
        </>
      )}
      {compact && (
        <p className="mb-3 max-w-[60ch] text-[12px] leading-relaxed text-zinc-600">
          {HEURISTIC_NOTE}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
        {(
          [
            ["all", "All"],
            ["slow", "Over target"],
            ["missed", "Missed"],
            ["flagged", "Flagged"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`border-b-2 pb-0.5 transition ${
              filter === id
                ? "border-mint text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="mt-3 max-h-[22rem] divide-y divide-white/[0.06] overflow-y-auto border-y border-white/[0.06]">
        {shown.map((row) => (
          <TimingRow key={row.itemId} row={row} />
        ))}
        {shown.length === 0 && (
          <li className="py-6 text-center text-[13px] text-zinc-500">
            Nothing in this filter.
          </li>
        )}
      </ul>
    </div>
  );
}

function TimingRow({ row }: { row: ItemAnalytics }) {
  const pace = row.expectedPace;
  const cap = Math.max(pace.maxSec, row.timeSec, 1);
  const youPct = Math.min(100, (row.timeSec / cap) * 100);
  const bandLeft = (pace.minSec / cap) * 100;
  const bandWidth = ((pace.maxSec - pace.minSec) / cap) * 100;
  const label =
    !row.skill ||
    row.skill === "Imported from PDF" ||
    row.skill === "Imported"
      ? row.domain
      : row.skill;

  return (
    <li
      className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[5rem_1fr_7rem_auto]"
      data-item-id={row.itemId}
      data-time-sec={row.timeSec}
      data-excessive={row.excessive ? "1" : "0"}
    >
      <div className="nums text-[13px] text-zinc-400">
        {row.sectionId === "rw" ? "RW" : "M"}
        {row.moduleNum}.{row.numberInModule}
      </div>

      <div className="min-w-0 sm:col-auto">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-[13px] text-zinc-200">{label}</span>
          <span className="text-[11px] uppercase tracking-wide text-zinc-600">
            {pace.profile}
          </span>
          {row.excessive && (
            <span
              className="text-[11px] font-semibold text-amber-200/90"
              data-testid="slow-badge"
              title={row.excessiveReason}
            >
              Over target
            </span>
          )}
        </div>
        <div className="relative mt-2 h-1.5 overflow-hidden rounded-sm bg-white/[0.06]">
          <div
            className="absolute inset-y-0 bg-mint/25"
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            title={`Target ${pace.minSec}–${pace.maxSec}s`}
          />
          <div
            className={`absolute inset-y-0 left-0 ${
              row.excessive ? "bg-amber-300/80" : "bg-mint/70"
            }`}
            style={{ width: `${youPct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-zinc-600">
          Target {pace.minSec}–{pace.maxSec}s
          {pace.note ? ` · ${pace.note}` : ""}
        </p>
      </div>

      <div className="hidden text-right sm:block">
        {row.pretest ? (
          <span className="text-[12px] text-zinc-600">—</span>
        ) : row.correct === true ? (
          <span className="text-[12px] text-mint">Correct</span>
        ) : row.response ? (
          <span className="text-[12px] text-rose-300/80">Incorrect</span>
        ) : (
          <span className="text-[12px] text-zinc-500">Blank</span>
        )}
      </div>

      <div className="nums text-right text-[14px] font-semibold tabular-nums text-white">
        {formatTime(row.timeSec)}
      </div>
    </li>
  );
}

function MissedSection({
  form,
  missed,
  itemById,
  responses,
}: {
  form: TestForm;
  missed: ItemAnalytics[];
  itemById: Map<string, Item>;
  responses: Record<string, string>;
}) {
  return (
    <div className="mt-4">
      <p className="nums mb-3 text-[12px] text-zinc-500">
        Try each again before opening the explanation.
      </p>
      {form.sections.map((s) => {
        const group = missed.filter((i) => i.sectionId === s.id);
        if (group.length === 0) return null;
        return (
          <div key={s.id} className="mt-5">
            <h3 className="text-[12px] font-semibold text-zinc-300">
              {s.name}
              <span className="nums ml-2 font-normal text-zinc-600">
                {group.length}
              </span>
            </h3>
            <div className="mt-1">
              {group.map((row) => {
                const item = itemById.get(row.itemId);
                if (!item) return null;
                return (
                  <MissedItem
                    key={row.itemId}
                    item={item}
                    response={responses[row.itemId]}
                    timeSec={row.timeSec}
                    excessive={row.excessive}
                    paceLabel={`${row.expectedPace.minSec}–${row.expectedPace.maxSec}s`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MissedItem({
  item,
  response,
  timeSec,
  excessive,
  paceLabel,
}: {
  item: Item;
  response: string | undefined;
  timeSec: number;
  excessive: boolean;
  paceLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const answer = isSpr(item) ? item.accepted[0] : item.correct;
  const label =
    !item.skill ||
    item.skill === "Imported from PDF" ||
    item.skill === "Imported"
      ? item.domain
      : item.skill;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-baseline gap-4 border-b border-white/[0.07] py-3.5 text-left transition hover:bg-white/[0.02]"
      >
        <span className="flex-1 text-sm text-zinc-200">{label}</span>
        {excessive && (
          <span className="text-[11px] font-semibold text-amber-200/90">
            Over target
          </span>
        )}
        <span className="nums flex-shrink-0 text-[12px] text-zinc-600">
          {formatTime(timeSec)}
          <span className="text-zinc-700"> / {paceLabel}</span>
        </span>
        <span className="nums flex-shrink-0 text-[12px] text-zinc-500">
          you: {response || "blank"} · key: {answer}
        </span>
      </button>

      {open && (
        <div className="border-b border-white/[0.07] py-5">
          {item.stimulus && (
            <RichBlock
              html={item.html}
              content={item.stimulus}
              className="mb-4 max-w-[70ch] text-[14px] leading-relaxed text-zinc-400"
            />
          )}
          <RichBlock
            html={item.html}
            content={item.stem}
            className="max-w-[70ch] text-[14px] font-medium leading-relaxed text-zinc-200"
          />
          {item.solutions && item.solutions.length > 0 ? (
            <SolutionTabs solutions={item.solutions} />
          ) : (
            <RichBlock
              html={item.html}
              content={item.rationale}
              className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-zinc-400"
            />
          )}
        </div>
      )}
    </div>
  );
}

function RichBlock({
  html,
  content,
  className,
}: {
  html?: boolean;
  content: string;
  className?: string;
}) {
  if (html) {
    return (
      <div
        className={`${className ?? ""} [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:my-2 [&_td]:border [&_td]:border-white/15 [&_td]:px-2 [&_td]:py-1 [&_img]:my-2 [&_img]:mx-auto [&_img]:block [&_img]:max-h-[min(320px,50vh)] [&_img]:max-w-full [&_img]:rounded-md [&_img]:bg-white [&_img]:p-1.5`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <p className={className}>{content}</p>;
}

function SolutionTabs({ solutions }: { solutions: SolutionPath[] }) {
  const [active, setActive] = useState(0);
  const fastest = solutions.reduce(
    (best, s, i) => (s.seconds < solutions[best].seconds ? i : best),
    0
  );
  const path = solutions[active];

  return (
    <div className="mt-5 max-w-[70ch]">
      <div className="flex flex-wrap gap-x-5 border-b border-white/[0.14]">
        {solutions.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 pb-2 text-[13px] transition ${
              i === active
                ? "border-mint font-semibold text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {s.label}
            <span className="nums ml-2 text-[11px] text-zinc-600">
              ~{s.seconds}s
            </span>
            {i === fastest && (
              <span className="ml-2 text-[11px] font-semibold text-mint">
                fastest
              </span>
            )}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-2">
        {path.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
            <span className="nums w-4 flex-shrink-0 text-zinc-600">{i + 1}</span>
            <span className="text-zinc-300">{step}</span>
          </li>
        ))}
      </ol>

      {path.desmosExpressions && (
        <div className="mt-4">
          <div className="text-[12px] text-zinc-500">Type into Desmos</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {path.desmosExpressions.map((e) => (
              <code
                key={e}
                className="rounded border border-white/12 bg-white/[0.03] px-2 py-1 font-mono text-[13px] text-mint"
              >
                {e}
              </code>
            ))}
          </div>
        </div>
      )}

      {path.whenToUse && (
        <p className="mt-4 max-w-[62ch] border-l-2 border-white/15 pl-3 text-[13px] leading-relaxed text-zinc-400">
          {path.whenToUse}
        </p>
      )}
    </div>
  );
}
