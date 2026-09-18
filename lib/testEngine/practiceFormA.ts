/**
 * Placeholder form used to exercise the player.
 *
 * The CONTENT here is filler. The STRUCTURE is real: full-length modules at the
 * published counts and timings, College Board's domain ordering, and roughly a
 * quarter of Math as student-produced response. Swap `buildRwModule` and
 * `buildMathModule` for real item-pool queries and nothing else changes.
 */

import type {
  Difficulty,
  Domain,
  Item,
  Module,
  MultipleChoiceItem,
  Section,
  SprItem,
  TestForm,
} from "./types";

// Reading and Writing items run in this domain order within every module.
const RW_DOMAIN_PLAN: { domain: Domain; skill: string }[] = [
  { domain: "Craft and Structure", skill: "Words in Context" },
  { domain: "Craft and Structure", skill: "Text Structure and Purpose" },
  { domain: "Craft and Structure", skill: "Cross-Text Connections" },
  { domain: "Information and Ideas", skill: "Central Ideas and Details" },
  { domain: "Information and Ideas", skill: "Command of Evidence" },
  { domain: "Information and Ideas", skill: "Inferences" },
  { domain: "Standard English Conventions", skill: "Boundaries" },
  { domain: "Standard English Conventions", skill: "Form, Structure, and Sense" },
  { domain: "Expression of Ideas", skill: "Transitions" },
  { domain: "Expression of Ideas", skill: "Rhetorical Synthesis" },
];

const MATH_DOMAIN_PLAN: { domain: Domain; skill: string }[] = [
  { domain: "Algebra", skill: "Linear equations in one variable" },
  { domain: "Algebra", skill: "Systems of linear equations" },
  { domain: "Advanced Math", skill: "Nonlinear functions" },
  { domain: "Advanced Math", skill: "Quadratic equations" },
  { domain: "Problem-Solving and Data Analysis", skill: "Ratios and percentages" },
  { domain: "Geometry and Trigonometry", skill: "Right triangles" },
];

