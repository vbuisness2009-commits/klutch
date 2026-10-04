/**
 * Starter template for the admin hub downloads. Every question here was
 * written for Klutch as a format example; none comes from a real SAT.
 */

import type { AuthoringDoc } from "./authoring";

export const TEMPLATE_DOC: AuthoringDoc = {
  format: "klutch-practice-test",
  version: 1,
  title: "Klutch Practice Test 1",
  collection: "Full-length tests",
  breakMinutes: 10,
  sections: {
    rw: {
      routeUpAt: 15,
      module1: [
        {
          id: "rw1-01",
          type: "mc",
          stimulus:
            "The new library branch was designed to be ______: its reading rooms can be reconfigured in an afternoon for lectures, film screenings, or quiet study.",
          stem: "Which choice completes the text with the most logical and precise word or phrase?",
          choices: { A: "adaptable", B: "ornamental", C: "temporary", D: "secluded" },
          answer: "A",
          rationale:
            "The colon introduces evidence that the rooms can be quickly changed for different uses, which is what \"adaptable\" means.",
          domain: "Craft and Structure",
          skill: "Words in Context",
          difficulty: "E",
          distractorNotes: {
            C: "Being easy to reconfigure doesn't make the building short-lived.",
          },
        },
        {
          id: "rw1-02",
          type: "mc",
          stimulus:
            "Beekeepers in the valley moved their hives ______ the orchards bloomed, the bees had to fly several kilometers to find flowers.",
          stem: "Which choice completes the text so that it conforms to the conventions of Standard English?",
          choices: { A: "earlier, before", B: "earlier; before", C: "earlier because, before", D: "earlier. Because before" },
          answer: "B",
          rationale:
            "Two independent clauses need a semicolon (or a period) between them. Choice B joins them correctly.",
          domain: "Standard English Conventions",
          skill: "Boundaries",
          difficulty: "M",
          pretest: true,
        },
      ],
      module2: [
        {
          id: "rw2-01",
          type: "mc",
          stimulus:
            "A city planner argues that adding bike lanes reduces traffic. ______, a two-year study of three neighborhoods found that car trips fell by 12 percent after lanes were added.",
          stem: "Which choice completes the text with the most logical transition?",
          choices: { A: "However", B: "Similarly", C: "Indeed", D: "Instead" },
          answer: "C",
          rationale: "The study supports the planner's claim, so a reinforcing transition (\"Indeed\") fits.",
          domain: "Expression of Ideas",
          skill: "Transitions",
          difficulty: "M",
        },
      ],
    },
    math: {
      routeUpAt: 12,
      module1: [
        {
          id: "m1-01",
          type: "mc",
          stem: "If 4x − 7 = 21, what is the value of x?",
          choices: { A: "3.5", B: "5", C: "7", D: "14" },
          answer: "C",
          rationale: "Add 7 to both sides: 4x = 28. Divide by 4: x = 7.",
          domain: "Algebra",
          skill: "Linear equations in one variable",
          difficulty: "E",
          solutions: [
            {
              method: "desmos",
              label: "Graph it in Desmos",
              seconds: 15,
              steps: ["Type 4x - 7 = 21.", "Desmos draws a vertical line at x = 7."],
              desmosExpressions: ["4x-7=21"],
            },
            {
              method: "algebra",
              label: "Do it by hand",
              seconds: 20,
              steps: ["4x = 28", "x = 7"],
            },
          ],
        },
        {
          id: "m1-02",
          type: "spr",
          stem: "A recipe uses 3 cups of flour for every 5 cups of oats. What fraction of the flour-and-oat mixture is flour?",
          answer: ["3/8"],
          rationale: "Flour is 3 parts out of 3 + 5 = 8 parts, so 3/8 (0.375).",
          domain: "Problem-Solving and Data Analysis",
          skill: "Ratios, rates, proportional relationships, and units",
          difficulty: "M",
        },
      ],
      module2: [
        {
          id: "m2-01",
          type: "mc",
          stem: "The function f is defined by f(x) = x² − 6x + 5. For what value of x does f reach its minimum?",
          choices: { A: "−3", B: "1", C: "3", D: "5" },
          answer: "C",
          rationale: "The vertex of ax² + bx + c is at x = −b/(2a) = 6/2 = 3.",
          domain: "Advanced Math",
          skill: "Nonlinear functions",
          difficulty: "H",
        },
      ],
    },
  },
};
