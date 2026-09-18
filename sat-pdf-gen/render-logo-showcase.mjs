// Render the logo showcase HTML to a high-res PNG.
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function findChrome() {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  for (const p of paths) if (existsSync(p)) return p;
  throw new Error("No Chrome");
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const url = "file://" + resolve(__dirname, "out/logo-showcase.html");
await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
// Wait for Inter to load
await page.evaluate(async () => {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }
});
await new Promise((r) => setTimeout(r, 600));

const out = resolve(__dirname, "out/logo-showcase.png");
await page.screenshot({ path: out, fullPage: true, type: "png" });
console.log("→ Wrote", out);
await browser.close();
