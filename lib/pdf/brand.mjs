// ────────────────────────────────────────────────────────────────────────────
// Klutch — PDF brand kit
// Bold K monogram, mint primary, ink base — the athletic-luxe look
// translated to print-safe paper design.
// ────────────────────────────────────────────────────────────────────────────

export const BRAND = {
  name: "Klutch",
  wordmark: "KLUTCH",
  tagline: "Be klutch.",
  domain: "klutch.study",

  // Print palette — DARK MODE (matches the cover across the whole test)
  //   • The whole test lives on `ink950` — same near-black as the cover.
  //   • Cards sit on `ink800` with a hairline `line` border.
  //   • Text is `text` (near-white) with `textDim` for secondary content.
  //   • Mint is the primary accent — bright, glows on dark.
  //   • Magenta is the danger / correct-answer / anti-copy pop.
  colors: {
    ink950: "#04040A",      // page background (matches cover base)
    ink900: "#08080F",      // header/footer strip
    ink800: "#10101A",      // question cards, section headers
    ink700: "#191927",      // stimulus panels, choice cards
    ink600: "#242438",      // hover-ish tone / subtle fills
    line: "rgba(255,255,255,0.10)",       // hairline borders
    lineSoft: "rgba(255,255,255,0.06)",   // barely-there dividers
    text: "#F1F1F7",        // primary body text on dark
    textDim: "#A8A8BE",     // secondary / meta text
    textFaint: "#6B6B84",   // tertiary / labels
    mintGlow: "#B8FFE5",
    mint: "#3DFFC1",
    mintDeep: "#00E89B",
    mintDarker: "#00B67A",
    magenta: "#FF3D9E",
    magentaGlow: "#FFD5E9",
    magentaDeep: "#B0165F",
    // legacy names still referenced by cover styles / logo helper
    ink: "#04040A",
    inkSoft: "#A8A8BE",
    cream: "#F5F1E8",
    creamSoft: "#EFEBDD",
    softGrey: "#191927",
    softBlue: "rgba(96,165,250,0.10)",
    softGreen: "rgba(61,255,193,0.10)",
  },
};

