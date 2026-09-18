/**
 * Extraction prompt for turning a PDF page range into structured questions.
 *
 * Adapted from the earlier converter. Two changes worth noting: it now emits
 * Klutch's own field names so no translation layer is needed, and figures come
 * back as [IMAGE: Page N - description] placeholders rather than being
 * described in prose, because the operator crops those regions out of the real
 * page afterwards. A model cannot reproduce a scatterplot, so it should not try.
 */
export const EXTRACT_PROMPT = `You are extracting structured question data from pages of a standardized test PDF.

Return a strict JSON object with this shape:

{
  "questions": [
    {
      "number": "1",
      "section": "Reading and Writing" | "Math",
      "module": 1 | 2,
      "format": "mc" | "spr",
      "difficulty": "E" | "M" | "H",
      "stimulus": "<HTML passage, table, or setup. Empty string if none>",
      "stem": "<ONLY the interrogative sentence, in HTML>",
      "keySource": "paper" | "solved",
      "choices": [
        { "label": "A", "content": "<HTML>" },
        { "label": "B", "content": "<HTML>" },
        { "label": "C", "content": "<HTML>" },
        { "label": "D", "content": "<HTML>" }
      ],
      "correct": "A",
      "accepted": ["7", "7.0"],
      "rationale": "<HTML explanation if the PDF contains one, else empty>"
    }
  ]
}

Splitting stimulus from stem is mandatory and gets done wrong most often.
The stem is ONLY the sentence that asks the question. Everything the student
has to read first, passage, quotation, table, or scenario, belongs in stimulus.
They are rendered in two separate panes, so merging them breaks the layout.

  Correct:
    stimulus: "<p>Though most hoaxes on Wikipedia have quickly been ______ and
               removed, a few fictitious entries persisted for years.</p>"
    stem:     "<p>Which choice completes the text with the most logical and
               precise word or phrase?</p>"

  Wrong:
    stimulus: ""
    stem:     "<p>Though most hoaxes ... Which choice completes the text?</p>"

If a question genuinely has no preamble, for example a bare equation to solve,
then stimulus is an empty string and stem carries the whole thing.

Rules:
- Math equations (CRITICAL — empty gaps break the player):
    Use MathML with real tokens, never bare character data inside <math>.
    Correct: <math><mi>x</mi><mo>=</mo><mn>2</mn></math>
    Correct: <math><mrow><mi>k</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><msup><mi>x</mi><mn>3</mn></msup><mo>+</mo><mn>1100</mn></mrow></math>
    Wrong:   <math>7 + x = 2</math>   (Chrome renders this as a blank gap)
    Wrong:   <math>k(x) = x^3</math>
    Every variable, numeral, and operator in an equation must be a MathML
    element (<mi>, <mn>, <mo>, <msup>, <msub>, <mfrac>, <msqrt>, …).
    Do not omit equations. "If , what is the value of ?" is a hard failure.
- For "spr" (student-produced response) questions, omit "choices" and "correct", and list every acceptable form of the answer in "accepted".
- For "mc" questions, omit "accepted".
- Answer keys must be labelled honestly with "keySource":
    "paper"  the PDF prints the answer, and you copied it.
    "solved" the PDF prints no answer, and you worked it out yourself.
  Always set "keySource" whenever you provide "correct" or "accepted". Solving
  an unkeyed paper is useful, so do it, but never report a solved answer as if
  it came from the paper. If you are not confident in a solved answer, omit
  "correct" and "accepted" entirely rather than guessing.
- Set "difficulty" from the question's position and demand if the PDF does not label it.
- Module assignment is critical and gets lost across page chunks. Rules:
    Digital SAT Reading and Writing has two modules of exactly 27 questions each.
    Digital SAT Math has two modules of exactly 22 questions each.
    Question numbering restarts at 1 at the start of every module.
    So if you just saw question 27 (RW) or 22 (Math) and the next item is
    numbered 1 again, that next item is module 2, not module 1.
    Prefer the printed header ("Module 1" / "Module 2") when present. When the
    header is missing, use the numbering restart. Carry the current module
    forward within these pages until a restart or a new header says otherwise.
    Never dump an entire section into module 1.
- Figures and images — allow / deny (STRICT; false positives are costly):
    Emit an [IMAGE: ...] tag ONLY when a real non-text drawing is visibly
    printed on the page next to that question: graph, function plot, shaded
    inequality region, scatterplot, geometric figure/diagram, drawn chart,
    number-line graphic, or similar pictorial content.
    NEVER invent a figure from a word problem, equation, or scenario that
    merely *could* be graphed. Algebraic SPR/MC items (equations, systems,
    "infinitely many solutions", solve for k, etc.) with no printed drawing
    get ZERO image tags — equations stay MathML only.
    NEVER verbally reconstruct a graph or chart. Forbidden patterns include:
    "The following N lines are shown", bullet lists of series names, or
    narrating points with "Begins at / Falls sharply / Rises gradually /
    Remains level". If a drawing is on the page, emit ONE [IMAGE: ...] tag
    and copy only the surrounding prose the student must read — not a
    point-by-point description of the figure.
    Emit at most ONE [IMAGE: ...] tag per figure. Do not repeat the same
    graph with two slightly different descriptions.
    Tables of numbers or text → HTML <table>, NEVER an [IMAGE: ...] tag.
    NEVER tag: watermarks, diagonal Discord/Telegram stamps, logos, headers,
    footers, answer bubbles, answer keys, underlined text, decorative lines,
    or pure MathML / equations with no drawing beside them.
    Stem language like "figure", "graph", or "shown" is NOT enough by itself;
    only emit a tag when you can actually see the drawing on the page.
    If the stem says "figure"/"graph"/"shown" AND a drawing is visibly present,
    an IMAGE placeholder is required (and verbal reconstruction is forbidden).
    When choices A–D are different plots or diagrams, emit one IMAGE tag
    inside each choice's content, each with the correct absolute PDF page.
    Description must name the concrete drawing (axes, shapes, labels) — not
    bare words like "graph" or "figure".
  Placeholder form, inline where the image belongs:
    [IMAGE: Page 4 - scatterplot of height versus age with line of best fit]
  Use the absolute PDF page number the figure appears on (these pages begin
  at the number given with this request). Never output an <img> tag.
- Return only JSON. Do not wrap it in markdown fences.
- If there are no questions on these pages, return {"questions": []}.`;

