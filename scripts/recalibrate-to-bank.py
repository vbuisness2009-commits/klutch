import json
import os

TESTS_DIR = os.path.join(os.getcwd(), "content", "tests")

def load_test(num):
    path = os.path.join(TESTS_DIR, f"practice-test-{num}.json")
    with open(path, "r", encoding="utf-8") as f:
        return path, json.load(f)

def save_test(path, data):
    data["updatedAt"] = "2026-10-11T00:55:00.000Z"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

print("Recalibrating Practice Tests 1 through 5 strictly against the official Question Bank...")

# ==============================================================================
# PRACTICE TEST 1 RECALIBRATION
# ==============================================================================
path1, pt1 = load_test(1)
m1_1 = pt1["form"]["sections"][1]["module1"]["items"]
m2l_1 = pt1["form"]["sections"][1]["module2"]["lower"]["items"]

# M1 Q01: Replace 5x - 7 = 23 with linear cost model in context
m1_1[0] = {
    "id": "pt1-math-m1-q01",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "A ride-share company charges a base fare of $3.50 plus $2.25 per mile traveled. If a rider was charged a total of $26.00 for a trip, how many miles was the trip?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "8"},
        {"id": "B", "text": "10"},
        {"id": "C", "text": "12"},
        {"id": "D", "text": "14"}
    ],
    "correct": "B",
    "rationale": "Let m be miles: $3.50 + 2.25m = 26.00$. Subtract 3.50: $2.25m = 22.50$. Divide by 2.25: $m = 10$ miles.",
    "keySource": "paper",
    "expectedPace": 65
}

# M1 Q08: Replace x^2 - 9 = 0 with factoring quadratic with linear term
m1_1[7] = {
    "id": "pt1-math-m1-q08",
    "domain": "Advanced Math",
    "skill": "Quadratic equations (factoring)",
    "difficulty": "M",
    "html": False,
    "stem": "What is the sum of the solutions to the equation $(2x - 3)(x + 5) = 0$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-7/2"},
        {"id": "B", "text": "-3/2"},
        {"id": "C", "text": "3/2"},
        {"id": "D", "text": "7/2"}
    ],
    "correct": "A",
    "rationale": "The solutions are $x = 3/2 = 1.5$ and $x = -5$. Their sum is $1.5 + (-5) = -3.5 = -7/2$.",
    "keySource": "paper",
    "expectedPace": 75
}

# M1 Q18: Replace 5x - 7 = 2x + 11 with two-step inequality/boundary SPR
m1_1[17] = {
    "id": "pt1-math-m1-q18",
    "domain": "Algebra",
    "skill": "Linear models in context",
    "difficulty": "M",
    "html": False,
    "stem": "A catering service prepares boxed lunches for corporate events. The company charges a delivery fee of $40 plus $15 per boxed lunch. If a company has a budget of $550, what is the maximum number of boxed lunches they can order?",
    "format": "spr",
    "accepted": ["34"],
    "rationale": "Set up $40 + 15n \\le 550$. Subtract 40: $15n \\le 510$. Divide by 15: $n \\le 34$. The maximum number is 34.",
    "keySource": "paper",
    "expectedPace": 85
}

# M1 Q19: Replace x^2 - 9 = 0 with vertex form / zero product property
m1_1[18] = {
    "id": "pt1-math-m1-q19",
    "domain": "Advanced Math",
    "skill": "Nonlinear functions (zeros)",
    "difficulty": "M",
    "html": False,
    "stem": "The function $f$ is defined by $f(x) = (x - 7)^2 - 36$. What is the greater of the two zeros of $f$?",
    "format": "spr",
    "accepted": ["13"],
    "rationale": "Set $f(x) = 0$: $(x - 7)^2 - 36 = 0 \\implies (x - 7)^2 = 36$. Thus $x - 7 = 6$ or $x - 7 = -6$, giving $x = 13$ or $x = 1$. The greater zero is 13.",
    "keySource": "paper",
    "expectedPace": 90
}

