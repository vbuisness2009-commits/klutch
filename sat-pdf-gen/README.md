# 🔥 Klutch — SAT PDF Generator

Turn a Bluebook-format SAT test JSON into a fully **Klutch-branded**, print-ready practice PDF.

- ✅ Klutch K monogram, wordmark, and electric mint accents throughout
- ✅ Dark cover page (ink + mint glow) + section title pages + question cards
- ✅ Multi-layer anti-copy watermarking (repeating diagonal + scattered wordmark on every question card)
- ✅ Running header + footer on every page with brand + page numbers
- ✅ MathJax rendering for Math section questions
- ✅ Handles both explicitly-labeled sections (`section_name` populated) and inferred sections (empty names)

## Usage

```bash
# Basic
npm run gen:sat -- ~/Downloads/1.json

# Custom label + output path
npm run gen:sat -- ~/Downloads/1.json \
  --label "Klutch SAT · Test #1" \
  --out ./my-test.pdf

# Also dump the raw HTML for debugging
npm run gen:sat -- ~/Downloads/1.json --html ./debug.html

# Suppress answer keys / rationales even if present in the source
npm run gen:sat -- ~/Downloads/1.json --no-answers
```

Output PDFs land in `sat-pdf-gen/out/` by default (gitignored).

## How it works

```
Bluebook JSON  →  generate.mjs
                    │
                    ├── builds a big self-contained HTML doc
                    │    (using templates in this folder)
                    ├── launches your local Chrome via puppeteer-core
                    ├── waits for MathJax to typeset every equation
                    └── prints to PDF with header/footer + margins
                    │
                    ↓
              Klutch-branded PDF
```

## Requirements

- Node ≥ 18
- Google Chrome installed at the default macOS path
  (or on Linux at `/usr/bin/google-chrome` / `/usr/bin/chromium`)
- `puppeteer-core` (already in the project's `package.json`)

## Files

| File | Purpose |
| --- | --- |
| `generate.mjs` | CLI + main pipeline (JSON → HTML → PDF) |
| `brand.mjs` | K monogram SVG, colors, typography, watermark CSS, page header/footer templates |
| `out/` | Generated PDFs (gitignored) |

## Design notes

Adapted (as a fresh clean-room implementation) from the concept in the
unmodified `Quizzly/sat-pdf-generator-recovered` project. **That project is
not touched.** This generator lives here inside Klutch, uses a totally
independent codebase, and is styled from scratch to match the Klutch brand.

The watermark security uses two layers:

1. **Per-card diagonal watermark** — a big rotated `KLUTCH · <test name>` inscription behind each question card at ~5% opacity in Klutch mint-deep.
2. **Scattered per-card wordmarks** — 8 small `KLUTCH · <test name>` tags positioned by a question-id-seeded PRNG so every card looks unique.

Combined, this makes copy-paste extraction of clean questions painful without
also removing hundreds of watermark instances.

## What's a Bluebook JSON?

The College Board's Bluebook app stores each downloaded practice test as a JSON payload with roughly this shape:

```json
{
  "session_id": "…",
  "package": { "id": 35, … },
  "questions": [
    {
      "question_id": "…",
      "question_number": "1",
      "question_type": "mcq",
      "section_name": "Section 1, Module 1: Reading and Writing",
      "stem": "<p>…</p>",
      "stimulus": "<p>…</p>",
      "answer_options": [{ "id": "…", "content": "<p>…</p>" }, …],
      "correct_answer": ["B"]      // may be missing
    },
    …
  ]
}
```

`generate.mjs` accepts this format as-is.
