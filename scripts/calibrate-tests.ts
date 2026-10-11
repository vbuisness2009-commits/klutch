import fs from "node:fs";
import path from "node:path";

const TESTS_DIR = path.resolve(process.cwd(), "content", "tests");

function loadTest(num: number) {
  const filePath = path.join(TESTS_DIR, `practice-test-${num}.json`);
  return { filePath, data: JSON.parse(fs.readFileSync(filePath, "utf8")) };
}

function saveTest(filePath: string, data: any) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

console.log("Calibrating Practice Tests 1 through 5...");

// ==========================================
// PRACTICE TEST 1
// ==========================================
{
  const { filePath, data } = loadTest(1);
  const mathSection = data.form.sections.find((s: any) => s.id === "math");
  const m2l = mathSection.module2.lower.items;

  // Q18
  m2l[17] = {
    id: "pt1-math-m2l-q18",
    domain: "Algebra",
    skill: "Linear functions (slope)",
    difficulty: "E",
    html: false,
    stem: "Line k in the xy-plane passes through the points (2, 5) and (6, 17). What is the slope of line k?",
    rationale: "The slope m is given by (y2 - y1) / (x2 - x1) = (17 - 5) / (6 - 2) = 12 / 4 = 3.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["3"],
  };

  // Q19
  m2l[18] = {
    id: "pt1-math-m2l-q19",
    domain: "Problem-Solving and Data Analysis",
    skill: "Percentages",
    difficulty: "E",
    html: false,
    stem: "A bakery prepared 250 muffins in the morning. By noon, 68% of the muffins had been sold. How many muffins remained unsold?",
    rationale: "If 68% were sold, 100% - 68% = 32% remained unsold. 0.32 * 250 = 80 muffins.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["80"],
  };

  // Q20
  m2l[19] = {
    id: "pt1-math-m2l-q20",
    domain: "Algebra",
    skill: "Linear equations in one variable",
    difficulty: "E",
    html: false,
    stem: "If 4(2x - 3) = 36, what is the value of 2x - 3?",
    rationale: "Divide both sides by 4: 2x - 3 = 36 / 4 = 9.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["9"],
  };

  // Q21
  m2l[20] = {
    id: "pt1-math-m2l-q21",
    domain: "Geometry and Trigonometry",
    skill: "Triangle angle sum",
    difficulty: "E",
    html: false,
    stem: "In triangle ABC, the measure of angle A is 45 degrees and the measure of angle B is 75 degrees. What is the measure, in degrees, of angle C?",
    rationale: "The sum of interior angles in a triangle is 180 degrees. Measure of angle C = 180 - (45 + 75) = 180 - 120 = 60 degrees.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["60"],
  };

  // Q22
  m2l[21] = {
    id: "pt1-math-m2l-q22",
    domain: "Problem-Solving and Data Analysis",
    skill: "Percentages and discounts",
    difficulty: "E",
    html: false,
    stem: "At an electronics store, the regular price of a pair of headphones is $80. During a weekend sale, the store offers a 25% discount. What is the sale price, in dollars, of the headphones before sales tax?",
    rationale: "A 25% discount on $80 is 0.25 * 80 = $20 off. The sale price is 80 - 20 = $60.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["60"],
  };

  saveTest(filePath, data);
  console.log("Updated Test 1");
}

