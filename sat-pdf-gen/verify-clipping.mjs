#!/usr/bin/env node
// ────────────────────────────────────────────────────────────────────────────
// Clipping verifier.
//
// Renders every page of a generated PDF to PNG at exactly 100 DPI (so 1in =
// 100px) and scans the first N pixel rows of the content area for "mint"
// pixels. A question card's header carries a mint badge and a mint left
// stripe, so if mint shows up flush against the top of the content area it
// means a card is butted into (or clipped by) the running header strip.
//
// Usage:
//   node sat-pdf-gen/verify-clipping.mjs <pdf> --top-margin-in 1.0
// ────────────────────────────────────────────────────────────────────────────

import { readdir, mkdtemp, rm, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const DPI = 100; // 1 inch === 100 pixels, keeps the margin math trivial

// A question card's header is ~48px tall at 100dpi and always carries a mint
// left stripe, so every row of it has >= 3 mint pixels. If a card sits at the
// top of a page and its mint run is materially shorter than that, the header
// got clipped by the running-header overlay.
const HEADER_RUN_MIN = 40; // px — a healthy card header mint run
const TOP_CARD_WINDOW = 70; // px below content top that counts as "card at page top"
const SCAN_DEPTH = 240; // how far down to look for the first card

function findChrome() {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  for (const p of paths) if (existsSync(p)) return p;
  throw new Error("No Chrome found");
}

function parseArgs(argv) {
  const args = { topMarginIn: 1.0 };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--top-margin-in") args.topMarginIn = parseFloat(argv[++i]);
    else pos.push(argv[i]);
  }
  args.pdf = pos[0];
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.pdf) {
  console.error("usage: verify-clipping.mjs <pdf> [--top-margin-in 1.0]");
  process.exit(1);
}
const pdfPath = resolve(args.pdf);
const contentTop = Math.round(args.topMarginIn * DPI);

console.log(`\n🔎 Clipping verifier`);
console.log(`   pdf:          ${pdfPath}`);
console.log(`   top margin:   ${args.topMarginIn}in  → content starts at y=${contentTop}px @ ${DPI}dpi`);
console.log(`   rule:         card header mint run must be >= ${HEADER_RUN_MIN}px\n`);

const work = await mkdtemp(join(tmpdir(), "klutch-verify-"));
try {
  console.log("→ Rasterizing all pages…");
  execFileSync("pdftoppm", ["-png", "-r", String(DPI), pdfPath, join(work, "p")], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const files = (await readdir(work)).filter((f) => f.endsWith(".png")).sort();
  console.log(`   ${files.length} pages\n`);

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    args: ["--no-sandbox", "--allow-file-access-from-files"],
  });
  const page = await browser.newPage();
  await page.goto("about:blank");

  const offenders = [];
  const fragments = [];
  const tally = {};
  for (let i = 0; i < files.length; i++) {
    const pageNum = i + 1;
    const bytes = await readFile(join(work, files[i]));
    const fileUrl = "data:image/png;base64," + bytes.toString("base64");
    const result = await page.evaluate(
      async (url, top, depth, window_, runMin) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const bottom = Math.min(top + depth, img.height);
        const mintPerRow = [];
        for (let y = top; y < bottom; y++) {
          const d = ctx.getImageData(0, y, img.width, 1).data;
          let m = 0;
          for (let p = 0; p < d.length; p += 4) {
            const r = d[p], g = d[p + 1], b = d[p + 2];
            // Klutch mint family: #3DFFC1 → #00E89B. Strong green, low red.
            if (g > 190 && r < 160 && b > 120 && b < 235 && g - r > 70) m++;
          }
          mintPerRow.push(m);
        }

        // Substantial content sitting right at the content top.
        let topInk = 0;
        for (let y = top; y < Math.min(top + 6, img.height); y++) {
          const d = ctx.getImageData(0, y, img.width, 1).data;
          for (let p = 0; p < d.length; p += 4) {
            if (d[p] > 22 || d[p + 1] > 22 || d[p + 2] > 30) topInk++;
          }
        }

        // First row carrying the card header's mint left stripe.
        const firstIdx = mintPerRow.findIndex((m) => m >= 3);
        if (firstIdx === -1) {
          // No mint header anywhere near the top. If there's still real content
          // jammed at the content top, this page is a split-card fragment.
          return topInk > 600 ? { kind: "fragment", topInk } : { kind: "no-card" };
        }
        if (firstIdx > window_) return { kind: "not-at-top", offset: firstIdx };

        let run = 0;
        for (let i = firstIdx; i < mintPerRow.length && mintPerRow[i] >= 3; i++) run++;
        return {
          kind: run < runMin ? "clipped" : "ok",
          offset: firstIdx,
          run,
        };
      },
      fileUrl,
      contentTop,
      SCAN_DEPTH,
      TOP_CARD_WINDOW,
      HEADER_RUN_MIN
    );
    tally[result.kind] = (tally[result.kind] || 0) + 1;
    if (result.kind === "clipped") {
      offenders.push({ pageNum, offset: result.offset, run: result.run });
    } else if (result.kind === "fragment") {
      fragments.push({ pageNum, topInk: result.topInk });
    }
  }

  await browser.close();

  console.log("   page breakdown:");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${k.padEnd(12)} ${v}`);
  }
  console.log("");

  if (fragments.length) {
    console.log(`⚠️  ${fragments.length} page(s) look like split-card fragments: ${fragments.map((f) => f.pageNum).join(", ")}\n`);
  }

  if (offenders.length === 0) {
    console.log(`✅ PASS — 0 of ${files.length} pages have a clipped question header.\n`);
    process.exit(fragments.length ? 3 : 0);
  } else {
    console.log(`❌ FAIL — ${offenders.length} of ${files.length} pages have a clipped question header:\n`);
    for (const o of offenders) {
      console.log(
        `   page ${String(o.pageNum).padStart(3)} — header mint run ${o.run}px (expected >= ${HEADER_RUN_MIN}px), starts +${o.offset}px below content top`
      );
    }
    console.log("");
    process.exit(2);
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
