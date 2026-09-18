// Sanity checks on the IRT scorer.
//   node --experimental-strip-types scripts/check-scoring.ts
import { PRACTICE_FORM_A } from "../lib/testEngine/practiceFormA.ts";
import { estimateAbility, scaleScore, scoreTest } from "../lib/testEngine/scoring.ts";
import { isSpr, scoredItems, type Item } from "../lib/testEngine/types.ts";

const rw = PRACTICE_FORM_A.sections[0];
const items = scoredItems([...rw.module1.items, ...rw.module2.upper.items]);

const right = (i: Item) => (isSpr(i) ? i.accepted[0] : i.correct);
const wrong = (i: Item) => (isSpr(i) ? "999999" : i.correct === "A" ? "B" : "A");

function responses(pick: (i: Item, idx: number) => boolean) {
  const out: Record<string, string> = {};
  items.forEach((i, idx) => {
    out[i.id] = pick(i, idx) ? right(i) : wrong(i);
  });
  return out;
}

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  console.log(`${ok ? "pass" : "FAIL"}  ${label.padEnd(46)} ${detail}`);
  if (!ok) failures++;
};

// 1. Monotonic: more correct must never score lower.
const scores: number[] = [];
for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
  const n = Math.round(items.length * frac);
  const a = estimateAbility(items, responses((_i, idx) => idx < n));
  scores.push(scaleScore(a.theta, rw));
}
check(
  "score increases with number correct",
  scores.every((s, i) => i === 0 || s >= scores[i - 1]),
  scores.join(" -> ")
);

// 2. Bounded and on the 10-point grid.
check(
  "scores stay in 200 to 800 on a 10-point grid",
  scores.every((s) => s >= 200 && s <= 800 && s % 10 === 0),
  `min ${Math.min(...scores)}, max ${Math.max(...scores)}`
);

// 3. Routing carries a real ceiling. A flawless paper on the easier module 2
//    must score below a flawless paper on the harder one, because easy items
//    cannot supply evidence of top-end ability. This is the behavior College
//    Board describes, and the reason module 1 matters so much.
function perfectOn(route: "lower" | "upper") {
  const set = scoredItems([...rw.module1.items, ...rw.module2[route].items]);
  const answers: Record<string, string> = {};
  for (const i of set) answers[i.id] = right(i);
  return scaleScore(estimateAbility(set, answers).theta, rw);
}
const upperCeiling = perfectOn("upper");
const lowerCeiling = perfectOn("lower");
check(
  "easier module 2 caps below the harder one",
  lowerCeiling < upperCeiling,
  `lower ${lowerCeiling} < upper ${upperCeiling}`
);

// 4. The flip side, and a real feature: acing hard items while missing easy
//    ones is an inconsistent pattern and should not score well. This is the
//    "careless, not incapable" signature.
const hardSet = new Set(items.filter((i) => i.difficulty === "H").map((i) => i.id));
const easySet = new Set(items.filter((i) => i.difficulty === "E").map((i) => i.id));
const aberrant = scaleScore(estimateAbility(items, responses((i) => hardSet.has(i.id))).theta, rw);
const consistent = scaleScore(estimateAbility(items, responses((i) => easySet.has(i.id))).theta, rw);
check(
  "aberrant pattern scores below a consistent one",
  aberrant < consistent,
  `hard-only ${aberrant} < easy-only ${consistent}`
);

// 4. Standard error should shrink as evidence accumulates.
const fewItems = items.slice(0, 6);
const seFew = estimateAbility(fewItems, responses(() => true)).se;
const seAll = estimateAbility(items, responses(() => true)).se;
check("standard error shrinks with more items", seAll < seFew, `${seFew.toFixed(2)} -> ${seAll.toFixed(2)}`);

// 5. Whole-test scoring stays inside the reported band.
const all: Record<string, string> = {};
for (const s of PRACTICE_FORM_A.sections) {
  for (const i of [...s.module1.items, ...s.module2.upper.items]) all[i.id] = right(i);
}
const perfect = scoreTest(PRACTICE_FORM_A, { rw: "upper", math: "upper" }, all);
check(
  "total score is within 400 to 1600",
  perfect.total >= 400 && perfect.total <= 1600,
  `all correct = ${perfect.total} +/- ${perfect.totalMargin}`
);

// 6. A student who answers every question correctly expects 1600. Estimator
//    shrinkage must not quietly cap a perfect paper below the top of the scale.
check(
  "a perfect paper scores 1600",
  perfect.total === 1600,
  `all correct = ${perfect.total}`
);

const nothing: Record<string, string> = {};
for (const s of PRACTICE_FORM_A.sections) {
  for (const i of [...s.module1.items, ...s.module2.lower.items]) nothing[i.id] = wrong(i);
}
const floor = scoreTest(PRACTICE_FORM_A, { rw: "lower", math: "lower" }, nothing);
check("an empty paper scores 400", floor.total === 400, `all wrong = ${floor.total}`);

console.log(failures ? `\n${failures} FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
