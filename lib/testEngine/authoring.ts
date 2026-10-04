/**
 * Klutch practice-test authoring format.
 *
 * The admin hub accepts a test as JSON or as CSV (one row per question), turns
 * either into an AuthoringDoc, validates it, and builds a TestForm for the
 * player. Pure TypeScript with type-only imports, so it runs in the browser
 * (preview before saving), on the server (re-validation on save), and under
 * `node --experimental-strip-types` (scripts/check-authoring.ts).
 *
 * See the format guide in the admin hub and README.md.
 */

import type {
  Difficulty,
  Domain,
  ExpectedPace,
  Item,
  Module,
  Section,
  SectionId,
  SolutionPath,
  TestForm,
} from "./types";

export const AUTHORING_FORMAT = "klutch-practice-test";
export const AUTHORING_VERSION = 1;

type Letter = "A" | "B" | "C" | "D";
const LETTERS: Letter[] = ["A", "B", "C", "D"];

export type AuthoredItem = {
  id?: string;
  type?: "mc" | "spr";
  stimulus?: string;
  stem: string;
  /** Multiple choice only. {A,B,C,D} or an array of exactly four strings. */
  choices?: Partial<Record<Letter, string>> | string[];
  /** "A".."D" for multiple choice; a string or list of accepted strings for SPR. */
  answer?: string | string[];
  rationale?: string;
  domain: string;
  skill?: string;
  difficulty?: string;
  pretest?: boolean;
  html?: boolean;
  distractorNotes?: Partial<Record<Letter, string>>;
  solutions?: SolutionPath[];
  /** Maintained by the hub (AI key solve / pace tools). */
  keySource?: "paper" | "solved" | "missing";
  expectedPace?: ExpectedPace;
};

export type AuthoredSection = {
  module1: AuthoredItem[];
  /** One module 2 that serves both routes. */
  module2?: AuthoredItem[];
  /** Or separate module 2 sets by route. */
  module2Easier?: AuthoredItem[];
  module2Harder?: AuthoredItem[];
  /** Module 1 scored-correct count that routes into the harder module 2. */
  routeUpAt?: number;
  /** Minutes per module. Defaults 32 (RW) / 35 (Math). */
  minutes?: number;
};

export type AuthoringDoc = {
  format?: string;
  version?: number;
  title?: string;
  collection?: string;
  /** Treat every stem/stimulus/choice as HTML (tables, images, MathML). */
  html?: boolean;
  breakMinutes?: number;
  sections: Partial<Record<SectionId, AuthoredSection>>;
};

export type Issue = { where: string; message: string };

export type ValidationResult = {
  form: TestForm | null;
  errors: Issue[];
  warnings: Issue[];
  scorable: boolean;
  summary: {
    sections: {
      id: SectionId;
      name: string;
      module1: number;
      module2: number | { easier: number; harder: number };
      pretest: number;
      spr: number;
    }[];
    questionCount: number;
    missingKeys: number;
  };
};

// ---------------------------------------------------------------- taxonomy

export const SECTION_NAMES: Record<SectionId, string> = {
  rw: "Reading and Writing",
  math: "Math",
};

export const DOMAINS: Record<SectionId, Domain[]> = {
  rw: [
    "Craft and Structure",
    "Information and Ideas",
    "Standard English Conventions",
    "Expression of Ideas",
  ],
  math: [
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry",
  ],
};

/** Skill names from the published digital SAT specifications. Free text is allowed too. */
export const SKILLS: Record<Domain, string[]> = {
  "Information and Ideas": [
    "Central Ideas and Details",
    "Command of Evidence (Textual)",
    "Command of Evidence (Quantitative)",
    "Inferences",
  ],
  "Craft and Structure": ["Words in Context", "Text Structure and Purpose", "Cross-Text Connections"],
  "Expression of Ideas": ["Rhetorical Synthesis", "Transitions"],
  "Standard English Conventions": ["Boundaries", "Form, Structure, and Sense"],
  Algebra: [
    "Linear equations in one variable",
    "Linear functions",
    "Linear equations in two variables",
    "Systems of two linear equations in two variables",
    "Linear inequalities in one or two variables",
  ],
  "Advanced Math": [
    "Equivalent expressions",
    "Nonlinear equations in one variable and systems of equations in two variables",
    "Nonlinear functions",
  ],
  "Problem-Solving and Data Analysis": [
    "Ratios, rates, proportional relationships, and units",
    "Percentages",
    "One-variable data: distributions and measures of center and spread",
    "Two-variable data: models and scatterplots",
    "Probability and conditional probability",
    "Inference from sample statistics and margin of error",
    "Evaluating statistical claims: observational studies and experiments",
  ],
  "Geometry and Trigonometry": [
    "Area and volume",
    "Lines, angles, and triangles",
    "Right triangles and trigonometry",
    "Circles",
  ],
};

const norm = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

