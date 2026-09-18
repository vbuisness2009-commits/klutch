"use client";

import { useState } from "react";
import {
  CONTENT_LABELS,
  CONTENT_ORDER,
  DIFFICULTIES,
  type ContentKind,
  type Coverage,
} from "@/lib/apContent";

type Props = {
  units: string[];
  coverage: Coverage;
};

/**
 * Backendless preview of a subject. Every tab renders against the real unit
 * list so the layout is accurate, and shows an empty slot wherever content
 * hasn't been loaded. Wiring this up later means filling the coverage counts,
 * not rebuilding the views.
 */
export function SubjectTabs({ units, coverage }: Props) {
  const [tab, setTab] = useState<ContentKind>("guides");

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-white/[0.14]">
        {CONTENT_ORDER.map((k) => {
          const active = k === tab;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-current={active ? "true" : undefined}
              className={`-mb-px border-b-2 pb-2.5 text-sm transition ${
                active
                  ? "border-mint font-semibold text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {CONTENT_LABELS[k]}
              {coverage[k] > 0 && (
                <span className="nums ml-2 text-[12px] text-mint">
                  {coverage[k]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "exams" ? (
          <ExamsView count={coverage.exams} />
        ) : (
          <UnitView kind={tab} units={units} />
        )}
      </div>
    </div>
  );
}

function UnitView({ kind, units }: { kind: ContentKind; units: string[] }) {
  return (
    <>
      <p className="max-w-[60ch] text-[13px] leading-relaxed text-zinc-500">
        {blurb[kind]}
      </p>
      <ol className="mt-5 max-w-3xl">
        {units.map((title, i) => (
          <li
            key={i}
            className="flex items-baseline gap-4 border-b border-white/[0.07] py-3"
          >
            <span className="nums w-6 flex-shrink-0 text-[13px] text-zinc-600">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-zinc-200">{title}</span>

            {kind === "practice" ? (
              <span className="flex flex-shrink-0 gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <span
                    key={d}
                    className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-600"
                  >
                    {d}
                  </span>
                ))}
              </span>
            ) : (
              <span className="flex-shrink-0 text-[12px] text-zinc-600">
                {emptyLabel[kind]}
              </span>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

function ExamsView({ count }: { count: number }) {
  if (count > 0) return null;
  return (
    <div className="max-w-3xl">
      <p className="max-w-[60ch] text-[13px] leading-relaxed text-zinc-500">
        {blurb.exams}
      </p>
      <div className="panel mt-5 p-6">
        <p className="text-sm text-zinc-300">
          No released papers loaded for this subject yet.
        </p>
        <p className="mt-1.5 max-w-[56ch] text-[13px] leading-relaxed text-zinc-500">
          They go through the same parser as the SAT archive, so when one lands
          it arrives timed, scored, and printable.
        </p>
      </div>
    </div>
  );
}

const blurb: Record<ContentKind, string> = {
  guides:
    "One walkthrough per unit, written to be read the night before rather than across a semester.",
  practice:
    "Problems graded into three tiers per unit, so you can warm up or go straight at the hard end.",
  vocab:
    "The terms each unit assumes you already know, with the definition the exam rewards.",
  videos:
    "A linked explanation per unit. We point at the best one rather than re-recording a worse one.",
  exams:
    "Released papers for this subject, handled the same way as the SAT archive.",
};

const emptyLabel: Record<ContentKind, string> = {
  guides: "No guide yet",
  practice: "",
  vocab: "No terms yet",
  videos: "No link yet",
  exams: "",
};
