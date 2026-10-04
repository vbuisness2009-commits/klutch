// Validates content/ap/<slug>/ against lib/apSchema.ts.
//   node --experimental-strip-types scripts/check-ap-content.ts [slug ...]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { AP_SUBJECTS } from "../lib/apSubjects.ts";

const ROOT = join(process.cwd(), "content", "ap");
const TIERS = ["Intro", "Exam level", "Hardest"];
const PORTFOLIO = new Set(["seminar", "research", "studio-art-2d", "studio-art-drawing"]);

const args = process.argv.slice(2);
const slugs = args.length
  ? args
  : existsSync(ROOT)
    ? readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, "meta.json")))
    : [];

let errors = 0;
let warnings = 0;
const err = (s: string, m: string) => (errors++, console.log(`ERROR ${s}: ${m}`));
const warn = (s: string, m: string) => (warnings++, console.log(`warn  ${s}: ${m}`));
const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function load(path: string, slug: string): any {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(slug, `${path}: ${(e as Error).message}`);
    return null;
  }
}

for (const slug of slugs) {
  if (!AP_SUBJECTS.some((s) => s.slug === slug)) err(slug, "unknown slug");
  const dir = join(ROOT, slug);
  const meta = load(join(dir, "meta.json"), slug);
  if (!meta) continue;

  for (const k of ["name", "lastVerified", "overview", "examMode"]) {
    if (!nonEmpty(meta[k])) err(slug, `meta.${k} missing`);
  }
  if (!Array.isArray(meta.sections) || !meta.sections.length) err(slug, "meta.sections empty");
  if (!Array.isArray(meta.units) || !meta.units.length) err(slug, "meta.units empty");
  if (!Array.isArray(meta.skills) || !meta.skills.length) warn(slug, "meta.skills empty");
  if (!nonEmpty(meta.scoring?.summary)) err(slug, "meta.scoring.summary missing");
  if (!Array.isArray(meta.strategy) || meta.strategy.length < 5) warn(slug, "meta.strategy < 5 items");
  if (!Array.isArray(meta.sources) || !meta.sources.length) err(slug, "meta.sources empty");

  const ids = new Set<string>();
  let mcqTotal = 0;
  let frqTotal = 0;
  for (const u of meta.units ?? []) {
    const file = join(dir, `unit-${String(u.number).padStart(2, "0")}.json`);
    if (!existsSync(file)) {
      err(slug, `missing ${file.replace(process.cwd() + "/", "")}`);
      continue;
    }
    const unit = load(file, slug);
    if (!unit) continue;
    const where = `${slug} u${u.number}`;
    if (unit.number !== u.number) err(where, "number mismatch with meta");
    if (unit.title !== u.title) err(where, `title mismatch with meta ("${unit.title}")`);

    const g = unit.guide ?? {};
    if (!nonEmpty(g.summary)) err(where, "guide.summary missing");
    if (!Array.isArray(g.sections) || g.sections.length < 3) err(where, "guide needs >= 3 sections");
    for (const k of ["keyTakeaways", "commonMistakes", "examTips"]) {
      if (!Array.isArray(g[k]) || !g[k].length) err(where, `guide.${k} empty`);
    }
    if (!nonEmpty(g.cramSheet)) err(where, "guide.cramSheet missing");
    const words = (g.sections ?? []).map((s: any) => String(s.body ?? "")).join(" ").split(/\s+/).length;
    if (words < 600) warn(where, `guide is only ~${words} words`);

    if (!Array.isArray(unit.vocab) || unit.vocab.length < 12) warn(where, `vocab has ${unit.vocab?.length ?? 0} terms (want 12+)`);
    for (const v of unit.vocab ?? []) {
      if (!nonEmpty(v.term) || !nonEmpty(v.definition)) err(where, "vocab entry missing term/definition");
    }

    const tierCount: Record<string, number> = { Intro: 0, "Exam level": 0, Hardest: 0 };
    let frqs = 0;
    for (const q of unit.practice ?? []) {
      const qw = `${where} ${q.id}`;
      if (!nonEmpty(q.id)) err(where, "question without id");
      else if (ids.has(q.id)) err(qw, "duplicate id");
      ids.add(q.id);
      if (!TIERS.includes(q.tier)) err(qw, `bad tier "${q.tier}"`);
      if (!nonEmpty(q.topic)) warn(qw, "topic missing");
      if (q.type === "mcq") {
        mcqTotal++;
        if (TIERS.includes(q.tier)) tierCount[q.tier]++;
        if (!nonEmpty(q.stem)) err(qw, "stem missing");
        const cids = (q.choices ?? []).map((c: any) => c.id);
        if (cids.length < 4 || cids.length > 5) err(qw, `has ${cids.length} choices`);
        if (!cids.includes(q.answer)) err(qw, `answer ${q.answer} not among choices`);
        if ((q.choices ?? []).some((c: any) => !nonEmpty(c.text))) err(qw, "empty choice text");
        if (!nonEmpty(q.explanation)) err(qw, "explanation missing");
      } else if (q.type === "frq") {
        frqs++;
        frqTotal++;
        if (!nonEmpty(q.prompt) || !nonEmpty(q.frqType)) err(qw, "frq prompt/frqType missing");
        if (!nonEmpty(q.sampleResponse)) err(qw, "sampleResponse missing");
        const rubricSum = (q.rubric ?? []).reduce((n: number, r: any) => n + (Number(r.points) || 0), 0);
        if (!q.rubric?.length) err(qw, "rubric missing");
        else if (rubricSum !== q.points) err(qw, `rubric sums to ${rubricSum}, points is ${q.points}`);
        if (q.parts?.length) {
          const partSum = q.parts.reduce((n: number, p: any) => n + (Number(p.points) || 0), 0);
          if (partSum !== q.points) err(qw, `parts sum to ${partSum}, points is ${q.points}`);
        }
      } else err(qw, `unknown type "${q.type}"`);
    }
    if (PORTFOLIO.has(slug)) {
      if (frqs < 4) warn(where, `only ${frqs} tasks (want 4+)`);
    } else {
      if (tierCount.Intro < 4 || tierCount["Exam level"] < 6 || tierCount.Hardest < 4) {
        warn(where, `MCQ tiers ${JSON.stringify(tierCount)} (want 4/6/4)`);
      }
      if (frqs < 1) warn(where, "no FRQ");
    }
    for (const v of unit.videos ?? []) {
      if (!/^https:\/\//.test(v.url ?? "")) err(where, `bad video url ${v.url}`);
    }
  }
  console.log(`${slug.padEnd(26)} units ${String(meta.units?.length ?? 0).padStart(2)}  mcq ${String(mcqTotal).padStart(4)}  frq ${String(frqTotal).padStart(3)}`);
}

console.log(`\n${slugs.length} subjects, ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