// ==========================================
// PRACTICE TEST 2
// ==========================================
{
  const { filePath, data } = loadTest(2);
  const mathSection = data.form.sections.find((s: any) => s.id === "math");
  const m2l = mathSection.module2.lower.items;
  const m2u = mathSection.module2.upper.items;

  // M2L Q18
  m2l[17] = {
    id: "pt2-math-m2l-q18",
    domain: "Algebra",
    skill: "Linear equations (intercepts)",
    difficulty: "E",
    html: false,
    stem: "Line p in the xy-plane has the equation 3x + 2y = 18. What is the y-intercept of line p?",
    rationale: "To find the y-intercept, set x = 0: 3(0) + 2y = 18, which gives 2y = 18, so y = 9.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["9"],
  };

  // M2L Q20
  m2l[19] = {
    id: "pt2-math-m2l-q20",
    domain: "Advanced Math",
    skill: "Quadratic equations (factoring)",
    difficulty: "M",
    html: false,
    stem: "If the positive solution to the equation x^2 - 11x + 28 = 0 is greater than 5, what is this solution?",
    rationale: "Factoring the quadratic gives (x - 4)(x - 7) = 0, so x = 4 or x = 7. The solution greater than 5 is 7.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["7"],
  };

  // M2U Q18: convert to SPR
  delete m2u[17].choices;
  m2u[17].format = "spr";
  m2u[17].stem = "The number of bacteria in a colony is modeled by the function N(t) = 50 * (2)^(t/3), where t is the time in hours. According to the model, after how many hours will the population of bacteria reach 400?";
  m2u[17].accepted = ["9"];
  m2u[17].rationale = "Set N(t) = 400: 50 * (2)^(t/3) = 400. Divide by 50: (2)^(t/3) = 8. Since 8 = 2^3, we have t/3 = 3, so t = 9 hours.";

  // M2U Q19
  delete m2u[18].choices;
  m2u[18].format = "spr";
  m2u[18].accepted = ["5"];

  // M2U Q20
  delete m2u[19].choices;
  m2u[19].format = "spr";
  m2u[19].stem = "In a circle with center O, an arc subtends a central angle of 2pi/3 radians. If the length of the arc is 10pi, the area of the sector formed by this arc is k*pi. What is the value of k?";
  m2u[19].accepted = ["75"];
  m2u[19].rationale = "The arc length formula is s = r * theta. Given s = 10pi and theta = 2pi/3: r = 10pi / (2pi/3) = 15. The sector area is A = (1/2) * r^2 * theta = (1/2) * 225 * (2pi/3) = 75pi. Thus, k = 75.";

  saveTest(filePath, data);
  console.log("Updated Test 2");
}

// ==========================================
// PRACTICE TEST 3
// ==========================================
{
  const { filePath, data } = loadTest(3);
  const mathSection = data.form.sections.find((s: any) => s.id === "math");
  const m2l = mathSection.module2.lower.items;
  const m2u = mathSection.module2.upper.items;

  // M2L Q18
  delete m2l[17].choices;
  m2l[17].format = "spr";
  m2l[17].stem = "A circle has a radius of 5 units. If the circumference of the circle is k*pi units, what is the value of k?";
  m2l[17].accepted = ["10"];
  m2l[17].rationale = "The circumference of a circle is C = 2 * pi * r. With r = 5, C = 2 * pi * 5 = 10pi. Therefore, k = 10.";

  // M2U Q18
  delete m2u[17].choices;
  m2u[17].format = "spr";
  m2u[17].stem = "A circle has a radius of 12 units. An arc on this circle measures 4pi units. If the measure of the central angle subtended by this arc is pi/k radians, what is the value of k?";
  m2u[17].accepted = ["3"];
  m2u[17].rationale = "Arc length s = r * theta. Here 4pi = 12 * theta, so theta = 4pi / 12 = pi / 3. Comparing pi/3 to pi/k, we have k = 3.";

  // M2U Q19: fix rationale scratchpad
  m2u[18].rationale = "Multiply the first equation by 5 and the second equation by 2: 15x - 10y = 30 and 4x + 10y = 8. Adding the equations gives 19x = 38, so x = 2. Substituting into 3(2) - 2y = 6 yields y = 0. Therefore, x + y = 2 + 0 = 2.";

  // M2U Q20: replace duplicate with fresh question
  m2u[19] = {
    id: "pt3-math-m2u-q20",
    domain: "Advanced Math",
    skill: "Quadratic functions (vertex)",
    difficulty: "H",
    html: false,
    stem: "The quadratic function f(x) = 2x^2 - 12x + 23 reaches its minimum value at (h, k). What is the value of k?",
    rationale: "The vertex x-coordinate is h = -b / (2a) = -(-12) / (2 * 2) = 12 / 4 = 3. Evaluating f(3) = 2(3)^2 - 12(3) + 23 = 18 - 36 + 23 = 5. Therefore, the minimum value k is 5.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["5"],
  };

  saveTest(filePath, data);
  console.log("Updated Test 3");
}