# M1 Q20: Replace triangle base 8 height 5 with right triangle Pythagorean triple & area
m1_1[19] = {
    "id": "pt1-math-m1-q20",
    "domain": "Geometry and Trigonometry",
    "skill": "Right triangles (area and perimeter)",
    "difficulty": "M",
    "html": False,
    "stem": "A right triangle has a hypotenuse of length 17 units and one leg of length 8 units. What is the area, in square units, of the triangle?",
    "format": "spr",
    "accepted": ["60"],
    "rationale": "By the Pythagorean theorem, the other leg has length $\\sqrt{17^2 - 8^2} = \\sqrt{289 - 64} = \\sqrt{225} = 15$. The area is $(1/2) \\times 8 \\times 15 = 60$ square units.",
    "keySource": "paper",
    "expectedPace": 95
}

# M1 Q22: Replace car constant speed with multi-step rates / average speed
m1_1[21] = {
    "id": "pt1-math-m1-q22",
    "domain": "Problem-Solving and Data Analysis",
    "skill": "Ratios and rates",
    "difficulty": "M",
    "html": False,
    "stem": "A print shop prints 45 posters every 6 minutes. At this constant rate, how many posters can the print shop print in 24 minutes?",
    "format": "spr",
    "accepted": ["180"],
    "rationale": "The rate is $45 / 6 = 7.5$ posters per minute. In 24 minutes, it prints $7.5 \\times 24 = 180$ posters (or $24 / 6 = 4$ intervals of 45: $4 \\times 45 = 180$).",
    "keySource": "paper",
    "expectedPace": 85
}

# M2L Q07: Replace "Which is a solution to x^2 - 9 = 0?"
m2l_1[6] = {
    "id": "pt1-math-m2l-q07",
    "domain": "Advanced Math",
    "skill": "Quadratic equations (zeros)",
    "difficulty": "E",
    "html": False,
    "stem": "What is the positive solution to the equation $(x - 4)(x + 9) = 0$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "4"},
        {"id": "B", "text": "5"},
        {"id": "C", "text": "9"},
        {"id": "D", "text": "13"}
    ],
    "correct": "A",
    "rationale": "The solutions are $x = 4$ and $x = -9$. The positive solution is 4.",
    "keySource": "paper",
    "expectedPace": 70
}

save_test(path1, pt1)
print("Recalibrated Test 1")

# ==============================================================================
# PRACTICE TEST 2 RECALIBRATION
# ==============================================================================
path2, pt2 = load_test(2)
m1_2 = pt2["form"]["sections"][1]["module1"]["items"]
m2l_2 = pt2["form"]["sections"][1]["module2"]["lower"]["items"]

# M1 Q01: Replace 3x + 7 = 22
m1_2[0] = {
    "id": "pt2-math-m1-q01",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "A community gym charges a one-time registration fee of $35 plus $24 per month of membership. If Sofia paid a total of $179, for how many months of membership did she pay?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "5"},
        {"id": "B", "text": "6"},
        {"id": "C", "text": "7"},
        {"id": "D", "text": "8"}
    ],
    "correct": "B",
    "rationale": "Equation: $35 + 24m = 179$. Subtract 35: $24m = 144$. Divide by 24: $m = 6$ months.",
    "keySource": "paper",
    "expectedPace": 65
}

# M2L Q01: Replace 4x - 8 = 16
m2l_2[0] = {
    "id": "pt2-math-m2l-q01",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "A plumber charges a service call fee of $50 plus $45 per hour of work. If the total bill for a job was $230, how many hours did the plumber work?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "3"},
        {"id": "B", "text": "4"},
        {"id": "C", "text": "5"},
        {"id": "D", "text": "6"}
    ],
    "correct": "B",
    "rationale": "Equation: $50 + 45h = 230$. Subtract 50: $45h = 180$. Divide by 45: $h = 4$ hours.",
    "keySource": "paper",
    "expectedPace": 65
}

