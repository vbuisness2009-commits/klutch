#!/usr/bin/env node
// Walks the full test player flow in fast mode and screenshots each phase.
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
await page.setViewport({ width: 1280, height: 900 });

const click = async (text, required = true) => {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll("button, a")].find((e) =>
      e.textContent?.trim().startsWith(t)
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok && required) throw new Error(`missing control: "${text}"`);
  await new Promise((r) => setTimeout(r, 180));
  return ok;
};

/** Picks choice A, or types into the SPR box when the item is student-produced. */
const answer = async () =>
  page.evaluate(() => {
    const input = document.querySelector('input[id^="spr-"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      setter.call(input, "12");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return "spr";
    }
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.querySelector("span")?.textContent?.trim() === "A"
    );
    btn?.click();
    return "mc";
  });

const shot = async (n) => {
  await page.screenshot({ path: `.shots/test-${n}.png` });
  console.log(`  shot ${n}`);
};

const phase = () =>
  page.evaluate(() => {
    const t = document.body.textContent ?? "";
    if (t.includes("Check your work")) return "review";
    if (t.includes("Resume testing")) return "break";
    if (t.includes("Test complete")) return "done";
    const h = document.querySelector("header");
    return h ? h.textContent.slice(0, 60).trim() : "intro";
  });

await page.goto("http://localhost:3100/practice/test/practice-a?fast=1", {
  waitUntil: "domcontentloaded",
});
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 300));

await shot("1-intro");
await click("Start section 1");

// Work through every module until the test finishes.
for (let guard = 0; guard < 14; guard++) {
  const p = await phase();
  console.log(`→ ${p}`);

  if (p === "done") {
    await shot("7-done");
    break;
  }
  if (p === "break") {
    await shot("6-break");
    await click("Resume testing");
    continue;
  }
  if (p === "review") {
    await shot(`5-review-${guard}`);
    // Label differs by position: "Submit module", "Submit and break",
    // "Finish test". May also have auto-advanced if the clock ran out.
    (await click("Submit", false)) || (await click("Finish test", false));
    continue;
  }

  // In a module: answer everything, then open the review screen.
  for (let i = 0; i < 40; i++) {
    await answer();
    const advanced = await click("Next", false);
    if (!advanced) break;
  }
  if (guard === 0) await shot("2-module");
  await click("Review module", false);
}

await browser.close();
console.log("done");