// ==========================================
// PRACTICE TEST 4
// ==========================================
{
  const { filePath, data } = loadTest(4);
  const mathSection = data.form.sections.find((s: any) => s.id === "math");
  const m2l = mathSection.module2.lower.items;
  const m2u = mathSection.module2.upper.items;

  // M2L Q18
  m2l[17] = {
    id: "pt4-math-m2l-q18",
    domain: "Algebra",
    skill: "Linear equations in context",
    difficulty: "E",
    html: false,
    stem: "A water tank starts with 150 gallons of water and drains at a constant rate of 6 gallons per minute. After how many minutes will exactly 42 gallons remain in the tank?",
    rationale: "Let m be minutes: 150 - 6m = 42. Subtract 150: -6m = -108. Divide by -6: m = 18 minutes.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["18"],
  };

  // M2L Q19
  m2l[18] = {
    id: "pt4-math-m2l-q19",
    domain: "Algebra",
    skill: "Linear equations in one variable",
    difficulty: "E",
    html: false,
    stem: "If (2x + 5)/3 = 7, what is the value of x?",
    rationale: "Multiply both sides by 3: 2x + 5 = 21. Subtract 5: 2x = 16. Divide by 2: x = 8.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["8"],
  };

  // M2L Q20
  m2l[19] = {
    id: "pt4-math-m2l-q20",
    domain: "Geometry and Trigonometry",
    skill: "Pythagorean theorem",
    difficulty: "M",
    html: false,
    stem: "In a right triangle, the length of the hypotenuse is 25 and the length of one leg is 15. What is the length of the other leg?",
    rationale: "By the Pythagorean theorem, a^2 + 15^2 = 25^2 => a^2 + 225 = 625 => a^2 = 400 => a = 20.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["20"],
  };

  // M2U Q18-22
  m2u[17].accepted = ["-2"];
  m2u[18].accepted = ["1"];
  m2u[19].accepted = ["12"];
  m2u[20].accepted = ["-13"];
  m2u[21].stem = "What is the greatest integer value of x for which the expression sqrt(15 - 3x) is a real number?";
  m2u[21].accepted = ["5"];

  saveTest(filePath, data);
  console.log("Updated Test 4");
}

