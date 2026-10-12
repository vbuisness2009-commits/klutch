export type TargetedTopic = {
  id: string;
  section: "math" | "rw";
  domain: string;
  name: string;
  description: string;
  keywords: string[];
};

export const TARGETED_TOPICS: TargetedTopic[] = [
  // MATH - Algebra
  {
    id: "math-linear-equations",
    section: "math",
    domain: "Algebra",
    name: "Linear Equations & Inequalities",
    description: "Multi-step linear equations, inequalities, absolute value, and isolating variables.",
    keywords: ["linear equations", "inequalities", "absolute value"],
  },
  {
    id: "math-linear-systems",
    section: "math",
    domain: "Algebra",
    name: "Systems of Linear Equations",
    description: "Solving systems algebraically or graphically, infinite solutions, and no-solution constraints.",
    keywords: ["systems of equations", "substitution", "elimination", "no solution"],
  },
  {
    id: "math-linear-functions-slope",
    section: "math",
    domain: "Algebra",
    name: "Linear Functions & Slope in Context",
    description: "Interpreting slope and y-intercept in word problems, rate of change, and parallel/perpendicular lines.",
    keywords: ["slope", "rate of change", "y-intercept", "word problems"],
  },

  // MATH - Advanced Math
  {
    id: "math-quadratics-parabolas",
    section: "math",
    domain: "Advanced Math",
    name: "Quadratic Equations & Parabolas",
    description: "Factoring, quadratic formula, vertex form, discriminant, and maximum/minimum values.",
    keywords: ["quadratics", "parabolas", "vertex form", "discriminant"],
  },
  {
    id: "math-nonlinear-functions",
    section: "math",
    domain: "Advanced Math",
    name: "Nonlinear Functions & Exponentials",
    description: "Exponential growth/decay models, function transformations, and graphs of higher-degree polynomials.",
    keywords: ["exponential growth", "decay", "polynomials", "transformations"],
  },
  {
    id: "math-radicals-rationals",
    section: "math",
    domain: "Advanced Math",
    name: "Radicals & Rational Expressions",
    description: "Simplifying rational expressions, extraneous solutions, fractional exponents, and radical equations.",
    keywords: ["rational expressions", "radicals", "fractional exponents", "extraneous"],
  },

  // MATH - Problem-Solving & Data Analysis
  {
    id: "math-percentages-ratios",
    section: "math",
    domain: "Problem-Solving and Data Analysis",
    name: "Percentages, Ratios & Rates",
    description: "Multi-step percent increases/decreases, unit conversions, proportional relationships, and scale factors.",
    keywords: ["percentages", "ratios", "rates", "unit conversions"],
  },
  {
    id: "math-probability-statistics",
    section: "math",
    domain: "Problem-Solving and Data Analysis",
    name: "Probability, Data & Margin of Error",
    description: "Two-way frequency tables, conditional probability, mean/median/standard deviation, and margin of error.",
    keywords: ["probability", "two-way tables", "mean", "median", "margin of error"],
  },
  {
    id: "math-scatterplots-models",
    section: "math",
    domain: "Problem-Solving and Data Analysis",
    name: "Scatterplots & Lines of Best Fit",
    description: "Interpreting regression equations, residuals, correlation vs. causation, and data trends.",
    keywords: ["scatterplots", "line of best fit", "residuals", "correlation"],
  },

  // MATH - Geometry and Trigonometry
  {
    id: "math-circles-equations",
    section: "math",
    domain: "Geometry and Trigonometry",
    name: "Circles, Arc Length & Circle Equations",
    description: "Equation of a circle (x-h)^2 + (y-k)^2 = r^2, completing the square, arc length, and sector area.",
    keywords: ["circles", "radius", "center", "arc length", "sector area"],
  },
  {
    id: "math-triangles-trigonometry",
    section: "math",
    domain: "Geometry and Trigonometry",
    name: "Right Triangles & Trigonometry",
    description: "Pythagorean theorem, special right triangles (30-60-90, 45-45-90), sine, cosine, tangent & cofunction rules.",
    keywords: ["right triangles", "sine", "cosine", "tangent", "soh cah toa"],
  },
  {
    id: "math-angles-volume",
    section: "math",
    domain: "Geometry and Trigonometry",
    name: "Angles, Polygons & 3D Volume",
    description: "Parallel lines and transversals, polygon angle sums, cylinder/cone/sphere volume, and surface area.",
    keywords: ["angles", "volume", "cylinders", "similar triangles"],
  },

  // READING & WRITING - Craft and Structure
  {
    id: "rw-words-in-context",
    section: "rw",
    domain: "Craft and Structure",
    name: "Words in Context (Advanced Vocabulary)",
    description: "Deciphering high-utility academic vocabulary using contextual tone, connotation, and syntactic clues.",
    keywords: ["vocabulary", "words in context", "synonyms", "diction"],
  },
  {
    id: "rw-text-structure-purpose",
    section: "rw",
    domain: "Craft and Structure",
    name: "Text Structure & Purpose",
    description: "Analyzing paragraph progression, the overall function of specific sentences, and the author's primary intent.",
    keywords: ["main purpose", "overall structure", "function of underlined"],
  },
  {
    id: "rw-cross-text-connections",
    section: "rw",
    domain: "Craft and Structure",
    name: "Cross-Text Connections (Paired Texts)",
    description: "Synthesizing two passages (Text 1 & Text 2), identifying points of agreement, disagreement, or qualification.",
    keywords: ["paired passages", "text 1 text 2", "perspective"],
  },

  // READING & WRITING - Information and Ideas
  {
    id: "rw-central-ideas-details",
    section: "rw",
    domain: "Information and Ideas",
    name: "Central Ideas & Details",
    description: "Extracting core arguments, identifying supporting empirical evidence, and distinguishing main ideas from details.",
    keywords: ["main idea", "central claim", "text evidence"],
  },
  {
    id: "rw-command-of-evidence",
    section: "rw",
    domain: "Information and Ideas",
    name: "Command of Evidence (Text & Data)",
    description: "Evaluating scientific hypotheses, supporting or weakening claims, and interpreting tables/bar charts.",
    keywords: ["command of evidence", "support hypothesis", "weaken claim", "graphs"],
  },
  {
    id: "rw-inferences",
    section: "rw",
    domain: "Information and Ideas",
    name: "Inferences (Completing the Text)",
    description: "'Which choice most logically completes the text?' — deducing the logical conclusion without extreme assumptions.",
    keywords: ["logically completes", "inferences", "conclusion"],
  },

  // READING & WRITING - Standard English Conventions
  {
    id: "rw-boundaries-punctuation",
    section: "rw",
    domain: "Standard English Conventions",
    name: "Boundaries & Punctuation",
    description: "Semicolons, colons, em dashes, comma splices, run-ons, and independent vs. dependent clause boundaries.",
    keywords: ["semicolon", "colon", "dash", "comma splice", "boundaries"],
  },
  {
    id: "rw-form-structure-sense",
    section: "rw",
    domain: "Standard English Conventions",
    name: "Form, Structure & Grammar Sense",
    description: "Subject-verb agreement, dangling/misplaced modifiers, verb tense consistency, and pronoun-antecedent agreement.",
    keywords: ["subject-verb agreement", "modifiers", "verb tense", "pronouns"],
  },

  // READING & WRITING - Expression of Ideas
  {
    id: "rw-transitions",
    section: "rw",
    domain: "Expression of Ideas",
    name: "Transitions & Logical Connectors",
    description: "Contrast (However, Nonetheless), Cause (Therefore, Consequently), Addition (Furthermore), and Example (Specifically).",
    keywords: ["transitions", "however", "therefore", "furthermore", "in contrast"],
  },
  {
    id: "rw-rhetorical-synthesis",
    section: "rw",
    domain: "Expression of Ideas",
    name: "Rhetorical Synthesis (Research Notes)",
    description: "Given bulleted student research notes, selecting the choice that best achieves a specified rhetorical goal.",
    keywords: ["research notes", "bullet points", "rhetorical goal"],
  },
];
