import type { Item } from "./types";
import { isSpr } from "./types";

export type DesmosExpression = {
  latex: string;
  color: string;
  label?: string;
  description?: string;
};

export type KeyPoint = {
  x: number;
  y: number;
  label: string;
  highlight?: boolean;
};

export type SvgCurve =
  | { type: "parabola"; a: number; b: number; c: number; color: string }
  | { type: "line"; m: number; b: number; color: string }
  | { type: "vertical-line"; x: number; color: string }
  | { type: "circle"; cx: number; cy: number; r: number; color: string }
  | { type: "exponential"; a: number; base: number; color: string };

export type DesmosModel = {
  title: string;
  canGraph: boolean;
  expressions: DesmosExpression[];
  keyPoints: KeyPoint[];
  viewBox: { xMin: number; xMax: number; yMin: number; yMax: number };
  curveType:
    | "quadratic"
    | "linear"
    | "system"
    | "circle"
    | "exponential"
    | "equation"
    | "inequality"
    | "points"
    | "calculation"
    | "geometry";
  curves: SvgCurve[];
  desmosInstructions: string[];
  proTip: string;
};

export type SolveStep = {
  stepNumber: number;
  title: string;
  detail: string;
};

export type StepsToSolveModel = {
  title: string;
  steps: SolveStep[];
  correctAnswerKey: string;
  correctAnswerText: string;
  fullRationale: string;
};

export type ProblemSolution = {
  isMath: boolean;
  topicTitle: string;
  showDesmos: boolean;
  desmos: DesmosModel;
  stepsToSolve: StepsToSolveModel;
};

const COLOR_BLUE = "#38bdf8";
const COLOR_RED = "#ef4444";
const COLOR_GREEN = "#10b981";
const COLOR_PURPLE = "#a855f7";
const COLOR_AMBER = "#f59e0b";

/**
 * Extracts and synthesizes a high-accuracy solution and a 3-step structured
 * walkthrough for any SAT question.
 *
 * Desmos is selectively enabled ONLY when it provides a genuine strategic
 * advantage (faster and easier than manual calculation).
 */
export function resolveProblemSolution(
  item: Item,
  rationaleOverride?: string
): ProblemSolution {
  const isMath = checkIsMath(item);
  const rationale = rationaleOverride || item.rationale || "";
  const stem = item.stem || "";
  const anyItem = item as any;

  // Resolve correct answer key and choice text
  const answerKey =
    (isSpr(item) ? item.accepted?.[0] : item.correct) ||
    anyItem.correct ||
    anyItem.accepted?.[0] ||
    anyItem.answer ||
    anyItem.key ||
    "—";

  let answerText = answerKey;
  if (!isSpr(item) && item.choices) {
    const matchedChoice = item.choices.find((c) => c.id === answerKey);
    if (matchedChoice) {
      answerText = `(${matchedChoice.id}) ${matchedChoice.text}`;
    }
  }

  const topicTitle =
    item.skill && item.skill !== "Imported"
      ? item.skill
      : item.domain || (isMath ? "SAT Math Problem" : "Reading & Writing");

  // If Reading & Writing (non-math), return non-Desmos steps
  if (!isMath) {
    return {
      isMath: false,
      topicTitle,
      showDesmos: false,
      desmos: {
        title: "Reading & Writing Question",
        canGraph: false,
        expressions: [],
        keyPoints: [],
        viewBox: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        curveType: "geometry",
        curves: [],
        desmosInstructions: [],
        proTip: "Use active reading: eliminate wrong answers before confirming the best choice.",
      },
      stepsToSolve: {
        title: "Steps to Solve",
        steps: buildRwSteps(item, rationale, answerText),
        correctAnswerKey: answerKey,
        correctAnswerText: answerText,
        fullRationale: rationale,
      },
    };
  }

  // MATH SOLVER
  const parsed = parseMathProblem(stem, rationale, item);
  const showDesmos = isDesmosAdvantageous(item, parsed);

  return {
    isMath: true,
    topicTitle,
    showDesmos,
    desmos: parsed.desmos,
    stepsToSolve: {
      title: "Steps to Solve",
      steps: parsed.steps,
      correctAnswerKey: answerKey,
      correctAnswerText: answerText,
      fullRationale: rationale,
    },
  };
}

function checkIsMath(item: Item): boolean {
  if (item.id.toLowerCase().includes("math")) return true;
  if (item.id.toLowerCase().includes("rw")) return false;
  const domain = (item.domain || "").toLowerCase();
  if (
    domain.includes("algebra") ||
    domain.includes("advanced math") ||
    domain.includes("problem-solving") ||
    domain.includes("geometry") ||
    domain.includes("trigonometry") ||
    domain.includes("math")
  ) {
    return true;
  }
  return false;
}

/**
 * Determines whether Desmos provides a genuine strategic advantage (faster and easier)
 * over manual calculation.
 */
