# 🔥 Klutch

> **Be klutch.**
> The SAT & AP prep platform built for students who show up when it counts. Real practice tests, adaptive drills, and a study system engineered for test day.

---

## Brand

- **Name:** Klutch
- **Tagline:** *Be klutch.*
- **Alt taglines:** *Time to be klutch.* · *Built for game day. On purpose.*
- **Colors**
  - Ink (base): `#04040A` / `#08080F` / `#10101A`
  - Klutch Mint (primary + SAT): `#3DFFC1` (with 200-700 scale, deep is `#00B67A`)
  - Klutch Magenta (secondary + AP): `#FF3D9E`
  - Cream (soft accent): `#F5F1E8`
- **Logo:** A bold, angular **K monogram** — solid vertical bar + two thick diagonals converging into a sharp vertex. Reads at any size. See `components/Logo.tsx` and `app/favicon.svg`.
- **Type:** Inter (display + body), tight tracking + `font-black` (900) on headlines for that athletic-luxe feel.
- **Wordmark:** *Klutch* set in `font-black` — no need to color-split like most wordmarks. The K carries the brand.

---

## What's in the app

| Route | What it is |
| --- | --- |
| `/` | Marketing landing page — hero, features, test coverage, testimonials, pricing |
| `/sat` | SAT hub — full-length practice tests + topic drills |
| `/ap` | AP hub — all 38 College Board AP subjects grouped by category |
| `/ap/[slug]` | Individual AP subject page (unit list, MCQ/FRQ/cram entrypoints) |
| `/dashboard` | Student dashboard — streak, score projection, weak spots, next-up plan |
| `/practice` | Practice launcher |
| `/practice/demo` | **Bluebook-style test player** with timer, cross-out, flag, explanations |
| `/pricing` | Pricing plans (Free · Pro · Squad) |
| `/signup`, `/login` | Auth screens |

---

## Tech

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom design system in `tailwind.config.ts`
- Zero external UI libraries — every component is hand-built in `components/`
- Statically prerendered (51 routes)

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production:

```bash
npm run build
npm start
```

Generate a Klutch-branded practice PDF from a Bluebook JSON:

```bash
npm run gen:sat -- ~/Downloads/1.json --label "Klutch SAT · Test 1"
```

See [`sat-pdf-gen/README.md`](./sat-pdf-gen/README.md).

---

## File layout

```
app/
  layout.tsx           # Global shell (nav, footer, theme)
  page.tsx             # Landing page composition
  globals.css          # Tailwind + design tokens
  sat/                 # SAT hub
  ap/                  # AP hub + [slug] subject pages
  practice/            # Practice launcher + Bluebook-style demo player
  dashboard/           # Student dashboard
  signup/  login/      # Auth screens
  pricing/             # Pricing page
components/
  Logo.tsx             # Inline SVG K monogram
  Nav.tsx, Footer.tsx
  landing/             # Landing sections (Hero, Pricing, etc.)
  ui/                  # Small primitives (SectionHeader)
  auth/                # Shared auth form shell
lib/
  apSubjects.ts        # Canonical list of all 38 AP subjects
sat-pdf-gen/
  generate.mjs         # JSON → Klutch-branded PDF pipeline
  brand.mjs            # Logo, colors, watermark CSS
  out/                 # Generated PDFs (gitignored)
```

---

## Roadmap

1. **Real question bank ingestion** — a pipeline to convert Vik's archive of old SAT PDFs into structured JSON the site consumes. This is the moat.
2. **Auth + persistence** — swap the stub forms for real auth (Supabase / Clerk / Auth.js) and persist attempts, streaks, score history.
3. **Full-length SAT test flow** — module 1 → adaptive module 2 → scored report.
4. **AI tutor** — "Explain this to me" and follow-up chat inside the practice player.
5. **FRQ grader** — LLM-graded free-response with rubric feedback for AP.
6. **Score predictor** — statistical model mapping practice performance to an official 1–5 (AP) or 400–1600 (SAT) score.
7. **Mobile app** — React Native shell reusing the design system.

---

## Positioning note

Klutch is an independent study platform. It is not affiliated with or endorsed by the College Board®, SAT®, or AP®.
