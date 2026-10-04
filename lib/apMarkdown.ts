/**
 * A small Markdown parser for AP content, covering the subset documented in
 * lib/apSchema.ts: paragraphs, **bold**, *italic*, `inline code`, fenced code
 * blocks, "- " and "1. " lists (nested by indent), and pipe tables.
 *
 * It is deliberately lenient about things authors reach for anyway (# headings,
 * > quotes, --- rules, [text](https://...) links) so a stray one renders as
 * something sensible instead of literal punctuation.
 *
 * It produces a plain tree, never HTML. components/ap/Markdown.tsx turns the
 * tree into React elements, so every piece of text goes through React's own
 * escaping. Pure and dependency-free: safe on the server and in the browser.
 */

export type MdInline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "strong"; c: MdInline[] }
  | { t: "em"; c: MdInline[] }
  | { t: "link"; href: string; c: MdInline[] }
  | { t: "br" };

export type MdAlign = "left" | "center" | "right" | null;

export type MdBlock =
  | { t: "p"; c: MdInline[] }
  | { t: "h"; level: number; c: MdInline[] }
  | { t: "code"; lang: string; v: string }
  | { t: "list"; ordered: boolean; start: number; items: MdBlock[][] }
  | { t: "table"; align: MdAlign[]; head: MdInline[][] | null; rows: MdInline[][][] }
  | { t: "quote"; c: MdBlock[] }
  | { t: "hr" };

