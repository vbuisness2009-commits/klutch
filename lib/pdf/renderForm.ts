import "server-only";

import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import {
  BRAND,
  baseStyles,
  klutchLogoSvg,
  pageFooterTemplate,
  pageHeaderTemplate,
} from "@/lib/pdf/brand.mjs";
import { isSpr, scoredItems, type Item, type TestForm } from "@/lib/testEngine/types";

/**
 * Renders any stored TestForm as a Klutch-branded paper, using the same
 * stylesheet as the standalone generator so an uploaded test and a generated
 * one are visually identical.
 *
 * Uploaded tests can therefore be sat in the player and printed from the same
 * source of truth, rather than being two parallel artifacts that drift apart.
 */

function findChrome(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean) as string[];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome binary found. Set CHROME_PATH.");
  return found;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Items already carry sanitized markup from the importers. */
function inline(s: string | undefined, html: boolean | undefined): string {
  if (!s) return "";
  return html ? s : escapeHtml(s);
}

const DIFF = {
  E: { cls: "easy", label: "Easy" },
  M: { cls: "med", label: "Medium" },
  H: { cls: "hard", label: "Hard" },
} as const;

function renderQuestion(item: Item, num: number, showAnswers: boolean): string {
  const d = DIFF[item.difficulty];
  const body: string[] = [];

  if (item.stimulus) {
    body.push(`<div class="q-stimulus">${inline(item.stimulus, item.html)}</div>`);
  }
  body.push(`<div class="q-stem">${inline(item.stem, item.html)}</div>`);

  if (isSpr(item)) {
    body.push(
      `<div class="free-response">Student-produced response. Show your work below.</div>`
    );
    if (showAnswers && item.accepted.length > 0) {
      body.push(
        `<div class="answer-key"><div class="label">Correct answer</div><div class="val">${escapeHtml(
          item.accepted.join(", ")
        )}</div></div>`
      );
    }
  } else {
    const choices = item.choices
      .map((c) => {
        const correct = showAnswers && c.id === item.correct;
        return `<div class="choice${correct ? " correct" : ""}">
          <span class="letter">${c.id}</span>
          <span class="choice-text">${inline(c.text, item.html)}</span>
        </div>`;
      })
      .join("");
    body.push(`<div class="choices">${choices}</div>`);
  }

  if (showAnswers && item.rationale) {
    body.push(
      `<div class="rationale"><div class="label">Explanation</div>${inline(
        item.rationale,
        item.html
      )}</div>`
    );
  }

  return `<article class="q-card">
    <div class="q-header">
      <div class="q-num"><span class="q-badge">${num}</span> Question</div>
      <span class="diff ${d.cls}">${d.label}</span>
    </div>
    <div class="q-body">${body.join("")}</div>
  </article>`;
}

function renderCover(form: TestForm, questionCount: number): string {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const moduleCount = form.sections.length * 2;
  return `<section class="cover">
    <div class="accent-line a"></div>
    <div class="accent-line b"></div>
    <div class="cover-mark">${klutchLogoSvg({ size: 96 })}</div>
    <div class="brand-word">KLUTCH</div>
    <div class="kicker">— Practice paper —</div>
    <h1 style="margin-top:24px;"><span class="accent">${escapeHtml(form.name)}</span></h1>
    <p class="sub">
      Work it in a quiet block with a timer, then review every question you
      missed. Answers are collected at the back if this copy includes them.
    </p>
    <div class="meta-pill"><span class="dot"></span> ${moduleCount} modules &middot; ${questionCount} questions</div>
    <div class="meta-row">
      <span>${escapeHtml(BRAND.domain)}</span>
      <span>${now}</span>
      <span>Form &middot; ${escapeHtml(form.id.slice(0, 12))}</span>
    </div>
  </section>`;
}

export type RenderOptions = {
  /** Include the answer key and any explanations. */
  showAnswers?: boolean;
};

export async function renderFormPdf(
  form: TestForm,
  opts: RenderOptions = {}
): Promise<Buffer> {
  const showAnswers = opts.showAnswers ?? false;

  // Pretest items are scaffolding for calibration and do not belong on paper.
  const parts: string[] = [];
  let total = 0;

  for (const section of form.sections) {
    const modules: [string, Item[]][] = [
      [`${section.name}, Module 1`, scoredItems(section.module1.items)],
      [`${section.name}, Module 2`, scoredItems(section.module2.upper.items)],
    ];

    for (const [name, items] of modules) {
      if (items.length === 0) continue;
      total += items.length;
      const minutes = Math.round(section.secondsPerModule / 60);
      parts.push(`<section class="section-title">
        <div class="eyebrow">${escapeHtml(section.name)}</div>
        <h2>${escapeHtml(name)}</h2>
        <div class="meta">
          <span class="k">${items.length} questions</span>
          <span>&middot; ${minutes} minutes</span>
          <span>&middot; No penalty for wrong answers</span>
        </div>
      </section>
      <div style="padding: 22px 0.05in 4px 0.05in;">
        <div class="sec-bar"><span class="dot"></span> KLUTCH &middot; ${escapeHtml(
          form.name
        )} &middot; Do not distribute <span class="dot"></span></div>
      </div>
      ${items.map((it, i) => renderQuestion(it, i + 1, showAnswers)).join("\n")}`);
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <script>
      window.MathJax = {
        tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$','$$'], ['\\\\[','\\\\]']] },
        options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] },
        startup: { typeset: true }
      };
    </script>
    <script async id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>${baseStyles({ watermarkText: "KLUTCH · BE KLUTCH" })}</style>
  </head><body>
    ${renderCover(form, total)}
    ${parts.join("\n")}
  </body></html>`;

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    try {
      await page.waitForFunction(
        "window.MathJax && window.MathJax.typesetPromise",
        { timeout: 12_000 }
      );
      await page.evaluate("window.MathJax.typesetPromise()");
    } catch {
      /* offline / blocked CDN — native MathML path */
    }
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: pageHeaderTemplate({ testName: form.name }),
      footerTemplate: pageFooterTemplate(),
      margin: { top: "0.9in", bottom: "0.9in", left: "0.55in", right: "0.55in" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