// ==========================================
// PRACTICE TEST 5
// ==========================================
{
  const { filePath, data } = loadTest(5);
  const mathSection = data.form.sections.find((s: any) => s.id === "math");
  const m2l = mathSection.module2.lower.items;
  const m2u = mathSection.module2.upper.items;

  // M2L Q18-22 (upgrade to genuine foundational SAT items)
  m2l[17] = {
    id: "pt5-math-m2l-q18",
    domain: "Algebra",
    skill: "Linear equations in context",
    difficulty: "E",
    html: false,
    stem: "A landscaping service charges a flat equipment fee of $45 plus $28 per hour of labor. If a customer is billed a total of $241 for a landscaping job, how many hours of labor were performed?",
    rationale: "Let h be the hours of labor. The equation modeling the total cost is 45 + 28h = 241. Subtract 45 from both sides: 28h = 196. Divide by 28: h = 7. Thus, 7 hours of labor were performed.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["7"],
  };

  m2l[18] = {
    id: "pt5-math-m2l-q19",
    domain: "Algebra",
    skill: "Systems of linear equations",
    difficulty: "M",
    html: false,
    stem: "At a community book sale, paperback books cost $3 each and hardcover books cost $7 each. Maya bought a total of 12 books and spent $52. How many hardcover books did she buy?",
    rationale: "Let p be paperbacks and h be hardcovers: p + h = 12 and 3p + 7h = 52. Substituting p = 12 - h into the second equation: 3(12 - h) + 7h = 52, which simplifies to 36 + 4h = 52, so 4h = 16, which gives h = 4 hardcover books.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["4"],
  };

  m2l[19] = {
    id: "pt5-math-m2l-q20",
    domain: "Advanced Math",
    skill: "Quadratic equations",
    difficulty: "M",
    html: false,
    stem: "If (x - 6)^2 = 81 and x > 0, what is the value of x?",
    rationale: "Take the square root of both sides: x - 6 = 9 or x - 6 = -9. Since x > 0, x - 6 = 9 gives x = 15.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["15"],
  };

  m2l[20] = {
    id: "pt5-math-m2l-q21",
    domain: "Geometry and Trigonometry",
    skill: "Perimeter of a rectangle",
    difficulty: "E",
    html: false,
    stem: "A rectangle has a length that is 5 units greater than its width. If the perimeter of the rectangle is 58 units, what is the width of the rectangle?",
    rationale: "Let w be the width; then length is w + 5. The perimeter is 2(w + w + 5) = 58, which simplifies to 4w + 10 = 58. Subtract 10: 4w = 48, so w = 12 units.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["12"],
  };

  m2l[21] = {
    id: "pt5-math-m2l-q22",
    domain: "Algebra",
    skill: "Linear functions in context",
    difficulty: "E",
    html: false,
    stem: "The function C(x) = 18x + 35 models the total monthly cost, in dollars, of a gym membership with x personal training sessions. If a member's bill for one month was $125, how many personal training sessions did the member have?",
    rationale: "Set C(x) = 125: 18x + 35 = 125. Subtract 35: 18x = 90. Divide by 18: x = 5 personal training sessions.",
    keySource: "paper",
    expectedPace: 95,
    format: "spr",
    accepted: ["5"],
  };

  // M2U Q4: Replace duplicate Q4 with fresh problem
  m2u[3] = {
    id: "pt5-math-m2u-q04",
    domain: "Algebra",
    skill: "Linear equations with fractional coefficients",
    difficulty: "H",
    html: false,
    stem: "For what value of c does the equation (2x + 7)/5 - (x - 3)/2 = c have the solution x = 1?",
    rationale: "Substitute x = 1 into the equation: (2(1) + 7)/5 - (1 - 3)/2 = 9/5 - (-2/2) = 9/5 + 1 = 14/5. Thus, c = 14/5.",
    keySource: "paper",
    expectedPace: 95,
    format: "mc",
    choices: [
      { id: "A", text: "14/5" },
      { id: "B", text: "12/5" },
      { id: "C", text: "8/5" },
      { id: "D", text: "2" },
    ],
    correct: "A",
  };

  // M2U Q18: fix accepted answer and make clearly specified
  delete m2u[17].choices;
  m2u[17].format = "spr";
  m2u[17].stem = "A circle is centered at the origin (0,0) and has a radius of 5. A point P on the circle in quadrant II has coordinates (x, y) such that the angle formed by the positive x-axis and the line segment from the origin to P is theta radians. If cos(theta) = -3/5, what is the value of y?";
  m2u[17].accepted = ["4"];
  m2u[17].rationale = "On a circle of radius r = 5, y = r * sin(theta). Using sin^2(theta) + cos^2(theta) = 1 with cos(theta) = -3/5 gives sin^2(theta) = 1 - 9/25 = 16/25. Since P is in quadrant II, sin(theta) is positive, so sin(theta) = 4/5. Therefore, y = 5 * (4/5) = 4.";

  saveTest(filePath, data);
  console.log("Updated Test 5");
}

console.log("All 5 tests successfully calibrated!");