# M2L Q08: Replace x^2 = 25
m2l_2[7] = {
    "id": "pt2-math-m2l-q08",
    "domain": "Advanced Math",
    "skill": "Quadratic equations (factoring)",
    "difficulty": "E",
    "html": False,
    "stem": "What is the positive solution to the equation $x^2 - 7x - 18 = 0$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "2"},
        {"id": "B", "text": "7"},
        {"id": "C", "text": "9"},
        {"id": "D", "text": "18"}
    ],
    "correct": "C",
    "rationale": "Factoring yields $(x - 9)(x + 2) = 0$. The solutions are $x = 9$ and $x = -2$. The positive solution is 9.",
    "keySource": "paper",
    "expectedPace": 75
}

# M2L Q17: Replace legs 6 and 8 right triangle
m2l_2[16] = {
    "id": "pt2-math-m2l-q17",
    "domain": "Geometry and Trigonometry",
    "skill": "Similar triangles",
    "difficulty": "M",
    "html": False,
    "stem": "Triangle $ABC$ is similar to triangle $DEF$, where angle $A$ corresponds to angle $D$ and angle $B$ corresponds to angle $E$. If the measure of angle $A$ is $42^\\circ$ and the measure of angle $B$ is $76^\\circ$, what is the measure, in degrees, of angle $F$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "52"},
        {"id": "B", "text": "62"},
        {"id": "C", "text": "72"},
        {"id": "D", "text": "82"}
    ],
    "correct": "B",
    "rationale": "Since the interior angles of a triangle sum to $180^\\circ$: $\\text{m}\\angle C = 180^\\circ - (42^\\circ + 76^\\circ) = 180^\\circ - 118^\\circ = 62^\\circ$. Since the triangles are similar, $\\text{m}\\angle F = \\text{m}\\angle C = 62^\\circ$.",
    "keySource": "paper",
    "expectedPace": 80
}

save_test(path2, pt2)
print("Recalibrated Test 2")

# ==============================================================================
# PRACTICE TEST 3 RECALIBRATION
# ==============================================================================
path3, pt3 = load_test(3)
m1_3 = pt3["form"]["sections"][1]["module1"]["items"]
m2l_3 = pt3["form"]["sections"][1]["module2"]["lower"]["items"]

# M1 Q07: Replace x^2 - 9 = 0
m1_3[6] = {
    "id": "pt3-math-m1-q07",
    "domain": "Advanced Math",
    "skill": "Quadratic expressions (factoring)",
    "difficulty": "M",
    "html": False,
    "stem": "Which of the following is equivalent to $4x^2 - 25$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "(2x - 5)(2x + 5)"},
        {"id": "B", "text": "(4x - 5)(x + 5)"},
        {"id": "C", "text": "(2x - 5)^2"},
        {"id": "D", "text": "(4x - 25)(x + 1)"}
    ],
    "correct": "A",
    "rationale": "$4x^2 - 25$ is a difference of squares: $(2x)^2 - 5^2 = (2x - 5)(2x + 5)$.",
    "keySource": "paper",
    "expectedPace": 70
}

# M2L Q08: Replace x^2 - 9 = 0
m2l_3[7] = {
    "id": "pt3-math-m2l-q08",
    "domain": "Advanced Math",
    "skill": "Quadratic functions (vertex)",
    "difficulty": "M",
    "html": False,
    "stem": "The function $h(t) = -5(t - 3)^2 + 45$ gives the height, in meters, of an object $t$ seconds after being launched. What is the maximum height, in meters, reached by the object?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "3"},
        {"id": "B", "text": "15"},
        {"id": "C", "text": "45"},
        {"id": "D", "text": "90"}
    ],
    "correct": "C",
    "rationale": "The vertex form $h(t) = a(t - k)^2 + M$ has a maximum value of $M$ when $a < 0$. Here, the maximum height is 45 meters at $t = 3$ seconds.",
    "keySource": "paper",
    "expectedPace": 75
}

