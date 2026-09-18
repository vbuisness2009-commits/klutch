#!/usr/bin/env node
// ────────────────────────────────────────────────────────────────────────────
// Zenith Prep — SAT PDF generator
//   Reads a Bluebook-format SAT test JSON and produces a fully Zenith-branded,
//   watermarked practice PDF. Uses Puppeteer + local Chrome to render.
//
// Usage:
//   node sat-pdf-gen/generate.mjs <input.json> [--out path.pdf] [--label "Test #1"]
//
// Example:
//   npm run gen:sat -- ~/Downloads/1.json --label "Zenith SAT Practice #1"
// ────────────────────────────────────────────────────────────────────────────

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import {
  BRAND,
  FONT_STACK,
  baseStyles,
  klutchLogoSvg,
  pageHeaderTemplate,
  pageFooterTemplate,
} from "../lib/pdf/brand.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--label") args.label = argv[++i];
    else if (a === "--html") args.htmlOut = argv[++i];
    else if (a === "--no-answers") args.noAnswers = true;
    else args.positional.push(a);
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error(`
Klutch · SAT PDF generator
Usage: node sat-pdf-gen/generate.mjs <input.json> [options]

Options:
  --out <path>     Output PDF path (default: sat-pdf-gen/out/<name>.pdf)
  --label <text>   Test label shown on the cover (default: derived from filename)
  --html <path>    Also dump the intermediate HTML for debugging
  --no-answers     Do not include answer keys / rationales even if present
`);
    process.exit(1);
  }
  const args = parseArgs(argv);
  const inputPath = resolve(args.positional[0]);
  if (!existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }

  const outDir = resolve(__dirname, "out");
  await mkdir(outDir, { recursive: true });
  const outPdf = args.out
    ? resolve(args.out)
    : resolve(outDir, basename(inputPath).replace(/\.json$/i, "") + ".pdf");
  const label = args.label || deriveLabelFromFilename(inputPath);

  console.log(`\n🔥  Klutch — SAT PDF generator`);
  console.log(`   input:  ${inputPath}`);
  console.log(`   label:  ${label}`);
  console.log(`   output: ${outPdf}\n`);

  console.log("→ Parsing JSON…");
  const raw = await readFile(inputPath, "utf8");
  const data = JSON.parse(raw);

  console.log("→ Grouping questions into sections…");
  const sections = groupIntoSections(data.questions || []);
  const totalQ = sections.reduce((n, s) => n + s.questions.length, 0);
  console.log(`   ${sections.length} sections · ${totalQ} questions`);

  console.log("→ Building HTML…");
  const html = buildHtml({
    label,
    sections,
    testId: data.session_id || data.package?.id || "unknown",
    showAnswers: !args.noAnswers,
  });

  if (args.htmlOut) {
    await writeFile(resolve(args.htmlOut), html, "utf8");
    console.log(`   HTML dumped to ${args.htmlOut}`);
  }

  console.log("→ Launching Chrome…");
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });

    console.log("→ Loading HTML…");
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 90000 });

    console.log("→ Waiting for MathJax…");
    try {
      await page.waitForFunction(
        () => window.MathJax && window.MathJax.typesetPromise,
        { timeout: 45000 }
      );
      await page.evaluate(async () => {
        try {
          await window.MathJax.typesetPromise();
        } catch (e) {
          console.warn("MathJax typeset error:", e && e.message);
        }
      });
    } catch (e) {
      console.log(`   (skipped — no math or MathJax timed out: ${e.message})`);
    }

    // let images / fonts settle
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((r) => {
            img.onload = img.onerror = r;
            setTimeout(r, 3000);
          });
        })
      );
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch {}
      }
    });
    await new Promise((r) => setTimeout(r, 500));

    console.log("→ Rendering PDF…");
    await page.pdf({
      path: outPdf,
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: pageHeaderTemplate({ testName: label }),
      footerTemplate: pageFooterTemplate(),
      // 0.9in top gives the header strip enough room to sit up top with a
      // visual buffer between it and the first question card, so the "Q N"
      // badge on page-break cards never gets clipped.
      margin: { top: "0.9in", bottom: "0.9in", left: "0.55in", right: "0.55in" },
    });
    console.log(`✅ Done → ${outPdf}`);
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────
// Chrome discovery — try common macOS + Linux paths
// ─────────────────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error(
    "Could not find a Chrome/Chromium executable. Install Chrome or point to it manually."
  );
}

