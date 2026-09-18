#!/usr/bin/env node
// Verifies the pdf.js worker path by rendering a real PDF page in the browser,
// which is the part of the crop tool that cannot be tested without a key.
import { existsSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

function findChrome() {
  for (const p of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ]) if (existsSync(p)) return p;
  throw new Error("No Chrome");
}

const pdfPath = process.argv[2] ?? "sat-pdf-gen/out/September U.S SAT-Blank.pdf";
const base64 = readFileSync(pdfPath).toString("base64");

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("  page error:", e.message));

// Load from the app origin so /pdf.worker.min.mjs resolves the same way the
// admin hub resolves it.
await page.goto("http://localhost:3100/admin", { waitUntil: "domcontentloaded" });

const result = await page.evaluate(async (b64) => {
  try {
    const res = await fetch("/pdf.worker.min.mjs", { method: "HEAD" });
    if (!res.ok) return { ok: false, step: "worker fetch", status: res.status };

    const pdfjs = await import("/_next/static/chunks/pdfjs.js").catch(() => null);
    // The app bundles pdfjs; in a bare page load it from the copied worker's
    // sibling build instead.
    const lib = pdfjs ?? (await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs"));
    lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const doc = await lib.getDocument({ data: bytes }).promise;
    const p = await doc.getPage(3);
    const viewport = p.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await p.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;

    const url = canvas.toDataURL();
    return {
      ok: url.length > 5000,
      pages: doc.numPages,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      bytes: url.length,
    };
  } catch (e) {
    return { ok: false, step: "render", message: String(e).slice(0, 200) };
  }
}, base64);

console.log(JSON.stringify(result, null, 1));
await browser.close();
process.exit(result.ok ? 0 : 1);