# M2L Q19: Replace 3x + 7 = 22
m2l_3[18] = {
    "id": "pt3-math-m2l-q19",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "An electronics store sells portable power banks for $22 each. A customer uses a coupon for $15 off the total purchase and pays a total of $117 before tax. How many power banks did the customer buy?",
    "format": "spr",
    "accepted": ["6"],
    "rationale": "Let p be the number of power banks: $22p - 15 = 117$. Add 15: $22p = 132$. Divide by 22: $p = 6$.",
    "keySource": "paper",
    "expectedPace": 75
}

# M2L Q22: Replace legs 3 and 4 right triangle
m2l_3[21] = {
    "id": "pt3-math-m2l-q22",
    "domain": "Geometry and Trigonometry",
    "skill": "Perimeter and geometry",
    "difficulty": "E",
    "html": False,
    "stem": "A rectangular garden has a length of 18 meters and a width of 11 meters. A gardener wants to place a fence around the entire perimeter of the garden. How many meters of fencing are needed?",
    "format": "spr",
    "accepted": ["58"],
    "rationale": "The perimeter of a rectangle is $2 \\times (\\text{length} + \\text{width}) = 2 \\times (18 + 11) = 2 \\times 29 = 58$ meters.",
    "keySource": "paper",
    "expectedPace": 70
}

save_test(path3, pt3)
print("Recalibrated Test 3")

# ==============================================================================
# PRACTICE TEST 4 RECALIBRATION
# ==============================================================================
path4, pt4 = load_test(4)
m1_4 = pt4["form"]["sections"][1]["module1"]["items"]
m2l_4 = pt4["form"]["sections"][1]["module2"]["lower"]["items"]

# M1 Q08: Replace x^2 = 81
m1_4[7] = {
    "id": "pt4-math-m1-q08",
    "domain": "Advanced Math",
    "skill": "Quadratic equations (zeros)",
    "difficulty": "M",
    "html": False,
    "stem": "What is the product of the solutions to the equation $x^2 - 6x - 16 = 0$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-16"},
        {"id": "B", "text": "-6"},
        {"id": "C", "text": "6"},
        {"id": "D", "text": "16"}
    ],
    "correct": "A",
    "rationale": "For any quadratic $x^2 + bx + c = 0$, the product of the roots is $c = -16$. (Or factor as $(x - 8)(x + 2) = 0$, roots 8 and -2: $8 \\times (-2) = -16$).",
    "keySource": "paper",
    "expectedPace": 75
}

# M1 Q20: Replace x^2 - 9 = 0
m1_4[19] = {
    "id": "pt4-math-m1-q20",
    "domain": "Advanced Math",
    "skill": "Exponential functions",
    "difficulty": "M",
    "html": False,
    "stem": "The function $P(t) = 250(2)^{t/4}$ models the population of insects in a terrarium $t$ days after observation began. After how many days will the population reach 1,000?",
    "format": "spr",
    "accepted": ["8"],
    "rationale": "Set $P(t) = 1000$: $250(2)^{t/4} = 1000 \\implies 2^{t/4} = 4 = 2^2 \\implies t/4 = 2 \\implies t = 8$ days.",
    "keySource": "paper",
    "expectedPace": 90
}

# M2L Q01: Replace 5x - 7 = 18
m2l_4[0] = {
    "id": "pt4-math-m2l-q01",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "A photographer charges an initial studio fee of $45 plus $18 for each edited digital portrait. If a client was billed a total of $135, how many edited digital portraits did the client order?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "3"},
        {"id": "B", "text": "5"},
        {"id": "C", "text": "7"},
        {"id": "D", "text": "9"}
    ],
    "correct": "B",
    "rationale": "Equation: $45 + 18p = 135 \\implies 18p = 90 \\implies p = 5$ portraits.",
    "keySource": "paper",
    "expectedPace": 65
}