// ─────────────────────────────────────────────────────────────
// Section grouping — handles both populated and empty section_name.
// Detects the standard SAT structure by falling back to question_number
// resetting to "1" as a section boundary.
// ─────────────────────────────────────────────────────────────
function groupIntoSections(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const hasNames = questions.some(
    (q) => q.section_name && q.section_name.trim().length > 0
  );
  if (hasNames) {
    const map = new Map();
    for (const q of questions) {
      const name = q.section_name || "Untitled section";
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(q);
    }
    // Sort into natural SAT order: RW Mod 1 → RW Mod 2 → Math Mod 1 → Math Mod 2,
    // then anything else after.
    const sortKey = (name) => {
      const isRW = /reading|writing/i.test(name) ? 0 : 1;
      const modMatch = name.match(/module\s*(\d+)/i);
      const modNum = modMatch ? parseInt(modMatch[1], 10) : 99;
      const isMath = /math/i.test(name) ? 1 : 0;
      const section = isRW === 0 ? 0 : isMath ? 1 : 2;
      return section * 100 + modNum;
    };
    const entries = [...map.entries()].sort(
      ([a], [b]) => sortKey(a) - sortKey(b)
    );
    return entries.map(([name, qs], i) => ({
      name,
      index: i,
      questions: qs,
    }));
  }

  // Infer by question_number resets. Group starts whenever question_number == 1
  // after having seen a higher number.
  const sections = [];
  let current = null;
  let lastNum = 0;
  const fallbackNames = [
    "Reading & Writing — Module 1",
    "Reading & Writing — Module 2",
    "Math — Module 1",
    "Math — Module 2",
  ];
  for (const q of questions) {
    const n = parseInt(q.question_number || "0", 10) || 0;
    if (!current || (n === 1 && lastNum > 1)) {
      current = {
        name: fallbackNames[sections.length] || `Section ${sections.length + 1}`,
        index: sections.length,
        questions: [],
      };
      sections.push(current);
    }
    current.questions.push(q);
    lastNum = n;
  }

  // If we ended up with a single un-split "section" it likely represents a
  // question-bank / variant-pool export rather than a linear test. Relabel it.
  if (sections.length === 1) {
    sections[0].name = "Practice question bank";
  }
  return sections;
}

