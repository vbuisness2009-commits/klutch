/**
 * Beating Bluebook student loop — exercises the practice player end-to-end
 * on a form with ?fast=1 (45s modules / 20s break).
 *
 * Usage:
 *   node scripts/beating-bluebook-student-loop.mjs [formId]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const formId = process.argv[2] || "international-october-sat-a";
const base = process.env.BASE_URL || "http://localhost:3100";
const url = `${base}/practice/test/${formId}?fast=1`;
const outDir = path.join("scripts", ".bb-loop");
fs.mkdirSync(outDir, { recursive: true });

const log = [];
function note(msg, extra) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  console.log(line, extra ?? "");
  log.push({ t: Date.now(), msg, extra: extra ?? null });
}

async function shot(page, name) {
  const file = path.join(outDir, `${String(log.length).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  note(`screenshot ${name}`, file);
}

async function textOf(page, sel) {
  return page.$eval(sel, (el) => (el.textContent || "").trim()).catch(() => null);
}

async function clickText(page, text, { exact = false, timeout = 8000 } = {}) {
  const handle = await page.waitForFunction(
    (t, exactMatch) => {
      const nodes = Array.from(document.querySelectorAll("button, a, [role='button']"));
      return (
        nodes.find((n) => {
          const s = (n.textContent || "").trim();
          return exactMatch ? s === t : s.includes(t);
        }) || null
      );
    },
    { timeout },
    text,
    exact
  );
  const el = await handle.asElement();
  if (!el) throw new Error(`No clickable with text: ${text}`);
  // Re-query because waitForFunction return may be stale across navigations
  const clicked = await page.evaluate((t, exactMatch) => {
    const nodes = Array.from(document.querySelectorAll("button, a, [role='button']"));
    const n = nodes.find((x) => {
      const s = (x.textContent || "").trim();
      return exactMatch ? s === t : s.includes(t);
    });
    if (!n) return false;
    n.click();
    return true;
  }, text, exact);
  if (!clicked) throw new Error(`Failed to click: ${text}`);
  note(`click "${text}"`);
}

async function answerCurrentMcq(page, letter = "A") {
  const ok = await page.evaluate((L) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    // Choice buttons usually contain letter badge + choice text
    const choice = buttons.find((b) => {
      const t = (b.textContent || "").trim();
      return t.startsWith(L) && b.querySelector && (t.length > 1 || true);
    });
    // Prefer aria / structured choice if present
    const byLetter = buttons.find((b) => {
      const badge = b.querySelector("span");
      return badge && (badge.textContent || "").trim() === L;
    });
    const target = byLetter || choice;
    if (!target) return false;
    target.click();
    return true;
  }, letter);
  if (!ok) {
    // SPR: type a number
    const spr = await page.$("input, textarea");
    if (spr) {
      await spr.click({ clickCount: 3 });
      await spr.type("2");
      note("answered SPR with 2");
      return "spr";
    }
    note("WARN: could not answer current question");
    return null;
  }
  note(`answered MCQ ${letter}`);
  return "mcq";
}

async function rushModule(page, { answerEvery = 3, label }) {
  note(`--- module start: ${label}`);
  await page.waitForFunction(
    () => document.body.innerText.includes("Module"),
    { timeout: 10000 }
  );
  const header = await textOf(page, "header");
  note("header", header?.slice(0, 120));
  await shot(page, `${label}-q1`);

  // Answer a few, flag one, use next/back
  for (let i = 0; i < answerEvery; i++) {
    await answerCurrentMcq(page, ["A", "B", "C", "D"][i % 4]);
    if (i === 0) {
      await clickText(page, "Mark for review").catch(() =>
        note("no mark-for-review control")
      );
    }
    const nextLabel = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const n = btns.find((b) => /^(Next|Review module)$/.test((b.textContent || "").trim()));
      return n ? n.textContent.trim() : null;
    });
    if (nextLabel === "Review module") break;
    await clickText(page, "Next", { exact: true });
  }

  // Jump to last question via Review if needed, or keep Next until review
  for (let guard = 0; guard < 40; guard++) {
    const phase = await page.evaluate(() => {
      const t = document.body.innerText;
      if (t.includes("Check your work")) return "review";
      if (t.includes("Break")) return "break";
      if (t.includes("Finish test") || t.includes("Your score") || t.includes("Results"))
        return "doneish";
      return "module";
    });
    if (phase !== "module") break;
    const nextLabel = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const n = btns.find((b) => /^(Next|Review module)$/.test((b.textContent || "").trim()));
      return n ? n.textContent.trim() : null;
    });
    if (!nextLabel) break;
    await clickText(page, nextLabel, { exact: true });
  }

  await page.waitForFunction(
    () => document.body.innerText.includes("Check your work"),
    { timeout: 15000 }
  ).catch(() => note("WARN: review screen not reached"));
  await shot(page, `${label}-review`);

  // Jump back to q1 from review grid if present
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const one = btns.find((b) => (b.textContent || "").trim() === "1");
    if (one) one.click();
  });
  await new Promise((r) => setTimeout(r, 300));
  // Back to review
  for (let guard = 0; guard < 40; guard++) {
    if (await page.evaluate(() => document.body.innerText.includes("Check your work")))
      break;
    const nextLabel = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const n = btns.find((b) => /^(Next|Review module)$/.test((b.textContent || "").trim()));
      return n ? n.textContent.trim() : null;
    });
    if (!nextLabel) break;
    await clickText(page, nextLabel, { exact: true });
  }

  // Submit
  const submit = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const n = btns.find((b) =>
      /Submit module|Submit and break|Finish test/.test((b.textContent || "").trim())
    );
    return n ? n.textContent.trim() : null;
  });
  if (!submit) throw new Error(`No submit button on ${label}`);
  await clickText(page, submit, { exact: true });
  note(`submitted ${label} via "${submit}"`);
}

async function main() {
  note("open", url);
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--window-size=1400,900"],
    defaultViewport: { width: 1400, height: 900 },
  });
  const page = await browser.newPage();
  page.on("pageerror", (err) => note("PAGEERROR", String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") note("console.error", msg.text());
  });

  const bugs = [];
  try {
    const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    note("status", res?.status());
    await shot(page, "intro");

    const body = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    note("intro text", body.slice(0, 400));

    if (!body.includes("Start section")) {
      bugs.push("Intro missing Start section CTA");
    }
    if (body.includes("placeholders while the item pool")) {
      bugs.push(
        "Intro still says questions are placeholders (wrong for uploaded real form)"
      );
    }
    if (body.includes("Klutch") && body.includes("Sign up") && body.includes("Start section")) {
      // Site nav still visible on intro of immersive player
      const hasChrome = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a")).map((a) =>
          (a.textContent || "").trim()
        );
        return links.includes("Sign up") && links.includes("Dashboard");
      });
      if (hasChrome) bugs.push("Site nav still visible during test (should be immersive)");
    }

    // Timer / sections summary
    if (!/Reading|Writing|Math/i.test(body)) {
      bugs.push("Intro missing section names");
    }

    await clickText(page, "Start section 1");
    await page.waitForFunction(
      () => document.body.innerText.includes("Module 1"),
      { timeout: 10000 }
    );

    // Timer visible?
    const timer = await page.evaluate(() => {
      const t = document.body.innerText;
      return /\d+:\d{2}/.test(t);
    });
    if (!timer) bugs.push("Module timer not visible after start");
    note("timer visible", timer);

    // Hide timer
    await clickText(page, "Hide timer").catch(() => bugs.push("Hide timer missing"));
    await clickText(page, "Show timer").catch(() => note("show timer skipped"));

    // Cross out
    await clickText(page, "Cross out").catch(() => bugs.push("Cross out missing"));

    await rushModule(page, { label: "rw-m1", answerEvery: 4 });

    // Should be on RW M2
    await page.waitForFunction(
      () => /Module 2/.test(document.body.innerText),
      { timeout: 10000 }
    );
    const routeLine = await page.evaluate(() => {
      // Prefer the player chrome, not the marketing site header.
      const headers = Array.from(document.querySelectorAll("header"));
      const player = headers.find((h) => /Module/.test(h.innerText));
      return player ? player.innerText : headers[0]?.innerText || "";
    });
    note("after RW M1 route", routeLine.slice(0, 200));
    if (!/Routed to the (upper|lower) form/.test(routeLine)) {
      bugs.push("RW M2 missing routing indicator");
    }
    await rushModule(page, { label: "rw-m2", answerEvery: 3 });

    // Break
    await page.waitForFunction(
      () => document.body.innerText.includes("Break"),
      { timeout: 10000 }
    );
    await shot(page, "break");
    note("on break");
    await clickText(page, "Resume testing");

    // Math M1
    await page.waitForFunction(
      () => /Math.*Module 1|Module 1/.test(document.body.innerText),
      { timeout: 10000 }
    );
    const mathHeader = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll("header"));
      const player = headers.find((h) => /Module/.test(h.innerText));
      return player ? player.innerText : "";
    });
    note("math header", mathHeader.slice(0, 200));
    if (!/Math/i.test(mathHeader)) bugs.push("Math section header missing Math label");

    // Desmos — wait for load, not just iframe mount
    const hasCalc = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).some((b) =>
        (b.textContent || "").includes("Calculator")
      )
    );
    if (!hasCalc) bugs.push("Calculator button missing on Math");
    else {
      await clickText(page, "Calculator");
      await page
        .waitForFunction(
          () => {
            const iframe = document.querySelector("iframe[src*='desmos']");
            if (!iframe) return false;
            const loading = document.body.innerText.includes("Loading calculator");
            return Boolean(iframe) && !loading;
          },
          { timeout: 15000 }
        )
        .catch(() => bugs.push("Desmos did not finish loading within 15s"));
      const desmos = await page.evaluate(() => {
        const iframe = document.querySelector("iframe[src*='desmos']");
        return {
          iframe: Boolean(iframe),
          src: iframe?.getAttribute("src") || null,
          loadingShown: document.body.innerText.includes("Loading calculator"),
        };
      });
      note("desmos", desmos);
      if (!desmos.iframe) bugs.push("Desmos iframe did not open");
      await shot(page, "math-desmos");
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const c = btns.find((b) => /^(Close|×|✕)$/.test((b.textContent || "").trim()));
        if (c) c.click();
      });
    }

    // Reference sheet
    await clickText(page, "Reference").catch(() => bugs.push("Reference missing"));
    await new Promise((r) => setTimeout(r, 200));
    await shot(page, "math-ref");

    await rushModule(page, { label: "math-m1", answerEvery: 3 });
    await page.waitForFunction(
      () => /Module 2/.test(document.body.innerText),
      { timeout: 10000 }
    );
    await rushModule(page, { label: "math-m2", answerEvery: 3 });

    // Results
    await page.waitForFunction(
      () => {
        const t = document.body.innerText;
        return (
          t.includes("score") ||
          t.includes("Score") ||
          t.includes("Results") ||
          t.includes("finished") ||
          t.includes("Finished") ||
          t.includes("Total")
        );
      },
      { timeout: 15000 }
    ).catch(() => {
      bugs.push("Results screen did not appear after Math M2");
    });
    await shot(page, "results");
    const results = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    note("results text", results.slice(0, 600));

    // Crash check
    if (/Something went wrong|Application error|Unhandled|Cannot read/i.test(results)) {
      bugs.push("Results screen shows error");
    }

    // Post-test analytics: timing table + per-item data attributes
    const timing = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="item-timing-table"]');
      const rows = Array.from(
        document.querySelectorAll("[data-testid='item-timing-table'] [data-item-id]")
      );
      const times = rows.map((r) => Number(r.getAttribute("data-time-sec") || 0));
      const withTime = times.filter((t) => t > 0).length;
      return {
        hasTable: Boolean(table),
        rowCount: rows.length,
        withTime,
        maxTime: times.length ? Math.max(...times) : 0,
        hasCoach: Boolean(document.querySelector('[data-testid="feedback-chat"]')),
        hasTotals: Boolean(document.querySelector('[data-testid="results-totals"]')),
        bodyHasTiming: /Question timing|Time on items/i.test(document.body.innerText),
      };
    });
    note("results timing", timing);
    if (!timing.hasTable) bugs.push("Results missing item timing table");
    if (!timing.bodyHasTiming) bugs.push("Results missing Question timing / Time on items copy");
    if (timing.rowCount < 10) {
      bugs.push(`Timing table has too few rows (${timing.rowCount})`);
    }
    if (timing.withTime < 1) {
      bugs.push("No items have positive active time (timing instrumentation failed)");
    }
    if (!timing.hasCoach) bugs.push("Results missing Coach chatbot");
    if (!timing.hasTotals) bugs.push("Results missing totals strip");
  } catch (err) {
    note("FATAL", String(err));
    bugs.push(`Fatal: ${err}`);
    try {
      await shot(page, "fatal");
    } catch {}
  }

  const report = { url, bugs, log };
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log("\n=== BUGS ===");
  if (!bugs.length) console.log("(none)");
  else bugs.forEach((b, i) => console.log(`${i + 1}. ${b}`));
  await browser.close();
  process.exit(bugs.some((b) => b.startsWith("Fatal")) ? 1 : 0);
}

main();