/** Filler stems that are still answerable, so scoring and routing can be tested. */
const RW_FILLER = [
  {
    stimulus:
      "Placeholder passage. Every prediction the team made was matched by the observed data, without a single exception across the four trials.",
    stem: "Which choice completes the text with the most logical and precise word?",
    choices: ["consistent", "contradictory", "irrelevant", "unverified"],
    correctIdx: 0,
  },
  {
    stimulus:
      "Placeholder passage. The author spends the first half of the article describing the problem and the second half proposing a single specific remedy.",
    stem: "Which choice best describes the overall structure of the text?",
    choices: [
      "It poses a problem and then proposes a solution.",
      "It compares two unrelated historical events.",
      "It lists objections without answering any of them.",
      "It defines a term and then abandons it.",
    ],
    correctIdx: 0,
  },
  {
    stimulus:
      "Placeholder passage. The measurements were taken in winter; the researchers note that results may differ in other seasons.",
    stem: "Which choice best states a limitation the researchers acknowledge?",
    choices: [
      "The findings may not hold in other seasons.",
      "The instruments were poorly calibrated.",
      "The sample included too few participants.",
      "The study was never peer reviewed.",
    ],
    correctIdx: 0,
  },
  {
    stimulus:
      "Placeholder text. Because the sensor sits above the cloud layer ______ readings are unaffected by local weather.",
    stem: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [", its", " its", "; its", ". Its"],
    correctIdx: 0,
  },
  {
    stimulus:
      "Placeholder text. The first method is fast but imprecise. ______ the second is slow and highly accurate.",
    stem: "Which choice completes the text with the most logical transition?",
    choices: ["By contrast,", "Likewise,", "For example,", "Therefore,"],
    correctIdx: 0,
  },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function difficultyFor(index: number, total: number, skew: number): Difficulty {
  // Items run easiest to hardest. `skew` shifts the whole module up or down:
  // -1 for the lower module-2 form, 0 for module 1, +1 for the upper form.
  const position = index / Math.max(1, total - 1);
  const shifted = position + skew * 0.25;
  if (shifted < 0.34) return "E";
  if (shifted < 0.7) return "M";
  return "H";
}

function buildRwModule(id: string, count: number, skew: number): Module {
  const items: Item[] = [];
  for (let i = 0; i < count; i++) {
    const plan = RW_DOMAIN_PLAN[i % RW_DOMAIN_PLAN.length];
    const filler = RW_FILLER[i % RW_FILLER.length];
    const item: MultipleChoiceItem = {
      id: `${id}-q${pad(i + 1)}`,
      format: "mc",
      domain: plan.domain,
      skill: plan.skill,
      difficulty: difficultyFor(i, count, skew),
      // Two unscored pretest slots per module, as on the real test.
      pretest: i === 6 || i === count - 3,
      stimulus: filler.stimulus,
      stem: filler.stem,
      choices: filler.choices.map((text, c) => ({
        id: (["A", "B", "C", "D"] as const)[c],
        text,
      })),
      correct: (["A", "B", "C", "D"] as const)[filler.correctIdx],
      rationale: "Placeholder rationale. Real explanations land with the item pool.",
    };
    items.push(item);
  }
  return { id, items };
}

function buildMathModule(id: string, count: number, skew: number): Module {
  const items: Item[] = [];
  for (let i = 0; i < count; i++) {
    const plan = MATH_DOMAIN_PLAN[i % MATH_DOMAIN_PLAN.length];
    const difficulty = difficultyFor(i, count, skew);
    // Roughly every fourth item is student-produced response.
    const spr = i % 4 === 3;
    const a = 2 + (i % 7);
    const b = 3 + (i % 5);
    const answer = a * b;

    // Placeholder paths, ordered fastest first. Real items carry authored
    // versions of these with the actual keystrokes.
    const solutions = [
      {
        method: "desmos" as const,
        label: "Graph it in Desmos",
        seconds: 20,
        steps: [
          `Type x = ${a} on line 1 and y = ${b} on line 2.`,
          "Add xy on line 3 and read the value Desmos reports.",
          "No algebra, no arithmetic slips.",
        ],
        desmosExpressions: [`x=${a}`, `y=${b}`, `xy`],
        whenToUse:
          "Anything you can define as variables or graph as a curve. Almost always faster than solving by hand.",
      },
      {
        method: "algebra" as const,
        label: "Do it by hand",
        seconds: 35,
        steps: [
          `Substitute directly: xy = ${a} times ${b}.`,
          `That gives ${answer}.`,
        ],
        whenToUse:
          "Faster only when the arithmetic is trivial and typing would cost more than thinking.",
      },
    ];

    if (spr) {
      const item: SprItem = {
        id: `${id}-q${pad(i + 1)}`,
        format: "spr",
        domain: plan.domain,
        skill: plan.skill,
        difficulty,
        pretest: i === count - 3,
        stem: `Placeholder item. What is the value of ${a} times ${b}?`,
        accepted: [String(answer)],
        rationale: "Placeholder rationale.",
        solutions,
      };
      items.push(item);
    } else {
      const correctIdx = i % 4;
      const wrong = [answer + 1, answer - 2, answer + 5, answer - 3];
      const choiceValues = [0, 1, 2, 3].map((c) =>
        c === correctIdx ? answer : wrong[c]
      );
      const item: MultipleChoiceItem = {
        id: `${id}-q${pad(i + 1)}`,
        format: "mc",
        domain: plan.domain,
        skill: plan.skill,
        difficulty,
        pretest: i === 6,
        stem: `Placeholder item. If x = ${a} and y = ${b}, what is the value of xy?`,
        choices: choiceValues.map((v, c) => ({
          id: (["A", "B", "C", "D"] as const)[c],
          text: String(v),
        })),
        correct: (["A", "B", "C", "D"] as const)[correctIdx],
        rationale: "Placeholder rationale.",
        solutions,
      };
      items.push(item);
    }
  }
  return { id, items };
}

const rw: Section = {
  id: "rw",
  name: "Reading and Writing",
  secondsPerModule: 32 * 60,
  module1: buildRwModule("rw-m1", 27, 0),
  module2: {
    lower: buildRwModule("rw-m2l", 27, -1),
    upper: buildRwModule("rw-m2u", 27, 1),
  },
  routeUpAt: 15,
};

const math: Section = {
  id: "math",
  name: "Math",
  secondsPerModule: 35 * 60,
  module1: buildMathModule("math-m1", 22, 0),
  module2: {
    lower: buildMathModule("math-m2l", 22, -1),
    upper: buildMathModule("math-m2u", 22, 1),
  },
  routeUpAt: 12,
};

export const PRACTICE_FORM_A: TestForm = {
  id: "practice-a",
  name: "Klutch Practice Form A",
  breakSeconds: 10 * 60,
  sections: [rw, math],
};

export const FORMS: Record<string, TestForm> = {
  [PRACTICE_FORM_A.id]: PRACTICE_FORM_A,
};