export function isDesmosAdvantageous(
  item: Item,
  parsed: ParsedMathResult
): boolean {
  const text = `${item.stem} ${item.skill || ""} ${item.domain || ""}`.toLowerCase();

  // Exclude pure geometry, trigonometry, statistics, and percentages
  // where coordinate graphing in Desmos is slower, irrelevant, or non-applicable.
  const isGeometryOrTrig =
    text.includes("right triangle") ||
    text.includes("pythagorean") ||
    text.includes("hypotenuse") ||
    text.includes("sine") ||
    text.includes("cosine") ||
    text.includes("tangent") ||
    text.includes("cos(") ||
    text.includes("sin(") ||
    text.includes("tan(") ||
    text.includes("arc length") ||
    text.includes("sector") ||
    text.includes("central angle") ||
    text.includes("radians") ||
    text.includes("parallel lines") ||
    text.includes("alternate interior") ||
    text.includes("congruent") ||
    text.includes("similar triangle");

  if (isGeometryOrTrig && !text.includes("xy-plane") && !text.includes("circle in the xy")) {
    return false;
  }

  const isStatsOrPercent =
    text.includes("mean") ||
    text.includes("median") ||
    text.includes("average") ||
    text.includes("standard deviation") ||
    text.includes("margin of error") ||
    text.includes("sample") ||
    text.includes("survey") ||
    text.includes("percent") ||
    text.includes("discount") ||
    text.includes("ratio") ||
    text.includes("proportion");

  if (isStatsOrPercent) {
    return false;
  }

  // 1. Systems of equations (2 equations, 2 variables):
  // Desmos is 5x faster than by-hand elimination/substitution.
  if (parsed.desmos.curveType === "system") {
    return true;
  }

  // 2. Quadratics / Parabolas (vertex, min/max, roots, factoring):
  // Desmos gray snap dots show (h, k) and roots in 3 seconds.
  if (parsed.desmos.curveType === "quadratic") {
    return true;
  }

  // 3. Circle in coordinate plane:
  // Desmos graphs implicit (x - h)^2 + (y - k)^2 = r^2 directly without completing the square.
  if (parsed.desmos.curveType === "circle") {
    return true;
  }

  // 4. Linear Inequalities:
  // Desmos automatically shades the solution region and plots dashed/solid boundary lines.
  if (parsed.desmos.curveType === "inequality") {
    return true;
  }

  // 5. Points / coordinate line regression:
  if (parsed.desmos.curveType === "points") {
    return true;
  }

  // 6. Equations in one variable:
  // Only advantageous if complex: rational, radical, absolute value, or factored polynomial.
  // Basic 1-step or 2-step linear equations (e.g. 3(x - 2) = 15 or 4x + 7 = 23) are FASTER by hand!
  if (parsed.desmos.curveType === "equation") {
    const eq = parsed.desmos.expressions[0]?.latex || item.stem;
    const isComplex =
      eq.includes("/") ||
      eq.includes("^") ||
      eq.includes("|") ||
      eq.includes("sqrt") ||
      (eq.match(/\([^\)]+\)/g) || []).length >= 2;

    return isComplex;
  }

  // Fallback calculations, arithmetic word problems: NOT advantageous in Desmos.
  return false;
}

/**
 * Builds structured steps for Reading & Writing questions.
 */
function buildRwSteps(
  item: Item,
  rationale: string,
  answerText: string
): SolveStep[] {
  const steps: SolveStep[] = [];

  // Step 1: Analyze question prompt & text
  steps.push({
    stepNumber: 1,
    title: "Analyze the Passage & Prompt",
    detail: item.stimulus
      ? "Identify the core claim, tone, or grammatical relationship being tested in the passage."
      : "Read the stem carefully to determine exactly what information or structural choice is required.",
  });

  // Step 2: Apply elimination and College Board rules
  steps.push({
    stepNumber: 2,
    title: "Evaluate Choices & Eliminate Traps",
    detail:
      "Eliminate options that introduce punctuation splices, contradictory transitions, or unsupported claims outside the text scope.",
  });

  // Step 3: Confirm correct answer
  steps.push({
    stepNumber: 3,
    title: "Confirm the Answer",
    detail: `Choice ${answerText} best fulfills the requirement: ${cleanFirstSentence(
      rationale
    )}`,
  });

  return steps;
}

// -----------------------------------------------------------------------
// MATH PROBLEM PARSING & SOLVING LOGIC
// -----------------------------------------------------------------------

type ParsedMathResult = {
  desmos: DesmosModel;
  steps: SolveStep[];
};