function deriveLabelFromFilename(p) {
  const b = basename(p).replace(/\.json$/i, "");
  const cleaned = b
    .replace(/^bluebook_/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase());
  if (/^[0-9a-f-]{8,}/i.test(cleaned)) {
    return "SAT — Past Administration";
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────
// HTML rendering
// ─────────────────────────────────────────────────────────────
function buildHtml({ label, sections, testId, showAnswers }) {
  // Watermark text is brand-forward (Klutch), not test-specific. The test label
  // still runs in the header/footer templates for traceability.
  const wmText = `KLUTCH · BE KLUTCH`;
  const totalQ = sections.reduce((n, s) => n + s.questions.length, 0);
  const totalPages = "~" + Math.max(1, Math.ceil(totalQ / 3));

  const mathJaxConfig = `
    window.MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$','$$'], ['\\\\[','\\\\]']] },
      svg: { fontCache: 'global' },
      startup: { typeset: true }
    };
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(label)} — Klutch</title>
  <script>${mathJaxConfig}</script>
  <script async src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script async id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <link rel="preconnect" href="https://rsms.me/">
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
  <style>
    ${baseStyles({ watermarkText: wmText })}
  </style>
</head>
<body>
  ${renderCover({ label, totalQ, sections, testId })}
  ${sections.map((s, i) => renderSection({ s, sectionIndex: i, sectionCount: sections.length, showAnswers, wmText })).join("\n")}
</body>
</html>`;
}

function renderCover({ label, totalQ, sections, testId }) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const c = BRAND.colors;
  return `
  <section class="cover">
    <div class="accent-line a"></div>
    <div class="accent-line b"></div>

    <div class="cover-mark">${klutchLogoSvg({ size: 96 })}</div>
    <div class="brand-word">KLUTCH</div>
    <div class="kicker">— Real past SAT —</div>

    <h1 style="margin-top:24px;">
      <span class="accent">${escapeHtml(label)}</span>
    </h1>
    <p class="sub">
      An actual past digital SAT administration &mdash; not a simulation.
      Take it in a quiet 2-hour block, then come back and drill your weakest
      topics on the Klutch dashboard. Be klutch when it counts.
    </p>
    <div class="meta-pill"><span class="dot"></span> ${sections.length} ${sections.length === 1 ? "section" : "sections"} · ${totalQ} questions</div>

    <div class="meta-row">
      <span>${escapeHtml(BRAND.domain)}</span>
      <span>${now}</span>
      <span>Test&nbsp;ID · ${escapeHtml(String(testId).slice(0, 8))}</span>
    </div>
  </section>`;
}

function renderSection({ s, sectionIndex, sectionCount, showAnswers, wmText }) {
  const isMath = /math/i.test(s.name);
  const isRW = /reading|writing/i.test(s.name);
  const label =
    isMath
      ? "Math"
      : isRW
      ? "Reading & Writing"
      : `Section ${sectionIndex + 1}`;
  const time = isMath ? "35 minutes" : isRW ? "32 minutes" : "";
  return `
  <section class="section-title">
    <div class="eyebrow">Section ${sectionIndex + 1} of ${sectionCount} · ${escapeHtml(label)}</div>
    <h2>${escapeHtml(s.name)}</h2>
    <div class="meta">
      <span class="k">${s.questions.length} questions</span>
      ${time ? `<span>· ${time}</span>` : ""}
      <span>· No penalty for wrong answers</span>
    </div>
  </section>
  <div style="padding: 22px 0.05in 4px 0.05in;">
    <div class="sec-bar"><span class="dot"></span> KLUTCH · Real past SAT · Do not distribute <span class="dot"></span></div>
  </div>
  ${s.questions.map((q, i) => renderQuestion({ q, num: i + 1, showAnswers, wmText })).join("\n")}
  `;
}

function renderQuestion({ q, num, showAnswers, wmText }) {
  const diff = normalizeDifficulty(q.difficulty);
  const diffClass =
    diff === "E" ? "easy" : diff === "M" ? "med" : diff === "H" ? "hard" : "";
  const diffLabel =
    diff === "E" ? "Easy" : diff === "M" ? "Medium" : diff === "H" ? "Hard" : "";

  const options = Array.isArray(q.answer_options) ? q.answer_options : [];
  const correctSet = normalizeCorrect(q.correct_answer);
  const wmSlots = renderWatermarkSlots(q.question_id || String(num), wmText);

  return `
  <article class="q-card">
    <div class="wm-layer">${wmSlots}</div>
    <div class="q-header">
      <div class="q-num"><span class="q-badge">${num}</span> Question</div>
      ${diffLabel ? `<span class="diff ${diffClass}">${diffLabel}</span>` : ""}
    </div>
    <div class="q-body">
      ${q.stimulus ? `<div class="q-stimulus">${sanitizeInline(q.stimulus)}</div>` : ""}
      ${q.stem ? `<div class="q-stem">${sanitizeInline(q.stem)}</div>` : ""}
      ${
        options.length > 0
          ? `<div class="choices">${options
              .map((opt, i) => renderChoice(opt, i, correctSet, showAnswers))
              .join("")}</div>`
          : `<div class="free-response">Free response — show your work in the space below.</div>`
      }
      ${
        showAnswers && correctSet.size > 0 && options.length === 0
          ? `<div class="answer-key"><div class="label">Correct answer</div><div class="val">${escapeHtml(
              [...correctSet].join(", ")
            )}</div></div>`
          : ""
      }
      ${
        showAnswers && q.rationale
          ? `<div class="rationale"><div class="label">Explanation</div>${sanitizeInline(q.rationale)}</div>`
          : ""
      }
    </div>
  </article>`;
}

function renderChoice(opt, i, correctSet, showAnswers) {
  const letter = String.fromCharCode(65 + i);
  const isCorrect = showAnswers && correctSet.has(letter);
  return `<div class="choice${isCorrect ? " correct" : ""}">
    <span class="letter">${letter}</span>
    <div class="choice-text">${sanitizeInline(opt.content || "")}</div>
  </div>`;
}

// Deterministic pseudo-random watermark scatter, seeded by question id
function renderWatermarkSlots(seedStr, wmText) {
  const seed = [...seedStr].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rnd = (i, min, max) => {
    const x = Math.sin(seed + i * 13.37) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  };
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const top = rnd(i, 5, 90);
    const left = rnd(i + 100, 5, 85);
    const rot = rnd(i + 200, -35, -55);
    parts.push(
      `<span class="wm-slot" style="top:${top.toFixed(1)}%;left:${left.toFixed(
        1
      )}%;transform:rotate(${rot.toFixed(1)}deg);">${escapeHtml(wmText)}</span>`
    );
  }
  return parts.join("");
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

// Very lightweight sanitizer: strips <script> tags outright and neutralizes
// on* attributes. Leaves the rich HTML (em/i/table/svg/img/mathml) intact
// since the source JSONs are the College Board's own well-formed content.
function sanitizeInline(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeDifficulty(d) {
  if (!d) return "";
  const s = String(d).toUpperCase();
  if (s.startsWith("E")) return "E";
  if (s.startsWith("M")) return "M";
  if (s.startsWith("H")) return "H";
  return "";
}

function normalizeCorrect(c) {
  const out = new Set();
  if (!c) return out;
  if (Array.isArray(c)) c.forEach((v) => out.add(String(v).trim().toUpperCase()));
  else String(c).split(/[,\s]+/).forEach((v) => v && out.add(v.trim().toUpperCase()));
  return out;
}

// ─────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