const DOMAIN_ALIASES: Record<string, Domain> = {
  ii: "Information and Ideas",
  "info and ideas": "Information and Ideas",
  information: "Information and Ideas",
  cs: "Craft and Structure",
  craft: "Craft and Structure",
  eoi: "Expression of Ideas",
  expression: "Expression of Ideas",
  sec: "Standard English Conventions",
  conventions: "Standard English Conventions",
  "english conventions": "Standard English Conventions",
  alg: "Algebra",
  am: "Advanced Math",
  advanced: "Advanced Math",
  psda: "Problem-Solving and Data Analysis",
  "problem solving": "Problem-Solving and Data Analysis",
  "data analysis": "Problem-Solving and Data Analysis",
  "problem solving and data": "Problem-Solving and Data Analysis",
  geometry: "Geometry and Trigonometry",
  geo: "Geometry and Trigonometry",
  "geometry and trig": "Geometry and Trigonometry",
  gt: "Geometry and Trigonometry",
};

export function parseDomain(raw: string): Domain | null {
  const n = norm(raw);
  for (const d of [...DOMAINS.rw, ...DOMAINS.math]) if (norm(d) === n) return d;
  return DOMAIN_ALIASES[n] ?? null;
}

export function sectionOfDomain(d: Domain): SectionId {
  return DOMAINS.rw.includes(d) ? "rw" : "math";
}

export function parseDifficulty(raw: string): Difficulty | null {
  const n = norm(raw);
  if (["e", "easy", "1", "low"].includes(n)) return "E";
  if (["m", "medium", "med", "2", "mid"].includes(n)) return "M";
  if (["h", "hard", "3", "high"].includes(n)) return "H";
  return null;
}

export function parseSection(raw: string): SectionId | null {
  const n = norm(raw);
  if (["rw", "r w", "reading and writing", "reading", "writing", "english", "verbal"].includes(n)) return "rw";
  if (["math", "m", "maths", "mathematics"].includes(n)) return "math";
  return null;
}

/** Real digital SAT structure, used for warnings only. */
export const EXPECTED = {
  rw: { items: 27, pretest: 2, minutes: 32 },
  math: { items: 22, pretest: 2, minutes: 35 },
} as const;

// ---------------------------------------------------------------- SPR

const SPR_RE = /^-?(\d+(\.\d*)?|\.\d+|\d+\/\d+)$/;