/**
 * Pass B: figures-only audit. Returns compact hits for merge with Pass A
 * questions; never invents questions or HTML.
 */
export const FIGURE_AUDIT_PROMPT = `You are auditing standardized-test PDF pages for visual figures only.

Return a strict JSON object:

{
  "figures": [
    {
      "page": 81,
      "description": "right triangle ABC with right angle at B, angle A 56 degrees",
      "questionNumber": "15",
      "section": "Math",
      "module": 2,
      "kind": "diagram",
      "choiceLabel": null
    }
  ]
}

Rules (STRICT; empty list is better than a false positive):
- Emit a hit ONLY when a real non-text drawing is visibly printed on the page:
  graph, function plot, shaded inequality region, scatterplot, geometric
  diagram/figure, drawn chart, number-line graphic, or similar pictorial art.
- NEVER invent figures from word problems or equations that could be graphed
  but show no drawing. Pure algebra / MathML / SPR solve-for-k items with no
  printed graph get NOTHING.
- NEVER verbally reconstruct a graph (no "Falls sharply to", no "The
  following N lines are shown"). Figures are cropped later from IMAGE tags
  emitted by the question pass — your job is only to confirm real drawings.
- NEVER emit: data tables (HTML elsewhere), watermarks, diagonal Discord or
  Telegram stamps, logos, headers, footers, answer bubbles, answer keys,
  underlined text, decorative lines, or equations alone.
- Stem phrases like "the figure", "the graph", or "as shown" do NOT justify a
  hit unless the drawing is actually visible on these pages.
- "page" must be the absolute PDF page number (pages begin at the number
  given with this request), not a chunk-local 1..N index.
- "kind" MUST be one of: graph | scatterplot | diagram | geometry | chart | plot.
  Do not use other/unknown kinds. Skip the item if you cannot classify it.
- Set "questionNumber" when the figure clearly belongs to a numbered item.
- Set "section" to "Reading and Writing" or "Math" when clear; else omit.
- Set "module" to 1 or 2 when clear; else omit.
- When choices A–D each show a different plot, emit one figure per choice and
  set "choiceLabel" to "A"|"B"|"C"|"D". Otherwise set "choiceLabel" to null.
- description: concrete and crop-ready (what axes/shapes/labels appear). Reject
  bare "graph" / "figure" / "diagram" with no substance — omit those hits.
- Return only JSON. No markdown fences.
- If there are no figures on these pages, return {"figures": []}.`;

/** Form value that runs Flash questions + Pro figure audit. */
export const ACCURATE_EXTRACT_MODE = "accurate";

/** Matches the placeholders the prompt asks for. */
export const IMAGE_TAG_RE = /\[IMAGE:\s*Page\s*(\d+)\s*-\s*(.*?)\]/g;

export type Placeholder = {
  /** The literal tag text, used as the substitution key. */
  tag: string;
  page: number;
  description: string;
};

export function findPlaceholders(text: string): Placeholder[] {
  const found = new Map<string, Placeholder>();
  for (const m of text.matchAll(IMAGE_TAG_RE)) {
    const tag = m[0];
    if (!found.has(tag)) {
      found.set(tag, { tag, page: Number(m[1]), description: m[2].trim() });
    }
  }
  return [...found.values()].sort((a, b) => a.page - b.page);
}

/**
 * Swaps each placeholder for an <img> once the operator has cropped it.
 * Exact tag match first; then same-page fuzzy match so a reworded
 * description does not wipe a real crop. Unresolved tags are kept so a
 * later crop pass (or re-import) can still find them — dropping them used to
 * silently erase figures when crops were empty/partial.
 * Consecutive identical images are collapsed (duplicate placeholders).
 */
export function applyCrops(
  text: string,
  crops: Record<string, string>
): string {
  if (!text) return text;

  let out = text;
  const byPage = new Map<number, string>();
  for (const [tag, dataUrl] of Object.entries(crops)) {
    if (!dataUrl) continue;
    const m = tag.match(/\[IMAGE:\s*Page\s*(\d+)\s*-/i);
    if (m) {
      const page = Number(m[1]);
      if (!byPage.has(page)) byPage.set(page, dataUrl);
    }
    out = out.split(tag).join(`<img src="${dataUrl}" alt="" />`);
  }

  // Fuzzy: remaining tags on a page that already has a crop.
  // Leave unmatched placeholders intact.
  out = out.replace(IMAGE_TAG_RE, (full, pageStr: string) => {
    const page = Number(pageStr);
    const dataUrl = byPage.get(page);
    if (!dataUrl) return full;
    return `<img src="${dataUrl}" alt="" />`;
  });

  // Collapse duplicate crops with the same src (consecutive or wrapped in <p>).
  const seenSrc = new Set<string>();
  out = out.replace(/<img\b[^>]*\bsrc\s*=\s*(["'])([^"']*)\1[^>]*>/gi, (full, _q, src) => {
    if (seenSrc.has(src)) return "";
    seenSrc.add(src);
    return full;
  });
  out = out.replace(/<p>\s*<\/p>/gi, "");

  return out;
}
