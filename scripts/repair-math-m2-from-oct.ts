/**
 * Restore International October SAT A Math M2 from the complete extract in
 * .shots/oct.json (last-extract lost pages 97–100 and 113–116).
 */
import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { importExtracted } from "../lib/testEngine/importExtracted.ts";
import type { Item } from "../lib/testEngine/types.ts";

const oct = JSON.parse(readFileSync(".shots/oct.json", "utf8"));
const storedPath = "content/tests/international-october-sat-a.json";
const stored = JSON.parse(readFileSync(storedPath, "utf8"));

copyFileSync(storedPath, `${storedPath}.bak-before-math-m2-fix`);
copyFileSync(
  "content/last-extract.json",
  "content/last-extract.json.bak-before-math-m2-fix"
);

const questions = [...oct.questions] as Record<string, unknown>[];
const rwIdxs: number[] = [];
questions.forEach((q, i) => {
  if (!/math/i.test(String(q.section || ""))) rwIdxs.push(i);
});

let dropAbs = -1;
for (let k = 1; k < rwIdxs.length - 1; k++) {
  const i = rwIdxs[k];
  const prev = questions[rwIdxs[k - 1]];
  const cur = questions[i];
  const next = questions[rwIdxs[k + 1]];
  if (
    Number(prev.number) === 11 &&
    Number(cur.number) === 1 &&
    Number(next.number) === 12 &&
    k > 20
  ) {
    dropAbs = i;
    break;
  }
}
if (dropAbs >= 0) {
  console.log(
    "Dropping spurious RW question at",
    dropAbs,
    questions[dropAbs].number
  );
  questions.splice(dropAbs, 1);
}

const imported = importExtracted(questions as never, {
  id: "international-october-sat-a",
  name: stored.form.name || "International October SAT A",
});

function fp(it: { stem?: string }): string {
  return String(it.stem || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .toLowerCase();
}

function hasImg(it: Item): boolean {
  const blob = [
    it.stimulus,
    it.stem,
    ...(((it as { choices?: { text?: string }[] }).choices || []).map(
      (c) => c.text
    )),
  ]
    .filter(Boolean)
    .join("\n");
  return /data:image|<img\b/i.test(blob);
}

const oldMath = stored.form.sections.find(
  (s: { id: string }) => s.id === "math"
);
const newMath = imported.form.sections.find((s) => s.id === "math")!;
const oldItems: Item[] = [
  ...oldMath.module1.items,
  ...oldMath.module2.upper.items,
];
const oldByFp = new Map(oldItems.map((it) => [fp(it), it]));

let transferred = 0;
let placeholders = 0;
for (const mod of [
  newMath.module1,
  newMath.module2.upper,
  newMath.module2.lower,
]) {
  for (let i = 0; i < mod.items.length; i++) {
    const neu = mod.items[i];
    const old = oldByFp.get(fp(neu));
    if (old && hasImg(old)) {
      const merged = {
        ...neu,
        stimulus: old.stimulus,
        stem: old.stem,
        rationale: old.rationale ?? neu.rationale,
      } as Item;
      if (
        (neu as { format?: string }).format === "mc" &&
        (old as { format?: string; choices?: unknown }).format === "mc"
      ) {
        (merged as { choices?: unknown; correct?: unknown }).choices = (
          old as { choices?: unknown }
        ).choices;
        (merged as { correct?: unknown }).correct =
          (neu as { correct?: unknown }).correct ??
          (old as { correct?: unknown }).correct;
      }
      mod.items[i] = merged;
      transferred++;
    } else if (/\[IMAGE:/i.test([neu.stimulus, neu.stem].join("\n"))) {
      placeholders++;
    }
  }
}

const oldRw = stored.form.sections.find((s: { id: string }) => s.id === "rw");
const newRw = imported.form.sections.find((s) => s.id === "rw")!;
const useOldRw =
  oldRw &&
  oldRw.module1.items.length === 27 &&
  oldRw.module2.upper.items.length === 27;

imported.form.sections = [useOldRw ? oldRw : newRw, newMath];

const nextStored = {
  ...stored,
  scorable: imported.scorable,
  warnings: [
    ...imported.warnings,
    "Math restored from .shots/oct.json complete extract (prior last-extract lost M2 via failed chunks 97–100 and 113–116).",
  ],
  form: imported.form,
};

writeFileSync(storedPath, JSON.stringify(nextStored, null, 2));
writeFileSync(
  "content/last-extract.json",
  JSON.stringify({
    savedAt: new Date().toISOString(),
    pageCount: oct.pageCount ?? 120,
    model: oct.model ?? "restored-from-shots/oct.json",
    questions,
    failures: [],
    restoredFrom: ".shots/oct.json",
    note: "Replaced incomplete extract that failed Pass A pages 97–100 and 113–116.",
  })
);

console.log({
  useOldRw,
  math: `${newMath.module1.items.length}+${newMath.module2.upper.items.length}`,
  rw: `${(useOldRw ? oldRw : newRw).module1.items.length}+${
    (useOldRw ? oldRw : newRw).module2.upper.items.length
  }`,
  transferredCrops: transferred,
  remainingImagePlaceholders: placeholders,
  warnings: imported.warnings,
  questionCount: questions.length,
});