// ─────────────────────────────────────────────────────────────
// Klutch K monogram — bold vertical bar + two thick diagonals.
//   • size:  pixel width/height
//   • mono:  "mint" (gradient) | "ink" (solid black) | "white" (solid white) | "mintDeep"
// ─────────────────────────────────────────────────────────────
export function klutchLogoSvg({ size = 30, mono = "mint" } = {}) {
  let fill = "url(#kGrad)";
  let stroke = "url(#kGrad)";
  let defs = "";
  if (mono === "mint") {
    defs = `<defs><linearGradient id="kGrad" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="${BRAND.colors.mintGlow}"/>
        <stop offset="55%" stop-color="${BRAND.colors.mint}"/>
        <stop offset="100%" stop-color="${BRAND.colors.mintDeep}"/>
      </linearGradient></defs>`;
  } else if (mono === "ink") {
    fill = BRAND.colors.ink;
    stroke = BRAND.colors.ink;
  } else if (mono === "white") {
    fill = "#FFFFFF";
    stroke = "#FFFFFF";
  } else if (mono === "mintDeep") {
    fill = BRAND.colors.mintDeep;
    stroke = BRAND.colors.mintDeep;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${defs}
    <rect x="3" y="3" width="7" height="26" rx="1.5" fill="${fill}"/>
    <path d="M 28 3 L 10 16 L 28 29" fill="none" stroke="${stroke}" stroke-width="7" stroke-linejoin="miter" stroke-miterlimit="6" stroke-linecap="butt"/>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────
// Typography — system Inter fallback stack.
// ─────────────────────────────────────────────────────────────
export const FONT_STACK = {
  display:
    "'Inter', 'InterVar', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  body:
    "'Inter', 'InterVar', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

// ─────────────────────────────────────────────────────────────
// Base stylesheet — @page rules, resets, typography, question card,
// answer choice, and multi-layer anti-copy watermark system.
// Athletic contrast: heavy black bars + mint accents + magenta danger.
// ─────────────────────────────────────────────────────────────
export function baseStyles({ watermarkText }) {
  const c = BRAND.colors;
  return `
    /* ----- @page rules ----- */
    @page { size: Letter; margin: 0.9in 0.55in 0.9in 0.55in; background: ${c.ink950}; }
    @page :first { margin: 0; background: ${c.ink950}; }

    /* ----- resets & typography ----- */
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { background: ${c.ink950}; color: ${c.text}; font-family: ${FONT_STACK.body}; font-size: 12.5px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
    body { padding: 0; }

    p { margin: 0 0 0.4em 0; color: ${c.text}; }
    p:last-child { margin-bottom: 0; }
    em, i { font-style: italic; }
    strong, b { font-weight: 700; color: #FFFFFF; }
    a { color: ${c.mint}; }

    /* ----- cover page ----- */
    .cover {
      page-break-after: always;
      break-after: page;
      position: relative;
      height: 100vh;
      min-height: 10.5in;
      background:
        radial-gradient(ellipse 55% 40% at 50% 30%, ${c.mint}22, transparent 70%),
        radial-gradient(ellipse 60% 40% at 50% 90%, ${c.magenta}18, transparent 70%),
        ${c.ink950};
      color: white;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 1in;
      overflow: hidden;
    }
    .cover .cover-mark { margin-bottom: 28px; filter: drop-shadow(0 8px 32px rgba(61,255,193,0.35)); }
    .cover h1 { font-family: ${FONT_STACK.display}; font-size: 82px; font-weight: 900; letter-spacing: -0.045em; line-height: 0.95; color: white; }
    /* Flat fill only. A background-clip:text gradient is emitted as a clipped
       image that viewers box in, and text-shadow is emitted as a soft mask
       that macOS fills as an opaque rectangle. Both wreck the cover. */
    .cover h1 .accent { color: ${c.mint}; }
    .cover .sub { margin-top: 20px; font-size: 15px; color: #B8B8CC; max-width: 26em; line-height: 1.55; }
    .cover .brand-word { display:inline-flex; align-items:center; font-family: ${FONT_STACK.display}; font-weight: 900; font-size: 22px; letter-spacing: 0.02em; color: white; }
    .cover .meta-row { position: absolute; bottom: 0.9in; left: 0.9in; right: 0.9in; display: flex; justify-content: space-between; align-items: center; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #7A7A93; }
    .cover .meta-pill { display:inline-flex; align-items:center; gap:8px; padding: 7px 14px; border: 1px solid ${c.mint}; border-radius: 999px; font-size: 11px; letter-spacing: 0.16em; color: ${c.mint}; text-transform: uppercase; margin-top: 32px; font-weight: 700; }
    /* No box-shadow glows anywhere in the PDF: viewers rasterize them
       inconsistently and macOS renders small glowing dots as solid blobs that
       cover adjacent text. */
    .cover .meta-pill .dot { width: 6px; height: 6px; border-radius: 999px; background: ${c.mint}; }
    .cover .kicker { font-family: ${FONT_STACK.display}; font-weight: 800; font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: ${c.mint}; margin-top: 28px; }

    /* Diagonal accent strokes on the cover */
    .cover .accent-line {
      position: absolute; height: 2px; width: 120px;
      background: linear-gradient(90deg, transparent, ${c.mint});
      transform: rotate(-24deg);
    }
    .cover .accent-line.a { top: 22%; left: -20px; }
    .cover .accent-line.b { bottom: 30%; right: -20px; transform: rotate(-24deg) scaleX(-1); }

    /* ----- section title page ----- */
    .section-title {
      page-break-before: always;
      break-before: page;
      padding: 0.85in 0.4in 0.55in 0.4in;
      border-bottom: 1px solid ${c.line};
      /* Flat fill. A radial glow on a partial-height block gets rasterized
         into the block's box, so its straight edges show as a rectangle. */
      background: ${c.ink950};
      position: relative;
    }
    .section-title .eyebrow { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: ${c.mint}; font-weight: 800; }
    .section-title h2 { font-family: ${FONT_STACK.display}; font-size: 38px; font-weight: 900; letter-spacing: -0.03em; margin-top: 6px; line-height: 1.05; color: #FFFFFF; }
    .section-title .meta { margin-top: 14px; display: flex; gap: 18px; font-size: 12px; color: ${c.textDim}; }
    .section-title .meta .k { color: #FFFFFF; font-weight: 800; }
    .section-title::after {
      content: "";
      position: absolute; bottom: -1px; left: 0; height: 3px; width: 96px;
      background: linear-gradient(90deg, ${c.mint}, ${c.mintDeep});
    }

    /* ----- question card -----
       overflow:hidden was removed because it made Chrome clip the top-of-card
       badge at page starts; the header rounds its own top corners instead. */
    .q-card {
      break-inside: avoid;
      page-break-inside: avoid;
      position: relative;
      margin: 0 0 20px 0;
      border: 1px solid ${c.line};
      border-radius: 10px;
      background: ${c.ink800};
    }
    .q-card .q-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px 12px 22px;
      background:
        linear-gradient(180deg, ${c.mint}, ${c.mintDeep}) left / 5px 100% no-repeat,
        ${c.ink900};
      color: #FFFFFF;
      border-bottom: 1px solid ${c.line};
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      position: relative;
    }
    .q-card .q-num {
      display:inline-flex; align-items:center; gap:8px;
      font-family: ${FONT_STACK.display}; font-weight: 800; font-size: 13px; letter-spacing: 0.02em;
      color: #FFFFFF;
    }
    .q-card .q-num .q-badge {
      display:inline-flex; align-items:center; justify-content:center;
      min-width: 26px; height: 22px; padding: 0 8px;
      background: ${c.mint}; color: ${c.ink950};
      border-radius: 6px; font-weight: 900; font-size: 12px;
    }
    .q-card .diff {
      display:inline-flex; align-items:center; gap:5px;
      padding: 3px 9px; border-radius: 999px;
      font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
    }
    .diff.easy { background: rgba(61,255,193,0.15); color: ${c.mint}; border: 1px solid rgba(61,255,193,0.40); }
    .diff.med  { background: rgba(255,255,255,0.08); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.25); }
    .diff.hard { background: rgba(255,61,158,0.18); color: ${c.magentaGlow}; border: 1px solid rgba(255,61,158,0.45); }

    .q-body {
      padding: 14px 16px 16px 16px;
      position: relative;
      color: ${c.text};
    }

    .q-stimulus {
      background: ${c.ink700};
      border: 1px solid ${c.line};
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
      font-size: 12.5px;
      line-height: 1.6;
      color: ${c.text};
    }
    .q-stimulus * { color: ${c.text}; }
    .q-stimulus strong, .q-stimulus b { color: #FFFFFF; }
    /* Native MathML — keep equations visible on dark cards (plain <math>
       text is repaired to <mtext> upstream; proper tokens inherit color). */
    .q-card math, .q-stimulus math, .q-stem math {
      color: ${c.text};
      font-family: "STIX Two Math", "Cambria Math", "Latin Modern Math", serif;
      font-size: 1.05em;
      padding: 0 0.05em;
    }
    .q-card math mtext, .q-card math mi, .q-card math mn, .q-card math mo {
      color: inherit;
    }

    .q-stem {
      font-weight: 700;
      font-size: 13px;
      line-height: 1.55;
      color: #FFFFFF;
      padding: 10px 12px;
      background: rgba(61,255,193,0.05);
      border-left: 3px solid ${c.mint};
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .choices { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
    /* A handful of questions use a full graph as each answer choice, making the
       card taller than a page. Chrome has to split those; keeping each choice
       atomic means it splits between choices instead of through a diagram. */
    .choice {
      display: flex; align-items: flex-start; gap: 10px;
      border: 1px solid ${c.line};
      border-radius: 8px;
      padding: 9px 12px;
      background: ${c.ink700};
      font-size: 12.5px;
      line-height: 1.5;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .choice .letter {
      flex-shrink: 0;
      display:inline-flex; align-items:center; justify-content:center;
      width: 22px; height: 22px; border-radius: 6px;
      border: 1.5px solid ${c.line};
      background: ${c.ink800};
      color: ${c.text};
      font-weight: 800; font-size: 12px;
      font-family: ${FONT_STACK.display};
    }
    .choice .choice-text { flex: 1; padding-top: 1px; color: ${c.text}; }
    .choice.correct { background: rgba(61,255,193,0.10); border-color: ${c.mint}; }
    .choice.correct .letter { background: ${c.mint}; color: ${c.ink950}; border-color: ${c.mintDeep}; }
    .choice.correct .choice-text { color: #FFFFFF; }

    .free-response {
      margin-top: 8px;
      border: 1.5px dashed ${c.line};
      border-radius: 8px;
      padding: 22px 16px;
      background: ${c.ink700};
      text-align: center; font-size: 11px; color: ${c.textFaint};
      letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700;
    }

    /* Correct answer / explanation blocks */
    .answer-key {
      margin-top: 10px; padding: 10px 12px;
      border: 1.5px solid ${c.mint}; background: rgba(61,255,193,0.08);
      border-radius: 8px; font-size: 12px;
    }
    .answer-key .label { font-weight: 900; color: ${c.mint}; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; }
    .answer-key .val { margin-top: 3px; font-weight: 800; color: #FFFFFF; }

    .rationale {
      margin-top: 10px; padding: 10px 12px;
      background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.30);
      border-radius: 8px; font-size: 12px; line-height: 1.55; color: ${c.text};
    }
    .rationale .label { font-weight: 900; color: #7CB6FF; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; margin-bottom: 4px; }

    /* ----- SVG / math / images inside answer choices ----- */
    /* Any figure / img / plain SVG gets a white plate so black CB diagrams stay legible.
       MathJax SVGs live inside <mjx-container> and use currentColor — they inherit our
       light text color and should stay transparent. */
    /* max-height keeps a tall diagram from pushing a question card past one
       page, which is what forces Chrome to split the card. */
    .q-card svg { max-width: 100%; max-height: 3.2in; height: auto; vertical-align: middle; background: #FFFFFF; padding: 6px; border-radius: 6px; }
    .q-card mjx-container svg { max-height: none; background: transparent !important; padding: 0 !important; border-radius: 0 !important; }
    .q-card img { max-width: 100%; max-height: 3.2in; width: auto; height: auto; display: block; margin: 8px auto; background: #FFFFFF; padding: 6px; border-radius: 6px; }
    .q-card figure { margin: 8px 0; background: #FFFFFF; padding: 8px; border-radius: 6px; color: ${c.ink950}; }
    .q-card figure * { color: ${c.ink950}; }
    .q-card figure svg, .q-card figure img { background: transparent; padding: 0; border-radius: 0; }
    .q-card table { border-collapse: collapse; margin: 8px 0; font-size: 11.5px; color: ${c.text}; }
    .q-card table td, .q-card table th { border: 1px solid ${c.line}; padding: 4px 8px; }
    .q-card table th { background: rgba(255,255,255,0.05); font-weight: 700; color: #FFFFFF; }

    /* MathJax containers — inherit our text color so equations render light on dark */
    .q-card mjx-container { display: inline-block; vertical-align: middle; color: ${c.text}; }

    /* ─────────── Anti-copy watermark system (multi-layer) ─────────── */
    .wm-layer { position: absolute; inset: 0; pointer-events: none; user-select: none; z-index: 1; overflow: hidden; }
    .wm-slot { position: absolute; font-family: ${FONT_STACK.display}; font-weight: 900; white-space: nowrap; color: ${c.mint}; opacity: 0.08; letter-spacing: 0.18em; text-transform: uppercase; font-size: 10px; }
    .wm-big  { font-size: 26px; opacity: 0.05; color: ${c.mint}; transform-origin: center; }
    .q-card::before {
      content: "${escapeCssContent(watermarkText)}";
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-24deg);
      font-family: ${FONT_STACK.display}; font-weight: 900; font-size: 34px;
      color: ${c.mint}; opacity: 0.07; letter-spacing: 0.24em;
      pointer-events: none; user-select: none; z-index: 0; white-space: nowrap;
      text-transform: uppercase;
    }
    .q-card > * { position: relative; z-index: 2; }
    .q-card .wm-layer { z-index: 1; }

    /* Anti-copy hairline bars (top + bottom of each card) */
    .sec-bar {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 6px 10px; font-family: ${FONT_STACK.display}; font-size: 8.5px;
      font-weight: 900; letter-spacing: 0.30em; text-transform: uppercase;
      color: ${c.ink950};
      background: ${c.mint};
      border-radius: 4px;
    }
    .sec-bar .dot { width: 4px; height: 4px; border-radius: 999px; background: ${c.ink950}; }

    /* Divider between question groups */
    .grid-hairline { height: 1px; background: ${c.line}; margin: 24px 0; }
  `;
}

// escape any characters that would break a CSS content: "…" string
function escapeCssContent(s = "") {
  return String(s).replace(/["\\]/g, "\\$&");
}

// ─────────────────────────────────────────────────────────────
// Header / footer templates used by Puppeteer's page.pdf({ headerTemplate })
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// IMPORTANT — Chrome renders header/footer templates as overlays that can
// paint roughly 0.2in PAST their reserved margin and cover page content.
// A `height: 100%` bar therefore bleeds into the content area and clips the
// top of the first question card on every page.
//
// Fix: the painted bar is given an explicit height well inside the margin
// (HEADER_BAR_IN), and any full-height wrapper is kept fully transparent so
// its overhang paints nothing. The uncovered part of the margin falls back to
// the dark @page background, so the page still reads as fully dark.
// ─────────────────────────────────────────────────────────────
const HEADER_BAR_IN = 0.5;
const FOOTER_BAR_IN = 0.5;

export function pageHeaderTemplate({ testName }) {
  return `
    <div style="width:100%;height:${HEADER_BAR_IN}in;box-sizing:border-box;background:#04040A;padding:0 0.55in 0 0.55in;font-family:-apple-system, BlinkMacSystemFont, sans-serif;font-size:8.5pt;color:#F1F1F7;display:flex;align-items:center;justify-content:space-between;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;gap:8px;font-weight:900;letter-spacing:0.02em;color:#FFFFFF;">
        ${klutchLogoSvg({ size: 14, mono: "mint" })}
        <span>KLUTCH</span>
      </div>
      <div style="font-size:8pt;letter-spacing:0.24em;text-transform:uppercase;color:#3DFFC1;font-weight:800;">${escapeHtml(testName)}</div>
    </div>
  `;
}

export function pageFooterTemplate() {
  // Transparent full-height wrapper (paints nothing if it overhangs upward)
  // with the dark bar pinned to the bottom of the footer margin.
  return `
    <div style="width:100%;height:100%;box-sizing:border-box;background:transparent;display:flex;align-items:flex-end;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      <div style="width:100%;height:${FOOTER_BAR_IN}in;box-sizing:border-box;background:#04040A;padding:0 0.55in 0 0.55in;font-family:-apple-system, BlinkMacSystemFont, sans-serif;font-size:8pt;color:#A8A8BE;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:7.5pt;letter-spacing:0.12em;font-weight:600;color:#A8A8BE;">© KLUTCH · klutch.study · Past SAT · for personal study only</div>
        <div style="font-weight:800;color:#FFFFFF;font-size:8pt;">
          <span class="pageNumber"></span> <span style="color:#3DFFC1;">/</span> <span class="totalPages"></span>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