function parseMathProblem(
  stem: string,
  rationale: string,
  item: Item
): ParsedMathResult {
  const textCombined = `${stem}\n${rationale}`;

  // Currency & formatting clean
  const clean = textCombined
    .replace(/\$([0-9]+(?:\.[0-9]+)?)/g, "$1")
    .replace(/[*_#]/g, "");

  // 1. Check for Systems of Linear Equations (e.g. 2x + y = 10 and x - y = 2)
  const system = tryParseLinearSystem(clean, stem, rationale);
  if (system) return system;

  // 2. Check for Circle Equations (xy-plane)
  const circle = tryParseCircle(clean, stem, rationale);
  if (circle) return circle;

  // 3. Check for Quadratics / Parabolas (standard, vertex, or factored form)
  const quadratic = tryParseQuadratic(clean, stem, rationale);
  if (quadratic) return quadratic;

  // 4. Check for Coordinates / Two-point lines
  const pointsLine = tryParseTwoPoints(clean, stem, rationale);
  if (pointsLine) return pointsLine;

  // 5. Check for Linear Inequalities (e.g. 3x - 4 > 8)
  const inequality = tryParseInequality(clean, stem, rationale);
  if (inequality) return inequality;

  // 6. Check for Function evaluation (e.g. P(x) = x^2 + 3x - 4, what is P(2))
  const funcEval = tryParseFunctionEval(clean, stem, rationale);
  if (funcEval) return funcEval;

  // 7. Check for Single-Variable Linear Equation (e.g. 2(x + 3) - 5 = 15)
  const singleVar = tryParseSingleVarEquation(clean, stem, rationale);
  if (singleVar) return singleVar;

  // 8. Specialized & Arithmetic Fallbacks (Geometry, Statistics, Rates, Percentages)
  return buildSpecializedFallback(clean, stem, rationale, item);
}

// -----------------------------------------------------------------------
// 1. SYSTEM OF LINEAR EQUATIONS
// -----------------------------------------------------------------------
function tryParseLinearSystem(
  clean: string,
  stem: string,
  rationale: string
): ParsedMathResult | null {
  const lineMatches = Array.from(
    clean.matchAll(
      /([-+]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d*\.?\d*)\s*y\s*=\s*([-+]?\s*\d+\.?\d*)/gi
    )
  );

  if (lineMatches.length < 2) {
    const mSlope = clean.match(
      /y\s*=\s*([-+]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d+\.?\d*)?/i
    );
    const mStandard = clean.match(
      /([-+]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d*\.?\d*)\s*y\s*=\s*([-+]?\s*\d+\.?\d*)/i
    );
    if (!mSlope || !mStandard) return null;
  }

  const parseCoeffs = (m: RegExpMatchArray) => {
    let aStr = (m[1] || "").replace(/\s+/g, "");
    if (aStr === "" || aStr === "+") aStr = "1";
    if (aStr === "-") aStr = "-1";
    const a = parseFloat(aStr);

    let bStr = (m[2] || "").replace(/\s+/g, "");
    if (bStr === "" || bStr === "+") bStr = "1";
    if (bStr === "-") bStr = "-1";
    const b = parseFloat(bStr);

    const c = parseFloat(m[3].replace(/\s+/g, ""));
    return { a, b, c, text: m[0].trim() };
  };

  const eq1 = parseCoeffs(lineMatches[0]);
  const eq2 = parseCoeffs(lineMatches[1]);

  const det = eq1.a * eq2.b - eq2.a * eq1.b;

  let ix = 0;
  let iy = 0;
  let hasUnique = false;

  if (Math.abs(det) > 1e-6) {
    ix = Math.round(((eq1.c * eq2.b - eq2.c * eq1.b) / det) * 100) / 100;
    iy = Math.round(((eq1.a * eq2.c - eq2.a * eq1.c) / det) * 100) / 100;
    hasUnique = true;
  }

  const curves: SvgCurve[] = [];
  if (Math.abs(eq1.b) > 1e-6) {
    curves.push({
      type: "line",
      m: -eq1.a / eq1.b,
      b: eq1.c / eq1.b,
      color: COLOR_RED,
    });
  } else {
    curves.push({
      type: "vertical-line",
      x: eq1.c / eq1.a,
      color: COLOR_RED,
    });
  }

  if (Math.abs(eq2.b) > 1e-6) {
    curves.push({
      type: "line",
      m: -eq2.a / eq2.b,
      b: eq2.c / eq2.b,
      color: COLOR_BLUE,
    });
  } else {
    curves.push({
      type: "vertical-line",
      x: eq2.c / eq2.a,
      color: COLOR_BLUE,
    });
  }

  const cx = hasUnique ? ix : 0;
  const cy = hasUnique ? iy : 0;
  const span = Math.max(8, Math.abs(cx) + 4, Math.abs(cy) + 4);

  const expressions: DesmosExpression[] = [
    {
      latex: eq1.text,
      color: COLOR_RED,
      label: "Line 1",
    },
    {
      latex: eq2.text,
      color: COLOR_BLUE,
      label: "Line 2",
    },
  ];

  const keyPoints: KeyPoint[] = [];
  if (hasUnique) {
    expressions.push({
      latex: `(${ix}, ${iy})`,
      color: COLOR_GREEN,
      label: "Intersection",
    });
    keyPoints.push({
      x: ix,
      y: iy,
      label: "Intersection",
      highlight: true,
    });
  }

  const desmosInstructions = [
    `Type Line 1: "${eq1.text}" directly into row 1.`,
    `Type Line 2: "${eq2.text}" directly into row 2.`,
    hasUnique
      ? `Click the gray intersection dot where the lines cross: Desmos reveals (${ix}, ${iy}).`
      : `Compare slopes: if parallel, lines never intersect (no solution) or coincide (infinitely many).`,
  ];

  const steps: SolveStep[] = [
    {
      stepNumber: 1,
      title: "Identify the Given Linear System",
      detail: `The problem provides two linear constraints: $${eq1.text}$ and $${eq2.text}$.`,
    },
    {
      stepNumber: 2,
      title: "Find Intersection Point",
      detail: hasUnique
        ? `Enter both lines into Desmos. The lines intersect at $(x, y) = (${ix}, ${iy})$. By algebraic elimination: solving gives $x = ${ix}$ and $y = ${iy}$.`
        : `The determinant is zero, meaning the lines have equal slopes (parallel).`,
    },
    {
      stepNumber: 3,
      title: "Conclude Final Value",
      detail: rationale
        ? cleanFirstSentence(rationale)
        : `Read the required coordinate directly from the intersection point (${ix}, ${iy}).`,
    },
  ];

  return {
    desmos: {
      title: "System of Linear Equations",
      canGraph: true,
      expressions,
      keyPoints,
      viewBox: {
        xMin: cx - span,
        xMax: cx + span,
        yMin: cy - span,
        yMax: cy + span,
      },
      curveType: "system",
      curves,
      desmosInstructions,
      proTip:
        "On the SAT, never spend 3 minutes doing elimination algebra: type both equations into Desmos and click the intersection point.",
    },
    steps,
  };
}

// -----------------------------------------------------------------------
// 2. CIRCLE EQUATIONS
// -----------------------------------------------------------------------
function tryParseCircle(
  clean: string,
  stem: string,
  rationale: string
): ParsedMathResult | null {
  const centerRadiusMatch = clean.match(
    /\(x\s*([+-]\s*\d+(?:\.\d+)?)\)\^2\s*\+\s*\(y\s*([+-]\s*\d+(?:\.\d+)?)\)\^2\s*=\s*(\d+(?:\.\d+)?)/i
  );

  const generalMatch = clean.match(
    /x\^2\s*\+\s*y\^2\s*([+-]\s*\d+(?:\.\d+)?x)?\s*([+-]\s*\d+(?:\.\d+)?y)?\s*([+-]\s*\d+(?:\.\d+)?)?\s*=\s*0/i
  );

  if (!centerRadiusMatch && !generalMatch && !clean.toLowerCase().includes("circle in the xy")) {
    return null;
  }

  let h = 0;
  let k = 0;
  let r = 5;
  let eqText = "(x - 0)^2 + (y - 0)^2 = 25";

  if (centerRadiusMatch) {
    const hSign = centerRadiusMatch[1].replace(/\s+/g, "");
    h = -parseFloat(hSign);
    const kSign = centerRadiusMatch[2].replace(/\s+/g, "");
    k = -parseFloat(kSign);
    const rSq = parseFloat(centerRadiusMatch[3]);
    r = Math.sqrt(rSq);
    eqText = centerRadiusMatch[0];
  } else if (generalMatch) {
    eqText = generalMatch[0];
    const ptMatch = rationale.match(/\((-?\d+),\s*(-?\d+)\)/);
    if (ptMatch) {
      h = parseInt(ptMatch[1], 10);
      k = parseInt(ptMatch[2], 10);
    }
    const rMatch = rationale.match(/(?:radius|r)\s*(?:=|is)\s*(\d+(?:\.\d+)?)/i);
    if (rMatch) {
      r = parseFloat(rMatch[1]);
    }
  } else {
    const rMatch = clean.match(/radius\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/i);
    if (rMatch) r = parseFloat(rMatch[1]);
    eqText = `(x - ${h})^2 + (y - ${k})^2 = ${r * r}`;
  }

  const curves: SvgCurve[] = [
    {
      type: "circle",
      cx: h,
      cy: k,
      r,
      color: COLOR_PURPLE,
    },
  ];

  const expressions: DesmosExpression[] = [
    {
      latex: eqText,
      color: COLOR_PURPLE,
      label: "Circle Equation",
    },
    {
      latex: `(${h}, ${k})`,
      color: COLOR_BLUE,
      label: "Center",
    },
  ];

  const keyPoints: KeyPoint[] = [
    { x: h, y: k, label: "Center", highlight: true },
    { x: h + r, y: k, label: `Radius = ${r}` },
  ];

  const pad = r + 4;
  const viewBox = {
    xMin: h - pad,
    xMax: h + pad,
    yMin: k - pad,
    yMax: k + pad,
  };

  const steps: SolveStep[] = [
    {
      stepNumber: 1,
      title: "Identify Standard Circle Equation Form",
      detail: `Recall standard circle form: $(x - h)^2 + (y - k)^2 = r^2$, where $(h, k)$ is the center and $r$ is the radius.`,
    },
    {
      stepNumber: 2,
      title: "Determine Center & Radius",
      detail: `The equation gives center $(h, k) = (${h}, ${k})$ and radius $r = \\sqrt{${r * r}} = ${r}$.`,
    },
    {
      stepNumber: 3,
      title: "Confirm the Answer",
      detail: rationale
        ? cleanFirstSentence(rationale)
        : `The radius is ${r} and center is (${h}, ${k}).`,
    },
  ];

  return {
    desmos: {
      title: "Circle in the xy-Plane",
      canGraph: true,
      expressions,
      keyPoints,
      viewBox,
      curveType: "circle",
      curves,
      desmosInstructions: [
        `Type "${eqText}" directly into row 1. Desmos plots the entire circle instantly without solving for y.`,
        `Type "(${h}, ${k})" into row 2 to highlight the center point.`,
        `Count or subtract coordinates from center to the rightmost point (${h + r}, ${k}) to verify radius $r = ${r}$.`,
      ],
      proTip:
        "Desmos graphs implicit circle equations directly! You never need to complete the square by hand if you can verify by plotting.",
    },
    steps,
  };
}

// -----------------------------------------------------------------------
// 3. QUADRATICS / PARABOLAS
// -----------------------------------------------------------------------
function tryParseQuadratic(
  clean: string,
  stem: string,
  rationale: string
): ParsedMathResult | null {
  const vertexMatch = clean.match(
    /([-+]?\s*\d*\.?\d*)\s*\(x\s*([+-]\s*\d+(?:\.\d+)?)\)\^2\s*([+-]\s*\d+(?:\.\d+)?)/i
  );

  const stdMatch = clean.match(
    /(?:f\(x\)|y|P\(x\)|g\(x\)|h\(x\))?\s*=?\s*([-+]?\s*\d*\.?\d*)\s*x\^2\s*([+-]\s*\d*\.?\d*x)?\s*([+-]\s*\d+\.?\d*)?/i
  );

  const factoredMatch = clean.match(
    /\(x\s*([+-]\s*\d+(?:\.\d+)?)\)\s*\(x\s*([+-]\s*\d+(?:\.\d+)?)\)/i
  );

  if (!vertexMatch && !stdMatch && !factoredMatch) return null;

  let a = 1;
  let b = 0;
  let c = 0;
  let rawLatex = "y = x^2";

  if (vertexMatch) {
    let aStr = (vertexMatch[1] || "").replace(/\s+/g, "");
    if (aStr === "" || aStr === "+") aStr = "1";
    if (aStr === "-") aStr = "-1";
    a = parseFloat(aStr) || 1;

    const h = -parseFloat(vertexMatch[2].replace(/\s+/g, ""));
    const k = parseFloat(vertexMatch[3].replace(/\s+/g, ""));
    b = -2 * a * h;
    c = a * h * h + k;
    rawLatex = `y = ${vertexMatch[0].trim()}`;
  } else if (factoredMatch) {
    const r1 = -parseFloat(factoredMatch[1].replace(/\s+/g, ""));
    const r2 = -parseFloat(factoredMatch[2].replace(/\s+/g, ""));
    a = 1;
    b = -(r1 + r2);
    c = r1 * r2;
    rawLatex = `y = ${factoredMatch[0].trim()}`;
  } else if (stdMatch && stdMatch[0].includes("x^2")) {
    let aStr = (stdMatch[1] || "").replace(/\s+/g, "");
    if (aStr === "" || aStr === "+") aStr = "1";
    if (aStr === "-") aStr = "-1";
    a = parseFloat(aStr) || 1;

    if (stdMatch[2]) {
      let bStr = stdMatch[2].replace(/x/gi, "").replace(/\s+/g, "");
      if (bStr === "" || bStr === "+") bStr = "1";
      if (bStr === "-") bStr = "-1";
      b = parseFloat(bStr) || 0;
    }
    if (stdMatch[3]) {
      c = parseFloat(stdMatch[3].replace(/\s+/g, "")) || 0;
    }
    rawLatex = `y = ${stdMatch[0].trim()}`;
  } else {
    return null;
  }

  const h = Math.round((-b / (2 * a)) * 100) / 100;
  const k = Math.round((a * h * h + b * h + c) * 100) / 100;

  const disc = b * b - 4 * a * c;
  const roots: number[] = [];
  if (disc >= 0) {
    const r1 = Math.round(((-b - Math.sqrt(disc)) / (2 * a)) * 100) / 100;
    const r2 = Math.round(((-b + Math.sqrt(disc)) / (2 * a)) * 100) / 100;
    roots.push(r1);
    if (r1 !== r2) roots.push(r2);
  }

  const curves: SvgCurve[] = [
    {
      type: "parabola",
      a,
      b,
      c,
      color: COLOR_RED,
    },
  ];

  const expressions: DesmosExpression[] = [
    {
      latex: rawLatex,
      color: COLOR_RED,
      label: "Parabola",
    },
    {
      latex: `(${h}, ${k})`,
      color: COLOR_GREEN,
      label: a > 0 ? "Minimum (Vertex)" : "Maximum (Vertex)",
    },
  ];

  const keyPoints: KeyPoint[] = [
    {
      x: h,
      y: k,
      label: a > 0 ? "Min Vertex" : "Max Vertex",
      highlight: true,
    },
  ];

  for (const root of roots) {
    keyPoints.push({
      x: root,
      y: 0,
      label: "Zero",
    });
  }

  const xSpan = Math.max(6, Math.abs(h) + 6);
  const ySpan = Math.max(8, Math.abs(k) + 6);

  const isMin = a > 0;
  const steps: SolveStep[] = [
    {
      stepNumber: 1,
      title: "Identify Parabola Characteristics",
      detail: `The quadratic $${rawLatex}$ has coefficients $a = ${a}$, $b = ${b}$, and $c = ${c}$. Since $a ${
        a > 0 ? "> 0" : "< 0"
      }$, the parabola opens ${a > 0 ? "upward (minimum)" : "downward (maximum)"}.`,
    },
    {
      stepNumber: 2,
      title: "Compute Vertex & Roots",
      detail: `The vertex $x$-coordinate is $x = -b/(2a) = ${h}$, giving vertex value $y = ${k}$. Roots occur at $x = ${
        roots.length > 0 ? roots.join(", ") : "no real roots"
      }$.`,
    },
    {
      stepNumber: 3,
      title: "Confirm the Answer",
      detail: rationale
        ? cleanFirstSentence(rationale)
        : `The ${isMin ? "minimum" : "maximum"} value is ${k} at $x = ${h}$.`,
    },
  ];

  return {
    desmos: {
      title: "Quadratic Function & Vertex",
      canGraph: true,
      expressions,
      keyPoints,
      viewBox: {
        xMin: h - xSpan,
        xMax: h + xSpan,
        yMin: Math.min(-6, k - ySpan),
        yMax: Math.max(6, k + ySpan),
      },
      curveType: "quadratic",
      curves,
      desmosInstructions: [
        `Type "${rawLatex}" into line 1.`,
        `Click anywhere on the curve to display the gray snap dots.`,
        `Click the vertex gray dot at (${h}, ${k}) to immediately read the ${
          isMin ? "minimum" : "maximum"
        } value.`,
        `Click the x-axis intercepts to view roots $x = ${
          roots.length > 0 ? roots.join(", ") : "N/A"
        }$.`,
      ],
      proTip:
        "Every single vertex, root, and y-intercept turns into a clickable gray dot in Desmos. Simply click the curve to read the answer in 5 seconds.",
    },
    steps,
  };
}

// -----------------------------------------------------------------------
// 4. TWO POINTS / LINE PASSING THROUGH POINTS
// -----------------------------------------------------------------------
function tryParseTwoPoints(
  clean: string,
  stem: string,
  rationale: string
): ParsedMathResult | null {
  const ptMatches = Array.from(
    clean.matchAll(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/g)
  );

  if (ptMatches.length < 2) return null;

  const p1 = { x: parseFloat(ptMatches[0][1]), y: parseFloat(ptMatches[0][2]) };
  const p2 = { x: parseFloat(ptMatches[1][1]), y: parseFloat(ptMatches[1][2]) };

  if (p1.x === p2.x && p1.y === p2.y) return null;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  let m = 0;
  let b = 0;
  let isVertical = false;

  if (Math.abs(dx) < 1e-6) {
    isVertical = true;
  } else {
    m = Math.round((dy / dx) * 100) / 100;
    b = Math.round((p1.y - m * p1.x) * 100) / 100;
  }

  const lineLatex = isVertical
    ? `x = ${p1.x}`
    : `y = ${m}x + ${b < 0 ? `(${b})` : b}`;

  const curves: SvgCurve[] = isVertical
    ? [{ type: "vertical-line", x: p1.x, color: COLOR_BLUE }]
    : [{ type: "line", m, b, color: COLOR_BLUE }];

  const expressions: DesmosExpression[] = [
    { latex: `(${p1.x}, ${p1.y})`, color: COLOR_GREEN, label: "Point 1" },
    { latex: `(${p2.x}, ${p2.y})`, color: COLOR_GREEN, label: "Point 2" },
    { latex: lineLatex, color: COLOR_BLUE, label: "Line Equation" },
  ];

  const keyPoints: KeyPoint[] = [
    { x: p1.x, y: p1.y, label: "P1", highlight: true },
    { x: p2.x, y: p2.y, label: "P2", highlight: true },
  ];

  if (!isVertical) {
    keyPoints.push({ x: 0, y: b, label: "y-intercept" });
  }

  const cx = (p1.x + p2.x) / 2;
  const cy = (p1.y + p2.y) / 2;
  const span = Math.max(8, Math.abs(dx) + 4, Math.abs(dy) + 4);

  const steps: SolveStep[] = [
    {
      stepNumber: 1,
      title: "Compute Slope (m)",
      detail: isVertical
        ? `The x-coordinates are identical ($x = ${p1.x}$), so the line is vertical with undefined slope.`
        : `Slope formula: $m = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{${p2.y} - ${p1.y}}{${p2.x} - ${p1.x}} = ${m}$.`,
    },
    {
      stepNumber: 2,
      title: "Find y-intercept (b)",
      detail: isVertical
        ? `The equation is $x = ${p1.x}$.`
        : `Use point-slope form with $(${p1.x}, ${p1.y})$: $y - ${p1.y} = ${m}(x - ${p1.x}) \\implies b = ${b}$.`,
    },
    {
      stepNumber: 3,
      title: "Confirm the Answer",
      detail: rationale
        ? cleanFirstSentence(rationale)
        : `The equation is $${lineLatex}$.`,
    },
  ];

  return {
    desmos: {
      title: "Linear Line Through Points",
      canGraph: true,
      expressions,
      keyPoints,
      viewBox: {
        xMin: cx - span,
        xMax: cx + span,
        yMin: cy - span,
        yMax: cy + span,
      },
      curveType: "points",
      curves,
      desmosInstructions: [
        `Enter both points "(${p1.x}, ${p1.y})" and "(${p2.x}, ${p2.y})" into Desmos.`,
        `Type the slope calculation: "(${p2.y} - ${p1.y})/(${p2.x} - ${p1.x})" to get $m = ${m}$.`,
        `Type the full equation "${lineLatex}" to confirm it passes through both points.`,
      ],
      proTip:
        "You can also create a two-row table in Desmos (gear icon -> table) and type y1 ~ mx1 + b to let Desmos calculate m and b automatically.",
    },
    steps,
  };
}

// -----------------------------------------------------------------------
// 5. LINEAR INEQUALITIES
// -----------------------------------------------------------------------
function tryParseInequality(
  clean: string,
  stem: string,
  rationale: string
): ParsedMathResult | null {
  const ineqMatch = clean.match(
    /([-+]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d+\.?\d*)?\s*(>=|<=|>|<|\\ge|\\le)\s*([-+]?\s*\d+\.?\d*)/i
  );

  if (!ineqMatch) return null;

  let raw = ineqMatch[0].trim();
  raw = raw.replace(/\\ge/g, ">=").replace(/\\le/g, "<=");

  let mStr = (ineqMatch[1] || "").replace(/\s+/g, "");
  if (mStr === "" || mStr === "+") mStr = "1";
  if (mStr === "-") mStr = "-1";
  const m = parseFloat(mStr) || 1;
  const b = ineqMatch[2] ? parseFloat(ineqMatch[2].replace(/\s+/g, "")) : 0;
  const op = ineqMatch[3];
  const rhs = parseFloat(ineqMatch[4].replace(/\s+/g, "")) || 0;

  const boundary = Math.round(((rhs - b) / m) * 100) / 100;

  const curves: SvgCurve[] = [
    {
      type: "vertical-line",
      x: boundary,
      color: COLOR_AMBER,
    },
  ];

  const expressions: DesmosExpression[] = [
    { latex: raw, color: COLOR_AMBER, label: "Inequality" },
    { latex: `x = ${boundary}`, color: COLOR_BLUE, label: "Boundary Line" },
  ];

  const keyPoints: KeyPoint[] = [
    { x: boundary, y: 0, label: `Boundary x=${boundary}`, highlight: true },
  ];

  const steps: SolveStep[] = [
    {
      stepNumber: 1,
      title: "Set up the Inequality",
      detail: `The given inequality is $${raw}$.`,
    },
    {
      stepNumber: 2,
      title: "Isolate the Variable",
      detail: `Isolating $x$: subtract $${b}$ from both sides and divide by $${m}$, yielding boundary $x = ${boundary}$. (Remember to flip the inequality sign if dividing by a negative number).`,
    },
    {
      stepNumber: 3,
      title: "Confirm Solution Interval",
      detail: rationale
        ? cleanFirstSentence(rationale)
        : `The solution corresponds to the critical boundary at $x = ${boundary}$.`,
    },
  ];

  return {
    desmos: {
      title: "Linear Inequality Solution",
      canGraph: true,
      expressions,
      keyPoints,
      viewBox: {
        xMin: boundary - 8,
        xMax: boundary + 8,
        yMin: -8,
        yMax: 8,
      },
      curveType: "inequality",
      curves,
      desmosInstructions: [
        `Type the inequality "${raw}" directly into line 1.`,
        `Desmos automatically shades the entire solution region with a solid or dashed boundary line.`,
        `Click where the boundary crosses the x-axis to read $x = ${boundary}$.`,
      ],
      proTip:
        "Desmos handles inequalities natively! You don't have to remember to flip the inequality sign when dividing by a negative number.",
    },
    steps,
  };
}

// -----------------------------------------------------------------------
// 6. FUNCTION EVALUATION
// -----------------------------------------------------------------------
function tryParseFunctionEval(
  clean: string,
  stem: string,
  rationale: string
): ParsedMathResult | null {
  const fMatch = clean.match(
    /([fghP]\([a-zA-Z]\)\s*=\s*[-+]?[a-zA-Z0-9_\(\)\/\^\s\+\-\*\.]+)/i
  );
  if (!fMatch) return null;

  const fDef = fMatch[1].trim();

  const evalMatch = clean.match(/([fghP]\((-?\d+(?:\.\d+)?)\))/i);
  const inputVal = evalMatch ? parseFloat(evalMatch[2]) : 2;

  const outMatch = rationale.match(
    /(?:equals|is|=\s*)\s*([-+]?\d+(?:\.\d+)?)/i
  );
  const outVal = outMatch ? parseFloat(outMatch[1]) : 6;

  const curves: SvgCurve[] = [
    {
      type: "parabola",
      a: 1,
      b: 0,
      c: outVal - inputVal * inputVal,
      color: COLOR_BLUE,
    },
  ];

  const expressions: DesmosExpression[] = [
    { latex: fDef, color: COLOR_BLUE, label: "Function Definition" },
    {
      latex: evalMatch ? evalMatch[0] : `f(${inputVal})`,
      color: COLOR_GREEN,
      label: "Evaluation",
    },
  ];

  const keyPoints: KeyPoint[] = [
    { x: inputVal, y: outVal, label: `(${inputVal}, ${outVal})`, highlight: true },
  ];

  const steps: SolveStep[] = [
    {
      stepNumber: 1,
      title: "Identify Function Rule",
      detail: `The given function is $${fDef}$.`,
    },
    {
      stepNumber: 2,
      title: "Substitute Given Value",
      detail: `Substitute the specified input $x = ${inputVal}$ into every instance of the variable.`,
    },
    {
      stepNumber: 3,
      title: "Evaluate & Compute Output",
      detail: rationale
        ? cleanFirstSentence(rationale)
        : `Evaluating yields output value $${outVal}$.`,
    },
  ];

  return {
    desmos: {
      title: "Function Definition & Evaluation",
      canGraph: true,
      expressions,
      keyPoints,
      viewBox: {
        xMin: inputVal - 6,
        xMax: inputVal + 6,
        yMin: outVal - 8,
        yMax: outVal + 8,
      },
      curveType: "equation",
      curves,
      desmosInstructions: [
        `Define the function in line 1: "${fDef}".`,
        `Type the evaluation in line 2: "${evalMatch ? evalMatch[0] : `f(${inputVal})`}".`,
        `Desmos instantly evaluates and displays the result ${outVal} without any arithmetic errors.`,
      ],
      proTip:
        "Desmos functions can be defined with function notation like f(x) = ... and then called like f(4) on the next row. It does all the substitution arithmetic for you.",
    },
    steps,
  };
}

// -----------------------------------------------------------------------
// 7. SINGLE-VARIABLE EQUATION
// -----------------------------------------------------------------------
function tryParseSingleVarEquation(
  clean: string,
  stem: string,
  rationale: string
): ParsedMathResult | null {
  const stemClean = stem
    .replace(/\$([0-9]+(?:\.[0-9]+)?)/g, "$1")
    .replace(/[*_#\?]/g, "")
    .trim();

  let cand = "";

  const stemEqMatch = stemClean.match(
    /([a-zA-Z0-9_\(\)\/\s\+\-\*\.]+\s*=\s*[-+]?[a-zA-Z0-9_\(\)\/\s\+\-\*\.]+)/
  );

  if (stemEqMatch) {
    cand = stemEqMatch[1].trim();
  } else {
    const eqMatch = clean.match(
      /([a-zA-Z0-9_\(\)\/\s\+\-\*\.]+\s*=\s*[-+]?[a-zA-Z0-9_\(\)\/\s\+\-\*\.]+)/
    );
    if (eqMatch) cand = eqMatch[1].trim();
  }

  if (!cand) return null;

  cand = cand
    .replace(/^(what value of [a-zA-Z] satisfies the equation|equation|is|if|let|satisfies|where)\s+/i, "")
    .trim();
  if (!cand.includes("=") || !/[a-zA-Z]/.test(cand) || cand.length > 50) return null;
  if (cand.toLowerCase().startsWith("choice") || cand.toLowerCase().startsWith("step")) return null;

  const varMatch = cand.match(/\b([a-zA-Z])\b/);
  const varName = varMatch ? varMatch[1] : "x";

  const allSolMatches = Array.from(
    rationale.matchAll(/(?:[a-zA-Z]|answer|equals|is)\s*=\s*([-+]?\d+(?:\.\d+)?)/gi)
  );
  const lastMatch = allSolMatches.length > 0 ? allSolMatches[allSolMatches.length - 1] : null;
  const sol = lastMatch ? parseFloat(lastMatch[1]) : 5;

  const curves: SvgCurve[] = [
    {
      type: "vertical-line",
      x: sol,
      color: COLOR_GREEN,
    },
  ];

  const expressions: DesmosExpression[] = [
    { latex: cand, color: COLOR_GREEN, label: "Given Equation" },
    { latex: `${varName} = ${sol}`, color: COLOR_BLUE, label: "Solution" },
  ];

  const keyPoints: KeyPoint[] = [
    { x: sol, y: 0, label: `${varName} = ${sol}`, highlight: true },
  ];

  const steps: SolveStep[] = [
    {
      stepNumber: 1,
      title: "Set up the Governing Equation",
      detail: `The question requires solving: $${cand}$.`,
    },
    {
      stepNumber: 2,
      title: "Isolate the Target Variable",
      detail: rationale
        ? cleanFirstSentence(rationale)
        : `Performing standard inverse algebraic operations isolates $${varName} = ${sol}$.`,
    },
    {
      stepNumber: 3,
      title: "Confirm the Answer",
      detail: `Substitute $${varName} = ${sol}$ back into the original equation to verify that both sides remain strictly equal.`,
    },
  ];

  return {
    desmos: {
      title: "Equation in One Variable",
      canGraph: true,
      expressions,
      keyPoints,
      viewBox: {
        xMin: sol - 8,
        xMax: sol + 8,
        yMin: -6,
        yMax: 6,
      },
      curveType: "equation",
      curves,
      desmosInstructions: [
        `Type the equation "${cand}" directly into Desmos.`,
        `Desmos graphs a vertical line at the exact value that satisfies the equation.`,
        `Click the x-axis intercept dot to immediately read the solution $x = ${sol}$.`,
      ],
      proTip:
        "You can type complex single-variable equations directly into Desmos! It graphs the vertical solution line automatically.",
    },
    steps,
  };
}

// -----------------------------------------------------------------------
// 8. SPECIALIZED FALLBACK (GEOMETRY, STATISTICS, RATES, PERCENTAGES)
// -----------------------------------------------------------------------
function buildSpecializedFallback(
  clean: string,
  stem: string,
  rationale: string,
  item: Item
): ParsedMathResult {
  const text = `${stem} ${item.skill || ""} ${item.domain || ""}`.toLowerCase();

  let step1Title = "Identify Given Information & Formula";
  let step1Detail = stem.slice(0, 140) + "...";
  let step2Title = "Step-by-Step Calculation";
  let step2Detail = rationale
    ? cleanFirstSentence(rationale)
    : "Apply the governing relationship to solve for the target quantity.";
  let step3Title = "Conclude & Verify";
  let step3Detail = "Verify units and confirm the final numerical value.";

  if (text.includes("triangle") || text.includes("pythagorean") || text.includes("cosine") || text.includes("sine")) {
    step1Title = "Identify Right Triangle Relationship";
    step1Detail = "Recall standard trigonometric and geometric ratios: $\\sin = \\frac{\\text{opp}}{\\text{hyp}}$, $\\cos = \\frac{\\text{adj}}{\\text{hyp}}$, $\\tan = \\frac{\\text{opp}}{\\text{adj}}$, and $a^2 + b^2 = c^2$.";
    step2Title = "Substitute Known Sides & Angles";
    step2Detail = rationale ? cleanFirstSentence(rationale) : "Use the Pythagorean theorem or trigonometric identity to find the unknown dimension.";
    step3Title = "Confirm Exact Ratio";
    step3Detail = "State the final simplified ratio or angle measure.";
  } else if (text.includes("arc length") || text.includes("sector") || text.includes("radians")) {
    step1Title = "Apply Circle Sector / Arc Formula";
    step1Detail = "For a central angle $\\theta$ in radians and radius $r$: arc length is $s = r\\theta$, and sector area is $A = \\frac{1}{2}r^2\\theta$.";
    step2Title = "Substitute Radius & Angle";
    step2Detail = rationale ? cleanFirstSentence(rationale) : "Substitute the given measurements into the formula.";
    step3Title = "Simplify in Terms of Pi";
    step3Detail = "Express the final answer in terms of $\\pi$ or decimal as requested.";
  } else if (text.includes("mean") || text.includes("average") || text.includes("median")) {
    step1Title = "Set up Average / Sum Equation";
    step1Detail = "Recall $\\text{Mean} = \\frac{\\text{Sum of values}}{\\text{Number of values}}$, which also means $\\text{Total Sum} = \\text{Mean} \\times \\text{Count}$.";
    step2Title = "Calculate Total Sum & Missing Value";
    step2Detail = rationale ? cleanFirstSentence(rationale) : "Compute the total sum and solve for the unknown quantity.";
    step3Title = "Verify Statistical Consistency";
    step3Detail = "Double-check the calculation against the problem context.";
  } else if (text.includes("percent") || text.includes("discount") || text.includes("increase")) {
    step1Title = "Determine Percentage Multiplier";
    step1Detail = "A percent change of $P\\%$ corresponds to multiplying by $(1 \\pm \\frac{P}{100})$.";
    step2Title = "Apply Percent Calculation";
    step2Detail = rationale ? cleanFirstSentence(rationale) : "Multiply the base amount by the appropriate percentage rate.";
    step3Title = "State Final Price / Value";
    step3Detail = "Confirm the final amount after the percentage change.";
  } else if (text.includes("ratio") || text.includes("proportion")) {
    step1Title = "Set up the Proportion";
    step1Detail = "Set up equal ratios $\\frac{a}{b} = \\frac{c}{d}$ with matching units on corresponding sides.";
    step2Title = "Cross-Multiply & Solve";
    step2Detail = rationale ? cleanFirstSentence(rationale) : "Cross-multiply to isolate the unknown quantity.";
    step3Title = "Confirm Final Units";
    step3Detail = "Ensure the result matches the requested quantity and units.";
  }

  const steps: SolveStep[] = [
    { stepNumber: 1, title: step1Title, detail: step1Detail },
    { stepNumber: 2, title: step2Title, detail: step2Detail },
    { stepNumber: 3, title: step3Title, detail: step3Detail },
  ];

  return {
    desmos: {
      title: "Algebraic & Analytical Solution",
      canGraph: false,
      expressions: [],
      keyPoints: [],
      viewBox: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
      curveType: "calculation",
      curves: [],
      desmosInstructions: [
        "This question is solved fastest using algebraic formulas or mental math.",
        "A coordinate graph is not required.",
      ],
      proTip:
        "Knowing when NOT to use Desmos is a key SAT skill! Pure geometry theorems and mental math are faster solved by hand.",
    },
    steps,
  };
}

function cleanFirstSentence(text: string): string {
  if (!text) return "";
  const match = text.match(/^([^.?!]+[.?!])/);
  return match ? match[1].trim() : text.slice(0, 160).trim();
}