# M2L Q02: Replace y/3 + 4 = 9
m2l_4[1] = {
    "id": "pt4-math-m2l-q02",
    "domain": "Algebra",
    "skill": "Linear functions (slope-intercept)",
    "difficulty": "E",
    "html": False,
    "stem": "A line in the xy-plane has a slope of 3 and passes through the point $(2, 11)$. What is the y-intercept of the line?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "3"},
        {"id": "B", "text": "5"},
        {"id": "C", "text": "7"},
        {"id": "D", "text": "9"}
    ],
    "correct": "B",
    "rationale": "Using $y = mx + b$: $11 = 3(2) + b \\implies 11 = 6 + b \\implies b = 5$.",
    "keySource": "paper",
    "expectedPace": 70
}

# M2L Q07: Replace x^2 = 81
m2l_4[6] = {
    "id": "pt4-math-m2l-q07",
    "domain": "Advanced Math",
    "skill": "Quadratic equations",
    "difficulty": "E",
    "html": False,
    "stem": "If $(x - 5)^2 = 49$ and $x > 0$, what is the value of $x$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "7"},
        {"id": "B", "text": "10"},
        {"id": "C", "text": "12"},
        {"id": "D", "text": "14"}
    ],
    "correct": "C",
    "rationale": "Taking the square root: $x - 5 = 7 \\implies x = 12$ (or $x - 5 = -7 \\implies x = -2$, but $x > 0$). Thus $x = 12$.",
    "keySource": "paper",
    "expectedPace": 70
}

save_test(path4, pt4)
print("Recalibrated Test 4")

# ==============================================================================
# PRACTICE TEST 5 RECALIBRATION
# ==============================================================================
path5, pt5 = load_test(5)
m1_5 = pt5["form"]["sections"][1]["module1"]["items"]
m2l_5 = pt5["form"]["sections"][1]["module2"]["lower"]["items"]

# M1 Q01: Replace 3x + 7 = 22
m1_5[0] = {
    "id": "pt5-math-m1-q01",
    "domain": "Algebra",
    "skill": "Linear models in context",
    "difficulty": "E",
    "html": False,
    "stem": "A mobile data plan costs $30 per month and includes 5 gigabytes (GB) of data. Each additional gigabyte costs $8. If a subscriber's bill for one month was $62, how many total gigabytes of data did the subscriber use?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "7"},
        {"id": "B", "text": "8"},
        {"id": "C", "text": "9"},
        {"id": "D", "text": "10"}
    ],
    "correct": "C",
    "rationale": "Let g be additional GB: $30 + 8g = 62 \\implies 8g = 32 \\implies g = 4$ additional GB. Total data = $5 + 4 = 9$ GB.",
    "keySource": "paper",
    "expectedPace": 70
}

# M1 Q07: Replace x^2 - 9 = 0
m1_5[6] = {
    "id": "pt5-math-m1-q07",
    "domain": "Advanced Math",
    "skill": "Quadratic functions (zeros)",
    "difficulty": "M",
    "html": False,
    "stem": "The graph of $y = x^2 - 10x + 21$ intersects the x-axis at points $(a, 0)$ and $(b, 0)$, where $a < b$. What is the value of $b - a$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "2"},
        {"id": "B", "text": "4"},
        {"id": "C", "text": "6"},
        {"id": "D", "text": "8"}
    ],
    "correct": "B",
    "rationale": "Factor: $(x - 7)(x - 3) = 0$. Roots are $a = 3$ and $b = 7$. $b - a = 7 - 3 = 4$.",
    "keySource": "paper",
    "expectedPace": 75
}

# M1 Q18: Replace 5x - 7 = 2x + 8
m1_5[17] = {
    "id": "pt5-math-m1-q18",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "M",
    "html": False,
    "stem": "A graphic designer charges $65 per hour plus a software licensing fee of $45 for a project. If the designer received a total payment of $435 for a project, how many hours were billed?",
    "format": "spr",
    "accepted": ["6"],
    "rationale": "Equation: $45 + 65h = 435 \\implies 65h = 390 \\implies h = 6$ hours.",
    "keySource": "paper",
    "expectedPace": 80
}

