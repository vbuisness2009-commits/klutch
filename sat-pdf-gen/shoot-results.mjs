#!/usr/bin/env node
// Drives a deliberately mixed attempt to the results screen, then expands a
// missed Math item so the Desmos-first solution tabs are visible.
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
await page.setViewport({ width: 1280, height: 1000 });

const click = async (t, required = true) => {
  const ok = await page.evaluate((text) => {
    const el = [...document.querySelectorAll("button, a")].find((e) =>
      e.textContent?.trim().startsWith(text)
    );
    if (!el) return false;
    el.click();
    return true;
  }, t);
  if (!ok && required) throw new Error(`missing: ${t}`);
  await new Promise((r) => setTimeout(r, 110));
  return ok;
};

// Answer most questions, deliberately skipping some so the review list fills.
const answer = (i) =>
  page.evaluate((idx) => {
    if (idx % 4 === 3) return "skipped";
    const input = document.querySelector('input[id^="spr-"]');
    if (input) {
      const set = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      set.call(input, "12");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return "spr";
    }
    const pick = idx % 3 === 0 ? "A" : "B";
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.querySelector("span")?.textContent?.trim() === pick
    );
    btn?.click();
    return "mc";
  }, i);

await page.goto("http://localhost:3100/practice/test/practice-a?fast=1", {
  waitUntil: "domcontentloaded",
});
await new Promise((r) => setTimeout(r, 300));
await click("Start section 1");

let n = 0;
for (let guard = 0; guard < 16; guard++) {
  const done = await page.evaluate(() =>
    Boolean(document.body.textContent?.includes("Your score"))
  );
  if (done) break;

  if (await click("Resume testing", false)) continue;
  if ((await click("Submit", false)) || (await click("Finish test", false))) continue;

  for (let i = 0; i < 40; i++) {
    await answer(n++);
    if (!(await click("Next", false))) break;
  }
  await click("Review module", false);
}

await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: ".shots/results-1-score.png" });
console.log("captured score panel");

// Expand the first missed Math item to reveal the solution tabs.
const opened = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("button[aria-expanded]")];
  const heads = [...document.querySelectorAll("h3")]; const mathHead = heads.find(h => h.textContent?.startsWith("Math")); const mathRow = mathHead?.nextElementSibling?.querySelector("button[aria-expanded]");
  const target = mathRow ?? rows[0];
  if (!target) return false;
  target.click();
  target.scrollIntoView({ block: "center" });
  return true;
});
await new Promise((r) => setTimeout(r, 400));
if (opened) {
  await page.screenshot({ path: ".shots/results-2-solution.png" });
  console.log("captured solution tabs");
}

const summary = await page.evaluate(() => {
  const nums = [...document.querySelectorAll(".nums")].map((e) =>
    e.textContent?.trim()
  );
  return nums.slice(0, 4);
});
console.log(summary);

await browser.close();
