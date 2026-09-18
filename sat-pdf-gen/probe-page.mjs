#!/usr/bin/env node
// Probe: for given pages, report per-row mint-pixel counts near the top so we
// can see exactly where the header strip ends and where card content begins.
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const DPI = 100;
function findChrome() {
  for (const p of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ]) if (existsSync(p)) return p;
  throw new Error("No Chrome");
}

const pdfPath = resolve(process.argv[2]);
const pages = (process.argv[3] || "3").split(",").map(Number);
const argFrom = process.argv.indexOf("--from");
const argTo = process.argv.indexOf("--to");
const FROM = argFrom > -1 ? parseInt(process.argv[argFrom + 1], 10) : 0;
const TO = argTo > -1 ? parseInt(process.argv[argTo + 1], 10) : 200;

const work = await mkdtemp(join(tmpdir(), "klutch-probe-"));
try {
  for (const pg of pages) {
    execFileSync("pdftoppm", ["-png", "-r", String(DPI), "-f", String(pg), "-l", String(pg), pdfPath, join(work, `pg${pg}`)], { stdio: "inherit" });
  }
  const files = (await readdir(work)).filter((f) => f.endsWith(".png")).sort();

  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto("about:blank");

  for (const f of files) {
    const bytes = await readFile(join(work, f));
    const dataUrl = "data:image/png;base64," + bytes.toString("base64");
    const rep = await page.evaluate(async (url, FROM, TO) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const rows = [];
      const scanFrom = Math.max(0, FROM);
      const scanTo = Math.min(TO, img.height);
      for (let y = scanFrom; y < scanTo; y++) {
        const d = ctx.getImageData(0, y, img.width, 1).data;
        let mint = 0, nonBg = 0;
        for (let p = 0; p < d.length; p += 4) {
          const r = d[p], g = d[p + 1], b = d[p + 2];
          if (g > 190 && r < 160 && b > 120 && b < 235 && g - r > 70) mint++;
          // page bg is #04040A; anything meaningfully lighter counts
          if (r > 22 || g > 22 || b > 30) nonBg++;
        }
        rows.push({ y, mint, nonBg });
      }
      return { w: img.width, h: img.height, rows };
    }, dataUrl, FROM, TO);

    console.log(`\n=== ${f}  (${rep.w}x${rep.h}) ===`);
    const interesting = rep.rows.filter((r) => r.mint > 0 || r.nonBg > 40);
    for (const r of interesting.slice(0, 60)) {
      console.log(`  y=${String(r.y).padStart(3)}  mint=${String(r.mint).padStart(4)}  nonBg=${String(r.nonBg).padStart(4)}`);
    }
  }
  await browser.close();
} finally {
  await rm(work, { recursive: true, force: true });
}
