#!/usr/bin/env node
// Screenshot helper for reviewing the site locally.
//   node sat-pdf-gen/shoot.mjs <path> <outfile> [--width 1280] [--full]
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

function findChrome() {
  for (const p of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ]) if (existsSync(p)) return p;
  throw new Error("No Chrome found");
}

const [path = "/", out = "shot.png"] = process.argv.slice(2);
const wIdx = process.argv.indexOf("--width");
const width = wIdx > -1 ? parseInt(process.argv[wIdx + 1], 10) : 1280;
const full = process.argv.includes("--full");

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
await page.goto(`http://localhost:3100${path}`, {
  waitUntil: "domcontentloaded",
  timeout: 20000,
});
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 600));

// --click "Button label" clicks a button by its visible text before shooting,
// so client-side tab states can be captured.
const cIdx = process.argv.indexOf("--click");
if (cIdx > -1) {
  const label = process.argv[cIdx + 1];
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((el) =>
      el.textContent?.trim().startsWith(t)
    );
    b?.click();
  }, label);
  await new Promise((r) => setTimeout(r, 300));
}
await page.screenshot({ path: resolve(out), fullPage: full });
await browser.close();
console.log(`saved ${out}`);