# M1 Q20: Replace triangle base 8 height 5 area
m1_5[19] = {
    "id": "pt5-math-m1-q20",
    "domain": "Geometry and Trigonometry",
    "skill": "Circles (arc length and radians)",
    "difficulty": "M",
    "html": False,
    "stem": "In a circle with radius 12 centimeters, an arc subtends a central angle of $\\frac{2\\pi}{3}$ radians. What is the length, in centimeters, of the arc? (Express the answer in terms of $\\pi$ if needed; enter the coefficient of $\\pi$, where arc length is $k\\pi$).",
    "format": "spr",
    "accepted": ["8"],
    "rationale": "Arc length $s = r \\theta = 12 \\times \\frac{2\\pi}{3} = 8\\pi$. The coefficient $k$ is 8.",
    "keySource": "paper",
    "expectedPace": 90
}

# M2L Q01: Replace 4x - 8 = 16
m2l_5[0] = {
    "id": "pt5-math-m2l-q01",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "A car rental company charges $38 per day plus a one-time insurance fee of $25. If a customer paid $215 in total, for how many days was the car rented?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "4"},
        {"id": "B", "text": "5"},
        {"id": "C", "text": "6"},
        {"id": "D", "text": "7"}
    ],
    "correct": "B",
    "rationale": "Equation: $25 + 38d = 215 \\implies 38d = 190 \\implies d = 5$ days.",
    "keySource": "paper",
    "expectedPace": 65
}

# M2L Q03: Replace 2x + 5 = x - 3
m2l_5[2] = {
    "id": "pt5-math-m2l-q03",
    "domain": "Algebra",
    "skill": "Linear equations in one variable",
    "difficulty": "E",
    "html": False,
    "stem": "If $4(x - 3) + 7 = 23$, what is the value of $x$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "5"},
        {"id": "B", "text": "6"},
        {"id": "C", "text": "7"},
        {"id": "D", "text": "8"}
    ],
    "correct": "C",
    "rationale": "Subtract 7: $4(x - 3) = 16$. Divide by 4: $x - 3 = 4 \\implies x = 7$.",
    "keySource": "paper",
    "expectedPace": 70
}

# M2L Q07: Replace "Which of the following is a quadratic equation?"
m2l_5[6] = {
    "id": "pt5-math-m2l-q07",
    "domain": "Advanced Math",
    "skill": "Quadratic expressions (expansion)",
    "difficulty": "E",
    "html": False,
    "stem": "Which of the following is equivalent to $(2x - 3)(x + 4)$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "2x^2 + 5x - 12"},
        {"id": "B", "text": "2x^2 - 5x - 12"},
        {"id": "C", "text": "2x^2 + 8x - 12"},
        {"id": "D", "text": "2x^2 + 5x + 12"}
    ],
    "correct": "A",
    "rationale": "FOIL expansion: $2x(x) + 2x(4) - 3(x) - 3(4) = 2x^2 + 8x - 3x - 12 = 2x^2 + 5x - 12$.",
    "keySource": "paper",
    "expectedPace": 70
}

# M2L Q11: Replace (6x + 3) / 3
m2l_5[10] = {
    "id": "pt5-math-m2l-q11",
    "domain": "Advanced Math",
    "skill": "Rational expressions",
    "difficulty": "E",
    "html": False,
    "stem": "Which of the following expressions is equivalent to $\\frac{8x^2 + 12x}{4x}$ for all $x \\ne 0$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "2x + 3"},
        {"id": "B", "text": "2x + 12"},
        {"id": "C", "text": "8x + 3"},
        {"id": "D", "text": "4x + 3"}
    ],
    "correct": "A",
    "rationale": "Divide each term in the numerator by $4x$: $\\frac{8x^2}{4x} + \\frac{12x}{4x} = 2x + 3$.",
    "keySource": "paper",
    "expectedPace": 70
}

save_test(path5, pt5)
print("Recalibrated Test 5")

print("All 5 tests successfully recalibrated to match the official Question Bank baseline!")
