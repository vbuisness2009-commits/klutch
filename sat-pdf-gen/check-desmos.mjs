#!/usr/bin/env node
// Drives the player to the Math section, opens the calculator, and verifies
// that the corner handle resizes it and the title bar moves it.
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

function findChrome() {
  for (const p of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ]) if (existsSync(p)) return p;
  throw new Error("No Chrome");
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });

const click = async (text, required = true) => {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll("button, a")].find((e) =>
      e.textContent?.trim().startsWith(t)
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok && required) throw new Error(`missing control: ${text}`);
  await new Promise((r) => setTimeout(r, 120));
  return ok;
};

const inMath = () =>
  page.evaluate(() => Boolean(document.body.textContent?.includes("Math, Module")));

const rect = () =>
  page.evaluate(() => {
    const f = document.querySelector('iframe[title="Desmos graphing calculator"]');
    const panel = f?.closest("div.fixed");
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });

await page.goto("http://localhost:3100/practice/test/practice-a?fast=1", {
  waitUntil: "domcontentloaded",
});
await new Promise((r) => setTimeout(r, 300));
await click("Start section 1");

// Push through Reading and Writing to reach Math.
for (let guard = 0; guard < 12 && !(await inMath()); guard++) {
  for (let i = 0; i < 40; i++) if (!(await click("Next", false))) break;
  await click("Review module", false);
  (await click("Submit", false)) || (await click("Finish test", false));
  await click("Resume testing", false);
}

if (!(await inMath())) throw new Error("never reached the Math section");
console.log("→ in Math section");

await click("Calculator");
await new Promise((r) => setTimeout(r, 400));
const before = await rect();
console.log("  opened at", before);
if (!before) throw new Error("calculator panel did not render");
await page.screenshot({ path: ".shots/desmos-1-open.png" });

// Drag the bottom-right corner out by 220 x 140.
await page.mouse.move(before.x + before.w - 6, before.y + before.h - 6);
await page.mouse.down();
await page.mouse.move(before.x + before.w + 120, before.y + before.h + 80, { steps: 12 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 200));
const resized = await rect();
console.log("  after resize", resized);

// Drag the title bar left and down.
await page.mouse.move(resized.x + 60, resized.y + 12);
await page.mouse.down();
await page.mouse.move(resized.x - 180, resized.y + 60, { steps: 12 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 200));
const moved = await rect();
console.log("  after move  ", moved);
await page.screenshot({ path: ".shots/desmos-2-resized.png" });

const grew = resized.w > before.w + 60 && resized.h > before.h + 40;
const shifted = Math.abs(moved.x - resized.x) > 100 && moved.y > resized.y + 20;
const keptSize = Math.abs(moved.w - resized.w) < 4;

console.log("");
console.log(`resize works: ${grew ? "yes" : "NO"}`);
console.log(`move works:   ${shifted ? "yes" : "NO"}`);
console.log(`move keeps size: ${keptSize ? "yes" : "NO"}`);

await browser.close();
process.exit(grew && shifted && keptSize ? 0 : 1);
