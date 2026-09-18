// Guards against the unit list and the declared unit count drifting apart.
//   node --experimental-strip-types scripts/check-ap-units.ts
import { AP_SUBJECTS } from "../lib/apSubjects.ts";
import { AP_UNITS, NEEDS_CHECK } from "../lib/apContent.ts";

let bad = 0;
const missing: string[] = [];

for (const s of AP_SUBJECTS) {
  const units = AP_UNITS[s.slug];
  if (!units) {
    missing.push(s.slug);
    continue;
  }
  if (units.length !== s.units) {
    console.log(
      `MISMATCH ${s.slug.padEnd(26)} declared ${s.units}, listed ${units.length}`
    );
    bad++;
  }
}

console.log(`subjects:          ${AP_SUBJECTS.length}`);
console.log(`with unit titles:  ${AP_SUBJECTS.length - missing.length}`);
console.log(`needs CED check:   ${NEEDS_CHECK.size}`);
if (missing.length) console.log(`MISSING: ${missing.join(", ")}`);
console.log(bad || missing.length ? "\nFAIL" : "\nOK, all counts line up");
process.exit(bad || missing.length ? 1 : 0);
