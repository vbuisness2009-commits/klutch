/**
 * Regression checks for PDF→PDF math / figure quality.
 *   node --experimental-strip-types scripts/check-math-extract.ts
 *   node --experimental-strip-types scripts/check-math-extract.ts --write
 *
 * --write repairs content/tests/*.json HTML in place (math mtext, LaTeX/caret
 * → MathML, prose strip, duplicate img collapse) so the player picks up fixes
 * without re-extracting.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  asciiLatexToMathML,
  dedupeConsecutiveImages,
  dedupeImageTags,
  normalizePlainMath,
  repairExtractedQuestions,
  repairHtmlAfterCrops,
  repairHtmlBeforeCrops,
  stripVerbalFigureProse,
} from "../lib/pdf/repairExtracted.ts";

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const IMAGE_TAG_RE = /\[IMAGE:\s*Page\s*(\d+)\s*-\s*(.*?)\]/g;

const VERBAL_RE =
  /The following\s+\d+\s+lines\s+are\s+shown|Falls sharply|Falls gradually|Rises gradually|Rises sharply|Remains level to/i;

function proseOnly(html: string): string {
  // Verbal-graph checks must ignore [IMAGE] descriptions (models often narrate
  // the crop target there) and <img> alt/src.
  return html
    .replace(IMAGE_TAG_RE, " ")
    .replace(/<img\b[^>]*>/gi, " ");
}

function findPlaceholders(text: string) {
  const found = new Map<string, { tag: string; page: number; description: string }>();
  for (const m of text.matchAll(IMAGE_TAG_RE)) {
    const tag = m[0];
    if (!found.has(tag)) {
      found.set(tag, { tag, page: Number(m[1]), description: m[2].trim() });
    }
  }
  return [...found.values()];
}

function countImgs(html: string): number {
  return (html.match(/<img\b/gi) ?? []).length;
}

function consecutiveDupImgs(html: string): number {
  const re =
    /<img\b[^>]*\bsrc\s*=\s*(["'])([^"']*)\1[^>]*>\s*<img\b[^>]*\bsrc\s*=\s*\1\2\1[^>]*>/gi;
  return [...html.matchAll(re)].length;
}

function applyCropsLocal(text: string, crops: Record<string, string>): string {
  let out = text;
  const byPage = new Map<number, string>();
  for (const [tag, dataUrl] of Object.entries(crops)) {
    if (!dataUrl) continue;
    const m = tag.match(/\[IMAGE:\s*Page\s*(\d+)\s*-/i);
    if (m) {
      const page = Number(m[1]);
      if (!byPage.has(page)) byPage.set(page, dataUrl);
    }
    out = out.split(tag).join(`<img src="${dataUrl}" alt="" />`);
  }
  out = out.replace(IMAGE_TAG_RE, (full, pageStr: string) => {
    const dataUrl = byPage.get(Number(pageStr));
    return dataUrl ? `<img src="${dataUrl}" alt="" />` : full;
  });
  out = out.replace(
    /(<img\b[^>]*\bsrc\s*=\s*(["'])([^"']*)\2[^>]*>)(?:\s*<img\b[^>]*\bsrc\s*=\s*\2\3\2[^>]*>)+/gi,
    "$1"
  );
  return out;
}

// ── Unit cases ────────────────────────────────────────────────

{
  const prose = `<p>The following 4 lines are shown:</p><ul><li>A</li><li>B</li></ul>
<p>The CrCoNi initiation toughness line:</p>
<ul><li>Begins at 20 kelvins, 459</li><li>Falls sharply to 77 kelvins, 280</li></ul>
<p>[IMAGE: Page 47 - line graph of fracture toughness vs temperature]</p>
<p>The graph shows fracture toughness.</p>`;
  const fixed = stripVerbalFigureProse(prose);
  check(
    "A: strips verbal graph prose",
    !VERBAL_RE.test(fixed) && /\[IMAGE:/.test(fixed),
    fixed.slice(0, 140)
  );
}

{
  const dup = `<p>[IMAGE: Page 47 - line graph of fracture toughness values for two materials]
[IMAGE: Page 47 - line graph showing fracture toughness vs temperature for two materials]</p>`;
  const fixed = dedupeImageTags(dup);
  check("B: dedupes similar IMAGE tags on same page", findPlaceholders(fixed).length === 1);
}

{
  const imgs = `<img src="data:image/png;base64,AAA" alt="" />
<p><img src="data:image/png;base64,AAA" alt="" /></p>`;
  const fixed = dedupeConsecutiveImages(imgs);
  check(
    "B: dedupes identical <img> across wrapping <p>",
    countImgs(fixed) === 1,
    fixed.replace(/\s+/g, " ").trim()
  );
}

{
  const raw = `<p>If <math>7 + x = 2</math>, what is the value of <math>-21 - 3x</math>?</p>`;
  const fixed = normalizePlainMath(raw);
  check(
    "C: plain <math> becomes <mtext>",
    /<mtext>7 \+ x = 2<\/mtext>/.test(fixed) && /<mtext>-21 - 3x<\/mtext>/.test(fixed)
  );
  const visible = fixed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  check(
    "C: visible text retains equations",
    visible.includes("7 + x = 2") && visible.includes("-21 - 3x"),
    visible
  );
}

{
  const proper = `<math><mi>x</mi><mo>=</mo><mn>2</mn></math>`;
  check("C: proper MathML left intact", normalizePlainMath(proper) === proper);
}

{
  const frac = String.raw`<math>r(x) = \frac{p}{\sqrt{x-4}} + 16</math>`;
  const fixed = normalizePlainMath(frac);
  check(
    "C2: LaTeX frac/sqrt → mfrac/msqrt",
    /<mfrac>/.test(fixed) && /<msqrt>/.test(fixed) && !/\\frac|\\sqrt/.test(fixed),
    fixed.slice(0, 220)
  );
}

{
  const caret = `<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mtext>(x + 4)^2 + (y - 3)^2 = 5</mtext></mrow></math>`;
  const fixed = normalizePlainMath(caret);
  check(
    "C2: ASCII caret → msup (unwraps prior mtext)",
    (fixed.match(/<msup>/g) ?? []).length >= 2 && !/\^[0-9]/.test(fixed.replace(/<[^>]+>/g, "")),
    fixed.slice(0, 220)
  );
}

{
  const ml = asciiLatexToMathML(String.raw`k(x) = x^3 + 1,100`);
  check(
    "C2: x^3 becomes msup",
    /<msup><mi>x<\/mi><mrow><mn>3<\/mn><\/mrow><\/msup>/.test(ml) && !/\^/.test(ml.replace(/<[^>]+>/g, "")),
    ml
  );
}

{
  const tag =
    "[IMAGE: Page 74 - right triangle DEF with angle E as a right angle]";
  const crops = { [tag]: "data:image/png;base64,CROPPED" };
  const fuzzy = applyCropsLocal(
    `<p>[IMAGE: Page 74 - triangle DEF right angle at E]</p>`,
    crops
  );
  check(
    "D: applyCrops fuzzy page match keeps crop",
    fuzzy.includes("data:image/png;base64,CROPPED") && !/\[IMAGE:/.test(fuzzy)
  );
}

// ── last-extract.json ─────────────────────────────────────────

const extractPath = join(process.cwd(), "content/last-extract.json");
if (existsSync(extractPath)) {
  const extract = JSON.parse(readFileSync(extractPath, "utf8")) as {
    questions: Record<string, unknown>[];
  };
  const repaired = repairExtractedQuestions(extract.questions ?? []);
  const math = repaired.filter((q) => /math/i.test(String(q.section ?? "")));

    let verbal = 0;
    let multiTag = 0;
    let plainMath = 0;
    let rawTex = 0;
    let rawCaret = 0;
    for (const q of math) {
      const all = [q.stimulus, q.stem, ...(((q.choices as { content?: string }[]) ?? []).map((c) => c.content))]
        .filter(Boolean)
        .join("\n");
      if (VERBAL_RE.test(proseOnly(all))) verbal++;
      const tags = findPlaceholders(all);
      if (tags.length > 1) {
        const pages = new Set(tags.map((t) => t.page));
        if (pages.size < tags.length) multiTag++;
      }
      for (const m of all.matchAll(/<math[^>]*>([\s\S]*?)<\/math>/gi)) {
        if (m[1].trim() && !/<(mi|mn|mo|mrow|mtext|msup|msub|mfrac)/i.test(m[1])) {
          plainMath++;
        }
      }
      const student = all.replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/gi, "");
      if (/\\(frac|sqrt|cdot|pm)\b/.test(student)) rawTex++;
      if (/\^[0-9{]/.test(student.replace(/<[^>]+>/g, " "))) rawCaret++;
    }

    check("extract: no verbal graph prose in Math", verbal === 0, `verbal=${verbal}`);
    check("extract: no same-page duplicate IMAGE tags", multiTag === 0, `dup=${multiTag}`);
    check("extract: no plain-text <math>", plainMath === 0, `plain=${plainMath}`);
    check("extract: no raw TeX frac/sqrt in student HTML", rawTex === 0, `tex=${rawTex}`);
    check("extract: no bare caret powers in student HTML", rawCaret === 0, `caret=${rawCaret}`);

  // Simulate crops + after-crop repair
  const crops: Record<string, string> = {};
  for (const q of repaired) {
    const blob = [q.stimulus, q.stem, ...(((q.choices as { content?: string }[]) ?? []).map((c) => c.content))]
      .filter(Boolean)
      .join("\n");
    for (const p of findPlaceholders(blob)) {
      crops[p.tag] = `data:image/png;base64,PAGE${p.page}`;
    }
  }

  let itemVerbal = 0;
  let itemDup = 0;
  let itemPlain = 0;
  for (const q of math) {
    let stim = repairHtmlAfterCrops(
      applyCropsLocal(String(q.stimulus ?? ""), crops)
    );
    let stem = repairHtmlAfterCrops(applyCropsLocal(String(q.stem ?? ""), crops));
    const all = stim + "\n" + stem;
    if (VERBAL_RE.test(proseOnly(all))) itemVerbal++;
    if (consecutiveDupImgs(all) > 0) itemDup++;
    for (const m of all.matchAll(/<math[^>]*>([\s\S]*?)<\/math>/gi)) {
      if (m[1].trim() && !/<(mtext|mi|mn|mo|mrow)/i.test(m[1])) itemPlain++;
    }
  }
  check("sim-import: no verbal prose", itemVerbal === 0, `v=${itemVerbal}`);
  check("sim-import: no consecutive dup imgs", itemDup === 0, `d=${itemDup}`);
  check("sim-import: math tokenized", itemPlain === 0, `p=${itemPlain}`);
} else {
  console.log("skip  content/last-extract.json not found");
}

// ── Repair stored tests ───────────────────────────────────────

const write = process.argv.includes("--write");
const testsDir = join(process.cwd(), "content/tests");
if (existsSync(testsDir)) {
  for (const file of readdirSync(testsDir).filter((f) => f.endsWith(".json"))) {
    const path = join(testsDir, file);
    const stored = JSON.parse(readFileSync(path, "utf8")) as {
      form: {
        sections: {
          id: string;
          module1: { items: ItemLike[] };
          module2: { lower: { items: ItemLike[] }; upper: { items: ItemLike[] } };
        }[];
      };
    };

    type ItemLike = {
      stimulus?: string;
      stem: string;
      rationale?: string;
      choices?: { text: string }[];
    };

    let changed = 0;
    for (const section of stored.form.sections) {
      for (const items of [
        section.module1.items,
        section.module2.lower.items,
        section.module2.upper.items,
      ]) {
        for (const it of items) {
          const fix = (s: string | undefined) => {
            if (!s) return s;
            const next = repairHtmlAfterCrops(repairHtmlBeforeCrops(s));
            if (next !== s) changed++;
            return next;
          };
          it.stimulus = fix(it.stimulus);
          it.stem = fix(it.stem) ?? it.stem;
          it.rationale = fix(it.rationale);
          if (it.choices) {
            for (const c of it.choices) {
              c.text = fix(c.text) ?? c.text;
            }
          }
        }
      }
    }

    const math = stored.form.sections.find((s) => s.id === "math");
    if (math) {
      const items = [...math.module1.items, ...math.module2.upper.items];
      let v = 0;
      let d = 0;
      let p = 0;
      let tex = 0;
      let caret = 0;
      for (const it of items) {
        const all = [
          it.stimulus,
          it.stem,
          ...((it.choices ?? []).map((c) => c.text)),
        ]
          .filter(Boolean)
          .join("\n");
        if (VERBAL_RE.test(proseOnly(all))) v++;
        if (consecutiveDupImgs(all) > 0) d++;
        for (const m of all.matchAll(/<math[^>]*>([\s\S]*?)<\/math>/gi)) {
          if (m[1].trim() && !/<(mtext|mi|mn|mo|mrow)/i.test(m[1])) p++;
        }
        const student = all.replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/gi, "");
        if (/\\(frac|sqrt|cdot|pm)\b/.test(student)) tex++;
        if (/\^[0-9{]/.test(student.replace(/<[^>]+>/g, " "))) caret++;
      }
      check(`${file}: no verbal prose`, v === 0, `v=${v}`);
      check(`${file}: no dup imgs`, d === 0, `d=${d}`);
      check(`${file}: math tokenized`, p === 0, `plain=${p}`);
      check(`${file}: no raw TeX`, tex === 0, `tex=${tex}`);
      check(`${file}: no bare carets`, caret === 0, `caret=${caret}`);
    }

    if (write && changed > 0) {
      writeFileSync(path, JSON.stringify(stored));
      console.log(`wrote ${file} (${changed} fields repaired)`);
    } else if (changed > 0) {
      console.log(`note  ${file} has ${changed} fields that need --write`);
    }
  }
}

console.log(
  failures === 0
    ? "\nAll math-extract checks passed."
    : `\n${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
