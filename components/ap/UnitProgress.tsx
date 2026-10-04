"use client";

import { useEffect, useState } from "react";
import { progressKey, readStore, type SubjectProgress } from "@/lib/apProgress";

/** "6 of 18 done" for a unit row, read from this browser's saved progress. */
export function UnitProgress({ slug, unit, total }: { slug: string; unit: number; total: number }) {
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    const p = readStore<SubjectProgress>(progressKey(slug), {});
    const prefix = `${unit}/`;
    setDone(
      Object.entries(p).filter(
        ([k, r]) => k.startsWith(prefix) && (r.kind === "mcq" || (r.kind === "frq" && r.revealed))
      ).length
    );
  }, [slug, unit]);

  if (!done || !total) return null;
  return (
    <span className="nums text-[12px] text-mint">
      {Math.min(done, total)} of {total} done
    </span>
  );
}