const FENCE = /^\s*(```+|~~~+)\s*([\w+#.-]*)\s*$/;
const LIST_ITEM = /^(\s*)([-*+•]|\d{1,3}[.)])\s+(.*)$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

// Nesting guard. Content is ours, but a parser should never blow the stack.
const MAX_DEPTH = 8;

export function parseMarkdown(src: string): MdBlock[] {
  const lines = String(src ?? "").replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  return parseBlocks(lines, 0);
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function isBlank(line: string | undefined): boolean {
  return line === undefined || line.trim() === "";
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

/** True when `line` opens a block that should interrupt a paragraph. */
function startsBlock(line: string, next: string | undefined): boolean {
  return (
    FENCE.test(line) ||
    LIST_ITEM.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    (isTableRow(line) && next !== undefined && TABLE_SEP.test(next) && next.includes("-"))
  );
}

function parseBlocks(lines: string[], depth: number): MdBlock[] {
  const out: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }

    // Fenced code. An unclosed fence runs to the end rather than eating
    // nothing, which is what an author would expect to see.
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1];
      const indent = indentOf(line);
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        // Strip the fence's own indent so code nested in a list lines up.
        const l = lines[i];
        body.push(indentOf(l) >= indent ? l.slice(indent) : l.trimStart());
        i++;
      }
      i++; // closing fence
      out.push({ t: "code", lang: fence[2] || "", v: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      out.push({ t: "h", level: heading[1].length, c: parseInline(heading[2]) });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      out.push({ t: "hr" });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && !isBlank(lines[i])) {
        const m = QUOTE.exec(lines[i]);
        if (!m && startsBlock(lines[i], lines[i + 1])) break;
        inner.push(m ? m[1] : lines[i]);
        i++;
      }
      out.push({
        t: "quote",
        c: depth < MAX_DEPTH ? parseBlocks(inner, depth + 1) : [{ t: "p", c: parseInline(inner.join("\n")) }],
      });
      continue;
    }

    // Pipe table: a row of cells followed by a --- separator row. Rows that
    // start with "|" but have no separator still render as a headerless table.
    if (isTableRow(line)) {
      const rows: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      out.push(parseTable(rows));
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const [block, next] = parseList(lines, i, depth);
      out.push(block);
      i = next;
      continue;
    }

    // Paragraph: runs until a blank line or the start of another block.
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i], lines[i + 1])) {
      para.push(lines[i].trim());
      i++;
    }
    out.push({ t: "p", c: parseInline(para.join("\n")) });
  }

  return out;
}

function parseList(lines: string[], from: number, depth: number): [MdBlock, number] {
  const first = LIST_ITEM.exec(lines[from])!;
  const base = first[1].length;
  const ordered = /\d/.test(first[2]);
  const start = ordered ? parseInt(first[2], 10) || 1 : 1;
  const items: string[][] = [];
  let i = from;

  while (i < lines.length) {
    const line = lines[i];
    const m = LIST_ITEM.exec(line);

    if (m && m[1].length <= base + 1 && /\d/.test(m[2]) === ordered) {
      // A sibling item at this level.
      items.push([m[3]]);
      i++;
      continue;
    }
    if (m && m[1].length <= base + 1) break; // switched list type

    if (isBlank(line)) {
      // A blank line continues the list only if more of it follows.
      let j = i + 1;
      while (j < lines.length && isBlank(lines[j])) j++;
      const nm = j < lines.length ? LIST_ITEM.exec(lines[j]) : null;
      const continues =
        j < lines.length &&
        ((nm && nm[1].length <= base + 1 && /\d/.test(nm[2]) === ordered) ||
          indentOf(lines[j]) > base + 1);
      if (!continues) break;
      items[items.length - 1].push("");
      i = j;
      continue;
    }

    if (indentOf(line) > base + 1 || !startsBlock(line, lines[i + 1])) {
      // Nested content or a lazy continuation of the current item.
      const strip = Math.min(indentOf(line), base + 2 + (ordered ? 1 : 0));
      items[items.length - 1].push(indentOf(line) > base + 1 ? line.slice(strip) : line.trim());
      i++;
      continue;
    }
    break;
  }

  const parsed = items.map((itemLines) => {
    if (depth >= MAX_DEPTH) return [{ t: "p", c: parseInline(itemLines.join("\n")) } as MdBlock];
    return parseBlocks(itemLines, depth + 1);
  });
  return [{ t: "list", ordered, start, items: parsed }, i];
}

function splitRow(row: string): string[] {
  let s = row.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  let inCode = false;
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (ch === "\\" && s[k + 1] === "|") {
      cur += "|";
      k++;
    } else if (ch === "`") {
      inCode = !inCode;
      cur += ch;
    } else if (ch === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseTable(rows: string[]): MdBlock {
  const sepAt = rows.findIndex((r, k) => k > 0 && TABLE_SEP.test(r) && r.includes("-"));
  let head: MdInline[][] | null = null;
  let align: MdAlign[] = [];
  let body = rows;

  if (sepAt === 1) {
    head = splitRow(rows[0]).map(parseInline);
    align = splitRow(rows[1]).map((c) => {
      const l = c.startsWith(":");
      const r = c.endsWith(":");
      return l && r ? "center" : r ? "right" : l ? "left" : null;
    });
    body = rows.slice(2);
  }

  const parsedRows = body
    .filter((r) => !(TABLE_SEP.test(r) && r.includes("-")))
    .map((r) => splitRow(r).map(parseInline));
  const width = Math.max(head?.length ?? 0, ...parsedRows.map((r) => r.length), 1);
  const pad = (r: MdInline[][]) => [...r, ...Array.from({ length: width - r.length }, () => [] as MdInline[])];

  return {
    t: "table",
    align: Array.from({ length: width }, (_, k) => align[k] ?? null),
    head: head ? pad(head) : null,
    rows: parsedRows.map(pad),
  };
}

// ---------------------------------------------------------------- inline

const ESCAPABLE = "\\`*_{}[]()#+-.!|>~";
const LINK = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/;

export function parseInline(src: string, depth = 0): MdInline[] {
  const out: MdInline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    if (ch === "\\" && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
      text += src[i + 1];
      i += 2;
      continue;
    }

    if (ch === "\n") {
      flush();
      out.push({ t: "br" });
      i++;
      continue;
    }

    if (ch === "`") {
      let n = 1;
      while (src[i + n] === "`") n++;
      const fence = "`".repeat(n);
      const close = src.indexOf(fence, i + n);
      if (close !== -1) {
        flush();
        let code = src.slice(i + n, close);
        if (/^ .* $/.test(code)) code = code.slice(1, -1);
        out.push({ t: "code", v: code });
        i = close + n;
        continue;
      }
      text += fence;
      i += n;
      continue;
    }

    if ((ch === "*" || ch === "_") && depth < MAX_DEPTH) {
      const double = src[i + 1] === ch;
      const delim = double ? ch + ch : ch;
      const after = src[i + delim.length];
      const before = src[i - 1];
      const opens =
        after !== undefined &&
        !/\s/.test(after) &&
        // Underscores inside words (snake_case) are literal.
        !(ch === "_" && before !== undefined && /[\p{L}\p{N}]/u.test(before));
      if (opens) {
        const close = findClose(src, i + delim.length, delim);
        if (close !== -1) {
          flush();
          const inner = parseInline(src.slice(i + delim.length, close), depth + 1);
          out.push(double ? { t: "strong", c: inner } : { t: "em", c: inner });
          i = close + delim.length;
          continue;
        }
      }
      text += delim;
      i += delim.length;
      continue;
    }

    if (ch === "[") {
      const m = LINK.exec(src.slice(i));
      if (m) {
        flush();
        out.push({ t: "link", href: m[2], c: parseInline(m[1], depth + 1) });
        i += m[0].length;
        continue;
      }
    }

    text += ch;
    i++;
  }

  flush();
  return out;
}

/** Index of the closing delimiter, or -1. Skips over code spans and escapes. */
function findClose(src: string, from: number, delim: string): number {
  const ch = delim[0];
  for (let k = from; k < src.length; k++) {
    const c = src[k];
    if (c === "\\") {
      k++;
      continue;
    }
    if (c === "`") {
      const end = src.indexOf("`", k + 1);
      if (end === -1) return -1;
      k = end;
      continue;
    }
    if (c === "\n" && src[k + 1] === "\n") return -1;
    if (!src.startsWith(delim, k)) continue;
    // Single delimiters must not be half of a double one.
    if (delim.length === 1 && (src[k + 1] === ch || src[k - 1] === ch)) {
      if (src[k + 1] === ch) k++;
      continue;
    }
    if (/\s/.test(src[k - 1] ?? " ")) continue;
    if (ch === "_" && /[\p{L}\p{N}]/u.test(src[k + delim.length] ?? "")) continue;
    if (k === from) continue;
    return k;
  }
  return -1;
}

/** Plain text of a Markdown string, for search and aria labels. */
export function markdownToText(src: string): string {
  return String(src ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#>|]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