/** Checks one accepted SPR answer against what a student can type on the SAT. */
export function checkSprAnswer(raw: string): { ok: boolean; message?: string; warn?: string } {
  const s = raw.trim().replace(/\s+/g, "");
  if (!s) return { ok: false, message: "empty accepted answer" };
  if (/^-?\d+\s*\d+\/\d+$/.test(raw.trim()) && /\s/.test(raw.trim()))
    return { ok: false, message: `"${raw}" is a mixed number; students must enter it as an improper fraction or decimal (e.g. 7/2 or 3.5)` };
  if (/%/.test(s)) return { ok: false, message: `"${raw}" has a percent sign; enter the number only` };
  if (!SPR_RE.test(s))
    return { ok: false, message: `"${raw}" is not a valid entry; use digits, one decimal point, one "/", and an optional leading "-"` };
  if (/\/0+$/.test(s)) return { ok: false, message: `"${raw}" divides by zero` };
  const limit = s.startsWith("-") ? 6 : 5;
  if (s.length > limit)
    return { ok: true, warn: `"${raw}" is ${s.length} characters; the SAT entry box allows ${limit} (${limit === 6 ? "including the minus sign" : "positive answers"})` };
  return { ok: true };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Adds the equivalent forms a student may legitimately type: reduced
 * fractions, decimals with and without a leading zero, and for repeating
 * decimals the truncated/rounded forms that fill the entry box.
 */
export function sprEquivalents(answers: string[]): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.trim().replace(/\s+/g, "");
    if (t && !out.includes(t)) out.push(t);
  };
  answers.forEach(add);

  for (const a of answers) {
    const s = a.trim().replace(/\s+/g, "");
    if (!SPR_RE.test(s)) continue;
    const neg = s.startsWith("-");
    const body = neg ? s.slice(1) : s;
    const sign = neg ? "-" : "";
    const width = neg ? 6 : 5;
    let value: number;
    let exactDecimal = false;

    if (body.includes("/")) {
      const [p, q] = body.split("/").map(Number);
      if (!q) continue;
      value = p / q;
      const g = gcd(p, q);
      if (g > 1) add(q / g === 1 ? `${sign}${p / g}` : `${sign}${p / g}/${q / g}`);
      // Terminating if q (reduced) has only 2s and 5s.
      let d = q / g;
      while (d % 2 === 0) d /= 2;
      while (d % 5 === 0) d /= 5;
      exactDecimal = d === 1;
    } else {
      value = Number(body);
      exactDecimal = true;
      // Exact decimal -> small fraction (0.75 -> 3/4).
      if (body.includes(".") && !Number.isInteger(value)) {
        for (let q = 2; q <= 999; q++) {
          const p = Math.round(value * q);
          if (Math.abs(p / q - value) < 1e-12) {
            const f = `${sign}${p}/${q}`;
            if (f.length <= width) add(f);
            break;
          }
        }
      }
    }
    if (!Number.isFinite(value) || Number.isInteger(value)) {
      if (Number.isInteger(value)) add(`${sign}${value}`);
      continue;
    }

    const intPart = Math.trunc(value);
    const intStrs = intPart === 0 ? ["", "0"] : [String(intPart)];
    for (const intStr of intStrs) {
      const decimals = width - sign.length - intStr.length - 1;
      if (decimals < 1) continue;
      const frac = value - intPart;
      if (exactDecimal) {
        const full = value.toString().split(".")[1] ?? "";
        if (full.length <= decimals) add(`${sign}${intStr}.${full}`);
        else {
          // Terminating but too long for the box: SAT accepts filled truncation/rounding.
          add(`${sign}${intStr}.${String(Math.floor(frac * 10 ** decimals)).padStart(decimals, "0")}`);
          const r = Math.round(frac * 10 ** decimals);
          if (r < 10 ** decimals) add(`${sign}${intStr}.${String(r).padStart(decimals, "0")}`);
        }
      } else {
        add(`${sign}${intStr}.${String(Math.floor(frac * 10 ** decimals + 1e-9)).padStart(decimals, "0")}`);
        const r = Math.round(frac * 10 ** decimals);
        if (r < 10 ** decimals) add(`${sign}${intStr}.${String(r).padStart(decimals, "0")}`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- JSON

export function parseJsonDoc(text: string): { doc: AuthoringDoc | null; errors: Issue[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (e) {
    return { doc: null, errors: [{ where: "File", message: `Not valid JSON: ${e instanceof Error ? e.message : "parse error"}` }] };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { doc: null, errors: [{ where: "File", message: "Expected a JSON object with a \"sections\" property." }] };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== undefined && obj.format !== AUTHORING_FORMAT) {
    return {
      doc: null,
      errors: [{ where: "File", message: `"format" must be "${AUTHORING_FORMAT}" (got "${String(obj.format)}"). Bluebook exports and other formats are not accepted.` }],
    };
  }
  const sections = obj.sections;
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return { doc: null, errors: [{ where: "File", message: "Missing \"sections\": expected { \"rw\": {...}, \"math\": {...} }." }] };
  }
  const errors: Issue[] = [];
  for (const k of Object.keys(sections)) {
    if (k !== "rw" && k !== "math") errors.push({ where: `sections.${k}`, message: "Unknown section; use \"rw\" or \"math\"." });
  }
  return { doc: obj as unknown as AuthoringDoc, errors };
}

// ---------------------------------------------------------------- CSV

export const CSV_COLUMNS = [
  "section",
  "module",
  "id",
  "type",
  "domain",
  "skill",
  "difficulty",
  "pretest",
  "stimulus",
  "stem",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "answer",
  "rationale",
  "note_a",
  "note_b",
  "note_c",
  "note_d",
  "solution_steps",
  "desmos",
  "html",
] as const;

const REQUIRED_CSV = ["section", "module", "stem", "domain", "answer"];

/** RFC 4180 parser: quoted fields, "" escapes, embedded newlines, CRLF, BOM, , ; or tab. */
export function parseCsvRows(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type ModuleKey = "module1" | "module2" | "module2Easier" | "module2Harder";

function parseModule(raw: string): ModuleKey | null {
  const n = norm(raw).replace(/\s/g, "");
  if (["1", "m1", "module1"].includes(n)) return "module1";
  if (["2", "m2", "module2"].includes(n)) return "module2";
  if (["2e", "2easier", "2easy", "2lower", "2l", "easier", "lower", "m2e", "module2easier"].includes(n)) return "module2Easier";
  if (["2h", "2harder", "2hard", "2upper", "2u", "harder", "upper", "m2h", "module2harder"].includes(n)) return "module2Harder";
  return null;
}

const truthy = (s: string) => ["1", "y", "yes", "true", "x", "pretest"].includes(s.trim().toLowerCase());

/** Row numbers for messages: items parsed from CSV carry their spreadsheet row. */
const ROW = new WeakMap<object, number>();

export function parseCsvDoc(text: string): { doc: AuthoringDoc | null; errors: Issue[]; warnings: Issue[] } {
  const rows = parseCsvRows(text).filter((r) => r.some((c) => c.trim() !== ""));
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if (rows.length < 2) {
    return { doc: null, errors: [{ where: "File", message: "The CSV needs a header row and at least one question row." }], warnings };
  }
  const header = rows[0].map((h) => norm(h).replace(/\s+/g, "_"));
  const col = new Map<string, number>();
  header.forEach((h, i) => {
    if ((CSV_COLUMNS as readonly string[]).includes(h)) col.set(h, i);
    else if (h) warnings.push({ where: "Header", message: `Column "${rows[0][i]}" is not part of the format and was ignored.` });
  });
  const missing = REQUIRED_CSV.filter((h) => !col.has(h));
  if (missing.length) {
    return {
      doc: null,
      errors: [{ where: "Header", message: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the CSV template for the exact headers.` }],
      warnings,
    };
  }

  const doc: AuthoringDoc = { format: AUTHORING_FORMAT, version: AUTHORING_VERSION, sections: {} };
  // Physical spreadsheet row numbers (header = row 1), counting blank rows we filtered.
  const all = parseCsvRows(text);
  const physical: number[] = [];
  all.forEach((r, i) => {
    if (r.some((c) => c.trim() !== "")) physical.push(i + 1);
  });

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (k: string) => {
      const i = col.get(k);
      return i === undefined ? "" : (cells[i] ?? "").trim();
    };
    const where = `Row ${physical[r]}`;
    const section = parseSection(get("section"));
    const mod = parseModule(get("module"));
    if (!section) {
      errors.push({ where, message: `section "${get("section")}" must be RW or Math.` });
      continue;
    }
    if (!mod) {
      errors.push({ where, message: `module "${get("module")}" must be 1, 2, 2E (easier) or 2H (harder).` });
      continue;
    }

    const choiceCells = LETTERS.map((L) => get(`choice_${L.toLowerCase()}`));
    const hasChoices = choiceCells.some(Boolean);
    const typeRaw = get("type").toLowerCase();
    const type: "mc" | "spr" | undefined =
      typeRaw === "mc" || typeRaw === "multiple choice" ? "mc" : typeRaw === "spr" || typeRaw === "grid" || typeRaw === "grid-in" ? "spr" : undefined;
    if (typeRaw && !type) errors.push({ where, message: `type "${get("type")}" must be mc or spr.` });

    const answerRaw = get("answer");
    const isSprRow = type ? type === "spr" : !hasChoices;
    const item: AuthoredItem = {
      stem: get("stem"),
      domain: get("domain"),
    };
    if (get("id")) item.id = get("id");
    if (type) item.type = type;
    if (get("stimulus")) item.stimulus = get("stimulus");
    if (hasChoices) item.choices = Object.fromEntries(LETTERS.map((L, i) => [L, choiceCells[i]])) as Record<Letter, string>;
    if (answerRaw) item.answer = isSprRow ? answerRaw.split("|").map((s) => s.trim()).filter(Boolean) : answerRaw;
    if (get("rationale")) item.rationale = get("rationale");
    if (get("skill")) item.skill = get("skill");
    if (get("difficulty")) item.difficulty = get("difficulty");
    if (get("pretest")) item.pretest = truthy(get("pretest"));
    if (get("html")) item.html = truthy(get("html"));
    const notes = Object.fromEntries(
      LETTERS.map((L) => [L, get(`note_${L.toLowerCase()}`)]).filter(([, v]) => v)
    ) as Partial<Record<Letter, string>>;
    if (Object.keys(notes).length) item.distractorNotes = notes;

    const solutions: SolutionPath[] = [];
    const desmos = get("desmos");
    if (desmos) {
      solutions.push({
        method: "desmos",
        label: "Graph it in Desmos",
        seconds: 30,
        steps: ["Type each expression into Desmos, in order.", "Read the answer off the graph or the computed value."],
        desmosExpressions: desmos.split(";").map((s) => s.trim()).filter(Boolean),
      });
    }
    const steps = get("solution_steps");
    if (steps) {
      solutions.push({
        method: section === "math" ? "algebra" : "reasoning",
        label: section === "math" ? "Do it by hand" : "Step by step",
        seconds: 60,
        steps: steps.split("|").map((s) => s.trim()).filter(Boolean),
      });
    }
    if (solutions.length) item.solutions = solutions;

    ROW.set(item, physical[r]);
    const sec = (doc.sections[section] ??= { module1: [] });
    (sec[mod] ??= []).push(item);
  }
  return { doc: errors.length && !Object.keys(doc.sections).length ? null : doc, errors, warnings };
}

// ---------------------------------------------------------------- validate + build

const MODULE_LABEL: Record<ModuleKey, string> = {
  module1: "module 1",
  module2: "module 2",
  module2Easier: "module 2 (easier)",
  module2Harder: "module 2 (harder)",
};

const ID_RE = /^[A-Za-z0-9_.-]{1,64}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

export function validateDoc(doc: AuthoringDoc, opts: { id: string; name: string }): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const missingRationale: string[] = [];
  const missingKey: string[] = [];
  const missingSkill: string[] = [];
  const missingDifficulty: string[] = [];
  const seenIds = new Map<string, string>();
  const sections: Section[] = [];
  const summary: ValidationResult["summary"] = { sections: [], questionCount: 0, missingKeys: 0 };
  let anyPretest = false;
  const docHtml = Boolean(doc.html);

  const order: SectionId[] = ["rw", "math"];
  const present = order.filter((s) => doc.sections?.[s]);
  if (!present.length) {
    errors.push({ where: "Test", message: "No questions found. Add an \"rw\" and/or \"math\" section." });
  } else if (present.length === 1) {
    warnings.push({ where: "Test", message: `Only ${SECTION_NAMES[present[0]]} is included, so this runs as a single-section test (a full SAT has both).` });
  }

  for (const sid of present) {
    const raw = doc.sections[sid] as AuthoredSection;
    const sname = sid === "rw" ? "RW" : "Math";
    if (typeof raw !== "object" || raw === null) {
      errors.push({ where: sname, message: "Section must be an object with module1 and module2." });
      continue;
    }

    const buildModule = (key: ModuleKey, modId: string): Module | null => {
      const list = raw[key];
      if (list === undefined) return null;
      if (!Array.isArray(list)) {
        errors.push({ where: `${sname} ${MODULE_LABEL[key]}`, message: "Must be a list of questions." });
        return { id: modId, items: [] };
      }
      const items: Item[] = [];
      list.forEach((it, idx) => {
        const row = it && typeof it === "object" ? ROW.get(it) : undefined;
        const loc = `${sname} ${MODULE_LABEL[key]}, Q${idx + 1}`;
        const where = row ? `Row ${row} (${loc})` : loc;
        const built = buildItem(it, where, sid, modId, idx, key);
        if (built) items.push(built);
      });
      if (!items.length && !list.length) {
        errors.push({ where: `${sname} ${MODULE_LABEL[key]}`, message: "Has no questions." });
      }
      return { id: modId, items };
    };

    const buildItem = (
      it: AuthoredItem,
      where: string,
      sid: SectionId,
      modId: string,
      idx: number,
      key: ModuleKey
    ): Item | null => {
      if (!it || typeof it !== "object") {
        errors.push({ where, message: "Not a question object." });
        return null;
      }
      const stem = str(it.stem);
      if (!stem) errors.push({ where, message: "stem is required." });

      // id
      let id = str(it.id);
      if (id && !ID_RE.test(id)) {
        errors.push({ where, message: `id "${id}" may only use letters, digits, ".", "_" and "-" (max 64).` });
      }
      if (!id) id = `${modId}-q${String(idx + 1).padStart(2, "0")}`;
      const prev = seenIds.get(id);
      // A shared module 2 legitimately reuses ids across routes; the doc only lists it once.
      if (prev) errors.push({ where, message: `Duplicate id "${id}" (also used at ${prev}).` });
      else seenIds.set(id, where);

      // domain / skill / difficulty
      const domainRaw = str(it.domain);
      const domain = domainRaw ? parseDomain(domainRaw) : null;
      if (!domainRaw) errors.push({ where, message: `domain is required (${DOMAINS[sid].join(", ")}).` });
      else if (!domain) errors.push({ where, message: `domain "${domainRaw}" is not recognised. Use one of: ${DOMAINS[sid].join(", ")}.` });
      else if (sectionOfDomain(domain) !== sid) {
        errors.push({ where, message: `domain "${domain}" belongs to ${SECTION_NAMES[sectionOfDomain(domain)]}, not ${SECTION_NAMES[sid]}.` });
      }
      const skill = str(it.skill);
      if (!skill) missingSkill.push(where);
      const diffRaw = str(it.difficulty);
      let difficulty: Difficulty = "M";
      if (!diffRaw) missingDifficulty.push(where);
      else {
        const d = parseDifficulty(diffRaw);
        if (!d) errors.push({ where, message: `difficulty "${diffRaw}" must be E, M or H (easy / medium / hard).` });
        else difficulty = d;
      }

      // type
      const choicesRaw = it.choices;
      let choiceMap: Partial<Record<Letter, string>> | null = null;
      if (Array.isArray(choicesRaw)) {
        if (choicesRaw.length !== 4) errors.push({ where, message: `choices must have exactly 4 entries (got ${choicesRaw.length}).` });
        choiceMap = Object.fromEntries(LETTERS.map((L, i) => [L, str(choicesRaw[i])]));
      } else if (choicesRaw && typeof choicesRaw === "object") {
        const extra = Object.keys(choicesRaw).filter((k) => !LETTERS.includes(k as Letter));
        if (extra.length) errors.push({ where, message: `choices may only use keys A, B, C, D (found ${extra.join(", ")}).` });
        choiceMap = Object.fromEntries(LETTERS.map((L) => [L, str((choicesRaw as Record<string, unknown>)[L])]));
      }
      const hasChoices = choiceMap ? Object.values(choiceMap).some(Boolean) : false;
      if (it.type !== undefined && it.type !== "mc" && it.type !== "spr") {
        errors.push({ where, message: `type "${String(it.type)}" must be "mc" or "spr".` });
      }
      const type: "mc" | "spr" = it.type === "mc" || it.type === "spr" ? it.type : hasChoices ? "mc" : "spr";
      if (type === "spr" && sid === "rw") {
        errors.push({ where, message: "Reading and Writing questions must be multiple choice (four choices A-D)." });
      }

      const rationale = str(it.rationale);
      if (!rationale) missingRationale.push(where);
      const pretest = it.pretest === true || (typeof it.pretest === "string" && truthy(it.pretest));
      if (pretest) anyPretest = true;
      const html = docHtml || it.html === true;

      let distractorNotes: Partial<Record<Letter, string>> | undefined;
      if (it.distractorNotes && typeof it.distractorNotes === "object") {
        distractorNotes = {};
        for (const [k, v] of Object.entries(it.distractorNotes)) {
          if (LETTERS.includes(k as Letter) && str(v)) distractorNotes[k as Letter] = str(v);
          else if (!LETTERS.includes(k as Letter)) warnings.push({ where, message: `distractor note "${k}" ignored (use A-D).` });
        }
        if (!Object.keys(distractorNotes).length) distractorNotes = undefined;
      }

      let solutions: SolutionPath[] | undefined;
      if (it.solutions !== undefined) {
        if (!Array.isArray(it.solutions)) errors.push({ where, message: "solutions must be a list." });
        else {
          solutions = [];
          it.solutions.forEach((s, i) => {
            const ok =
              s && typeof s === "object" &&
              ["desmos", "algebra", "reasoning"].includes(s.method) &&
              typeof s.label === "string" &&
              Array.isArray(s.steps) && s.steps.every((x) => typeof x === "string");
            if (!ok) {
              errors.push({ where, message: `solutions[${i}] needs method (desmos|algebra|reasoning), label, and steps (list of strings).` });
              return;
            }
            solutions!.push({
              method: s.method,
              label: s.label,
              seconds: Number.isFinite(s.seconds) && s.seconds > 0 ? s.seconds : s.method === "desmos" ? 30 : 60,
              steps: s.steps,
              ...(Array.isArray(s.desmosExpressions) ? { desmosExpressions: s.desmosExpressions.map(String) } : {}),
              ...(s.whenToUse ? { whenToUse: String(s.whenToUse) } : {}),
            });
          });
          if (!solutions.length) solutions = undefined;
        }
      }

      const base = {
        id,
        domain: (domain ?? DOMAINS[sid][0]) as Domain,
        skill: skill || domain || "General",
        difficulty,
        ...(pretest ? { pretest: true } : {}),
        ...(str(it.stimulus) ? { stimulus: str(it.stimulus) } : {}),
        stem,
        rationale,
        ...(html ? { html: true } : {}),
        ...(distractorNotes ? { distractorNotes } : {}),
        ...(solutions ? { solutions } : {}),
        ...(it.expectedPace ? { expectedPace: it.expectedPace } : {}),
      };

      void key;
      if (type === "mc") {
        if (!choiceMap || !hasChoices) {
          errors.push({ where, message: "Multiple choice needs four choices (A, B, C, D)." });
          return null;
        }
        const empty = LETTERS.filter((L) => !choiceMap![L]);
        if (empty.length) errors.push({ where, message: `choice${empty.length > 1 ? "s" : ""} ${empty.join(", ")} ${empty.length > 1 ? "are" : "is"} empty.` });
        const texts = LETTERS.map((L) => norm(choiceMap![L] ?? "")).filter(Boolean);
        if (new Set(texts).size !== texts.length) warnings.push({ where, message: "Two choices have the same text." });
        const ans = Array.isArray(it.answer) ? str(it.answer[0]) : str(it.answer);
        let correct = "" as Letter;
        let keySource: Item["keySource"];
        if (!ans) {
          missingKey.push(where);
          keySource = "missing";
        } else {
          const letter = ans.toUpperCase().replace(/[().\s]/g, "");
          if (!LETTERS.includes(letter as Letter)) errors.push({ where, message: `answer "${ans}" must be A, B, C or D.` });
          else {
            correct = letter as Letter;
            keySource = it.keySource === "solved" ? "solved" : "paper";
          }
        }
        if (distractorNotes && correct && distractorNotes[correct]) {
          warnings.push({ where, message: `There is a distractor note on the correct answer (${correct}).` });
        }
        return {
          ...base,
          format: "mc",
          choices: LETTERS.map((L) => ({ id: L, text: choiceMap![L] ?? "" })),
          correct,
          ...(keySource ? { keySource } : {}),
        };
      }

      if (hasChoices) warnings.push({ where, message: "Choices on a student-produced response question were ignored." });
      const answers = (Array.isArray(it.answer) ? it.answer : it.answer !== undefined ? String(it.answer).split("|") : [])
        .map(str)
        .filter(Boolean);
      let keySource: Item["keySource"] = "paper";
      if (!answers.length) {
        missingKey.push(where);
        keySource = "missing";
      }
      let ok = true;
      for (const a of answers) {
        const c = checkSprAnswer(a);
        if (!c.ok) {
          ok = false;
          errors.push({ where, message: `SPR answer ${c.message}.` });
        } else if (c.warn) warnings.push({ where, message: c.warn });
      }
      if (answers.length && it.keySource === "solved") keySource = "solved";
      return {
        ...base,
        format: "spr",
        accepted: ok ? sprEquivalents(answers) : answers,
        keySource,
      };
    };

    const m1 = buildModule("module1", `${sid}-m1`) ?? (errors.push({ where: sname, message: "module1 is required." }), { id: `${sid}-m1`, items: [] });
    const shared = buildModule("module2", `${sid}-m2`);
    const easier = buildModule("module2Easier", `${sid}-m2e`);
    const harder = buildModule("module2Harder", `${sid}-m2h`);
    let lower: Module;
    let upper: Module;
    if (shared && (easier || harder)) {
      errors.push({ where: sname, message: "Give either one module2 (used for both routes) or module2Easier + module2Harder, not both." });
      lower = upper = shared;
    } else if (shared) {
      lower = upper = shared;
    } else if (easier && harder) {
      lower = easier;
      upper = harder;
    } else if (easier || harder) {
      errors.push({ where: sname, message: `Only module 2 (${easier ? "easier" : "harder"}) was given. Add the other one, or call it module 2 to use one set for both routes.` });
      lower = upper = (easier ?? harder)!;
    } else {
      errors.push({ where: sname, message: "Module 2 is missing. Add module 2 (one set for both routes) or 2E + 2H." });
      lower = upper = { id: `${sid}-m2`, items: [] };
    }

    // Structure vs the real test: warnings only.
    const exp = EXPECTED[sid];
    const checkCount = (m: Module, label: string) => {
      if (m.items.length && m.items.length !== exp.items) {
        warnings.push({ where: `${sname} ${label}`, message: `${m.items.length} questions; the digital SAT has ${exp.items} per ${SECTION_NAMES[sid]} module (${exp.items - exp.pretest} scored + ${exp.pretest} pretest).` });
      }
      const p = m.items.filter((i) => i.pretest).length;
      if (p > 0 && p !== exp.pretest) {
        warnings.push({ where: `${sname} ${label}`, message: `${p} pretest (unscored) questions; the SAT uses ${exp.pretest}.` });
      }
      if (m.items.length && m.items.every((i) => i.pretest)) {
        errors.push({ where: `${sname} ${label}`, message: "Every question is marked pretest, so nothing would be scored." });
      }
      if (sid === "rw") {
        const rank = (d: Domain) => DOMAINS.rw.indexOf(d);
        const ranks = m.items.map((i) => rank(i.domain));
        if (ranks.some((r, i) => i > 0 && r < ranks[i - 1])) {
          warnings.push({ where: `${sname} ${label}`, message: "Domains are out of SAT order (Craft and Structure, Information and Ideas, Standard English Conventions, Expression of Ideas)." });
        }
      }
    };
    checkCount(m1, "module 1");
    if (lower === upper) checkCount(lower, "module 2");
    else {
      checkCount(lower, "module 2 (easier)");
      checkCount(upper, "module 2 (harder)");
    }

    const operational = m1.items.filter((i) => !i.pretest).length;
    let routeUpAt = Math.round(operational * 0.6);
    if (raw.routeUpAt !== undefined) {
      const r = Number(raw.routeUpAt);
      if (!Number.isInteger(r) || r < 0 || r > operational) {
        errors.push({ where: sname, message: `routeUpAt must be a whole number from 0 to ${operational} (scored questions in module 1).` });
      } else routeUpAt = r;
    }
    let minutes: number = exp.minutes;
    if (raw.minutes !== undefined) {
      const m = Number(raw.minutes);
      if (!Number.isFinite(m) || m <= 0 || m > 180) errors.push({ where: sname, message: "minutes must be between 1 and 180." });
      else minutes = m;
    }

    sections.push({
      id: sid,
      name: SECTION_NAMES[sid],
      secondsPerModule: Math.round(minutes * 60),
      module1: m1,
      module2: { lower, upper },
      routeUpAt,
    });
    const allItems = [...m1.items, ...upper.items, ...(lower === upper ? [] : lower.items)];
    summary.sections.push({
      id: sid,
      name: SECTION_NAMES[sid],
      module1: m1.items.length,
      module2: lower === upper ? upper.items.length : { easier: lower.items.length, harder: upper.items.length },
      pretest: allItems.filter((i) => i.pretest).length,
      spr: allItems.filter((i) => i.format === "spr").length,
    });
    summary.questionCount += m1.items.length + upper.items.length;
  }

  const group = (list: string[], message: string) => {
    if (!list.length) return;
    const shown = list.slice(0, 12).join("; ");
    warnings.push({ where: `${list.length} question${list.length > 1 ? "s" : ""}`, message: `${message}: ${shown}${list.length > 12 ? `; and ${list.length - 12} more` : ""}.` });
  };
  group(missingKey, "No answer key, so the test is not scorable until you add keys (or use AI solve)");
  group(missingRationale, "No rationale, so students see no explanation");
  group(missingSkill, "No skill; the domain is used instead");
  group(missingDifficulty, "No difficulty; defaulted to M");
  if (present.length && !anyPretest) {
    warnings.push({ where: "Test", message: "No pretest questions. That's fine; every question will be scored." });
  }
  summary.missingKeys = missingKey.length;

  let breakSeconds = 600;
  if (doc.breakMinutes !== undefined) {
    const b = Number(doc.breakMinutes);
    if (!Number.isFinite(b) || b < 0 || b > 60) errors.push({ where: "Test", message: "breakMinutes must be between 0 and 60." });
    else breakSeconds = Math.round(b * 60);
  }

  const form: TestForm | null = errors.length
    ? null
    : { id: opts.id, name: opts.name, breakSeconds, sections };
  return { form, errors, warnings, scorable: missingKey.length === 0, summary };
}

/** Parse + validate an uploaded file in one step. */
export function parseUpload(
  kind: "csv" | "json",
  text: string,
  opts: { id: string; name: string }
): ValidationResult & { doc: AuthoringDoc | null } {
  const parsed = kind === "csv" ? parseCsvDoc(text) : { ...parseJsonDoc(text), warnings: [] as Issue[] };
  if (!parsed.doc) {
    return {
      doc: null,
      form: null,
      errors: parsed.errors,
      warnings: parsed.warnings,
      scorable: false,
      summary: { sections: [], questionCount: 0, missingKeys: 0 },
    };
  }
  const v = validateDoc(parsed.doc, opts);
  const errors = [...parsed.errors, ...v.errors];
  return { ...v, doc: parsed.doc, errors, warnings: [...parsed.warnings, ...v.warnings], form: errors.length ? null : v.form };
}

// ---------------------------------------------------------------- export (editor / download)

function itemToAuthored(it: Item): AuthoredItem {
  const out: AuthoredItem = {
    id: it.id,
    type: it.format,
    ...(it.stimulus ? { stimulus: it.stimulus } : {}),
    stem: it.stem,
    domain: it.domain,
    skill: it.skill,
    difficulty: it.difficulty,
    ...(it.pretest ? { pretest: true } : {}),
    rationale: it.rationale,
    ...(it.html ? { html: true } : {}),
    ...(it.distractorNotes ? { distractorNotes: it.distractorNotes } : {}),
    ...(it.solutions ? { solutions: it.solutions } : {}),
    ...(it.keySource ? { keySource: it.keySource } : {}),
    ...(it.expectedPace ? { expectedPace: it.expectedPace } : {}),
  };
  if (it.format === "mc") {
    out.choices = Object.fromEntries(it.choices.map((c) => [c.id, c.text]));
    if (it.correct) out.answer = it.correct;
  } else if (it.accepted.length) {
    out.answer = [...it.accepted];
  }
  return out;
}

export function formToDoc(form: TestForm, meta?: { title?: string; collection?: string }): AuthoringDoc {
  const doc: AuthoringDoc = {
    format: AUTHORING_FORMAT,
    version: AUTHORING_VERSION,
    ...(meta?.title ? { title: meta.title } : {}),
    ...(meta?.collection ? { collection: meta.collection } : {}),
    breakMinutes: form.breakSeconds / 60,
    sections: {},
  };
  for (const s of form.sections) {
    const sec: AuthoredSection = {
      module1: s.module1.items.map(itemToAuthored),
      routeUpAt: s.routeUpAt,
      minutes: s.secondsPerModule / 60,
    };
    const same =
      s.module2.lower === s.module2.upper ||
      s.module2.lower.id === s.module2.upper.id ||
      (s.module2.lower.items.length === s.module2.upper.items.length &&
        s.module2.lower.items.every((it, i) => it.id === s.module2.upper.items[i].id));
    if (same) sec.module2 = s.module2.upper.items.map(itemToAuthored);
    else {
      sec.module2Easier = s.module2.lower.items.map(itemToAuthored);
      sec.module2Harder = s.module2.upper.items.map(itemToAuthored);
    }
    doc.sections[s.id] = sec;
  }
  return doc;
}

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function docToCsv(doc: AuthoringDoc): string {
  const lines = [CSV_COLUMNS.join(",")];
  const mods: [ModuleKey, string][] = [
    ["module1", "1"],
    ["module2", "2"],
    ["module2Easier", "2E"],
    ["module2Harder", "2H"],
  ];
  for (const sid of ["rw", "math"] as SectionId[]) {
    const sec = doc.sections[sid];
    if (!sec) continue;
    for (const [key, label] of mods) {
      for (const it of sec[key] ?? []) {
        const choices = Array.isArray(it.choices)
          ? Object.fromEntries(LETTERS.map((L, i) => [L, (it.choices as string[])[i] ?? ""]))
          : (it.choices ?? {});
        const desmos = it.solutions?.find((s) => s.method === "desmos");
        const steps = it.solutions?.find((s) => s.method !== "desmos");
        const row: Record<(typeof CSV_COLUMNS)[number], string> = {
          section: sid === "rw" ? "RW" : "Math",
          module: label,
          id: it.id ?? "",
          type: it.type ?? (it.choices ? "mc" : "spr"),
          domain: it.domain ?? "",
          skill: it.skill ?? "",
          difficulty: it.difficulty ?? "",
          pretest: it.pretest ? "yes" : "",
          stimulus: it.stimulus ?? "",
          stem: it.stem ?? "",
          choice_a: (choices as Record<string, string>).A ?? "",
          choice_b: (choices as Record<string, string>).B ?? "",
          choice_c: (choices as Record<string, string>).C ?? "",
          choice_d: (choices as Record<string, string>).D ?? "",
          answer: Array.isArray(it.answer) ? it.answer.join("|") : (it.answer ?? ""),
          rationale: it.rationale ?? "",
          note_a: it.distractorNotes?.A ?? "",
          note_b: it.distractorNotes?.B ?? "",
          note_c: it.distractorNotes?.C ?? "",
          note_d: it.distractorNotes?.D ?? "",
          solution_steps: steps ? steps.steps.join(" | ") : "",
          desmos: desmos?.desmosExpressions?.join("; ") ?? "",
          html: it.html ? "yes" : "",
        };
        lines.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(","));
      }
    }
  }
  return lines.join("\r\n") + "\r\n";
}
