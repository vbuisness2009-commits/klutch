import json
import os
import re

TESTS_DIR = os.path.join(os.getcwd(), "content", "tests")

def load_test(num):
    path = os.path.join(TESTS_DIR, f"practice-test-{num}.json")
    with open(path, "r", encoding="utf-8") as f:
        return path, json.load(f)

def save_test(path, data):
    data["updatedAt"] = "2026-10-11T15:15:00.000Z"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def wrap_math_equations(text):
    if not text:
        return ""
    # Wrap stand-alone equations and polynomials with $ if not already wrapped
    # e.g. x^2 - 7x + 12 -> $x^2 - 7x + 12$
    # e.g. P(x) = x^2 + 3x - 4 -> $P(x) = x^2 + 3x - 4$
    # We only touch non-$ segments
    parts = text.split('$')
    for i in range(0, len(parts), 2):
        # Even indices are outside math
        # Wrap expressions like x^2, x^3, y = mx + b
        parts[i] = re.sub(r'(\b[A-Za-z]\([a-zA-Z0-9,\s+-]+\)\s*=\s*[-+0-9A-Za-z\s\/\^\*\(\)\.]+)', r'$\1$', parts[i])
        parts[i] = re.sub(r'(?<=\s)([a-zA-Z]\^[0-9]+[-+0-9A-Za-z\s\/\^\*\(\)\.]*)', r'$\1$', parts[i])
    result = '$'.join(parts)
    # clean up any duplicate $$
    result = re.sub(r'\$\$+', r'$$', result)
    return result

print("Starting deep difficulty recalibration across all 5 tests...")

# ==============================================================================
# PRACTICE TEST 1 UPGRADES
# ==============================================================================
path1, pt1 = load_test(1)
m2l_1 = pt1["form"]["sections"][1]["module2"]["lower"]["items"]
m2u_1 = pt1["form"]["sections"][1]["module2"]["upper"]["items"]
rw_m1_1 = pt1["form"]["sections"][0]["module1"]["items"]

# pt1-math-m2l-q01
m2l_1[0] = {
    "id": "pt1-math-m2l-q01",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "A high school drama department sells adult tickets for $12 each and student tickets for $8 each. If the department sold a total of 150 tickets and collected $1,560, how many student tickets were sold?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "45"},
        {"id": "B", "text": "60"},
        {"id": "C", "text": "75"},
        {"id": "D", "text": "90"}
    ],
    "correct": "B",
    "rationale": "Let $a$ be adult tickets and $s$ be student tickets: $a + s = 150$ and $12a + 8s = 1560$. Substitute $a = 150 - s$: $12(150 - s) + 8s = 1560 \\implies 1800 - 4s = 1560 \\implies 4s = 240 \\implies s = 60$.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt1-math-m2l-q02
m2l_1[1] = {
    "id": "pt1-math-m2l-q02",
    "domain": "Algebra",
    "skill": "Linear equation structure",
    "difficulty": "E",
    "html": False,
    "stem": "If $3(2x - 5) + 4 = 37$, what is the value of $2x - 5$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "8"},
        {"id": "B", "text": "11"},
        {"id": "C", "text": "13"},
        {"id": "D", "text": "16"}
    ],
    "correct": "B",
    "rationale": "Subtract 4 from both sides: $3(2x - 5) = 33$. Divide both sides by 3: $2x - 5 = 11$.",
    "keySource": "paper",
    "expectedPace": 60
}

# pt1-math-m2l-q05
m2l_1[4] = {
    "id": "pt1-math-m2l-q05",
    "domain": "Algebra",
    "skill": "Linear functions in context",
    "difficulty": "E",
    "html": False,
    "stem": "At a state park, the fee to rent a kayak is $25 for the first two hours plus $10 for each additional hour. Which of the following functions $C$ models the total cost, in dollars, to rent a kayak for $t$ hours, where $t \\ge 2$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "C(t) = 10t + 5"},
        {"id": "B", "text": "C(t) = 10t + 25"},
        {"id": "C", "text": "C(t) = 25t + 10"},
        {"id": "D", "text": "C(t) = 35t - 10"}
    ],
    "correct": "A",
    "rationale": "The cost for the first two hours is 25. For $t \\ge 2$, there are $t - 2$ additional hours: $C(t) = 25 + 10(t - 2) = 25 + 10t - 20 = 10t + 5$.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt1-math-m2u-q01
m2u_1[0] = {
    "id": "pt1-math-m2u-q01",
    "domain": "Algebra",
    "skill": "Linear systems (no solution)",
    "difficulty": "H",
    "html": False,
    "stem": "The system of equations below has no solution. What is the value of the constant $k$?\n$$3x - 5y = 12$$\n$$kx + 10y = -7$$",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-6"},
        {"id": "B", "text": "-3"},
        {"id": "C", "text": "3"},
        {"id": "D", "text": "6"}
    ],
    "correct": "A",
    "rationale": "A system of two linear equations has no solution when the lines are parallel (equal slopes) but have different $y$-intercepts. The slope of the first line is $3/5$. The slope of the second line is $-k/10$. Setting them equal: $3/5 = -k/10 \\implies 30 = -5k \\implies k = -6$.",
    "keySource": "paper",
    "expectedPace": 75
}

# pt1-math-m2u-q02
m2u_1[1] = {
    "id": "pt1-math-m2u-q02",
    "domain": "Advanced Math",
    "skill": "Quadratic optimization",
    "difficulty": "H",
    "html": False,
    "stem": "The function $f$ is defined by $f(x) = (x - 3)(x + 7) + 29$. What is the minimum value of $f(x)$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-21"},
        {"id": "B", "text": "4"},
        {"id": "C", "text": "8"},
        {"id": "D", "text": "29"}
    ],
    "correct": "B",
    "rationale": "Expand $f(x)$: $f(x) = x^2 + 4x - 21 + 29 = x^2 + 4x + 8$. The vertex occurs at $x = -b/(2a) = -4/2 = -2$. The minimum value is $f(-2) = (-2)^2 + 4(-2) + 8 = 4 - 8 + 8 = 4$.",
    "keySource": "paper",
    "expectedPace": 85
}

# pt1-math-m2u-q18
m2u_1[17] = {
    "id": "pt1-math-m2u-q18",
    "domain": "Advanced Math",
    "skill": "Nonlinear systems / Tangency",
    "difficulty": "H",
    "html": False,
    "stem": "In the $xy$-plane, the parabola $y = x^2 - 6x + c$ is tangent to the horizontal line $y = 5$. What is the value of the constant $c$?",
    "format": "spr",
    "accepted": ["14"],
    "rationale": "The vertex of the parabola $y = x^2 - 6x + c$ occurs at $x = 3$. At the vertex, $y = (3)^2 - 6(3) + c = c - 9$. Since the parabola opens upward and is tangent to $y = 5$, the minimum value must be 5: $c - 9 = 5 \\implies c = 14$.",
    "keySource": "paper",
    "expectedPace": 90
}

# RW P1 upgrades for authentic academic context
rw_m1_1[17] = {
    "id": "pt1-rw-m1-q18",
    "domain": "Standard English Conventions",
    "skill": "Boundaries",
    "difficulty": "M",
    "html": False,
    "stimulus": "In 1928, bacteriologist Alexander Fleming returned to his laboratory to find that a green mold had contaminated a petri dish of Staphylococcus bacteria. What caught his attention was not the mold itself, but the clear halo surrounding it: the mold was actively synthesizing a compound that inhibited bacterial _______ Fleming named the substance penicillin.",
    "stem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "growth; and"},
        {"id": "B", "text": "growth. Later,"},
        {"id": "C", "text": "growth, and"},
        {"id": "D", "text": "growth; later,"}
    ],
    "correct": "D",
    "rationale": "Choice D is correct. A semicolon followed by the transitional adverb 'later' appropriately joins the two independent clauses without creating a run-on or comma splice.",
    "keySource": "paper",
    "expectedPace": 45
}

rw_m1_1[19] = {
    "id": "pt1-rw-m1-q20",
    "domain": "Standard English Conventions",
    "skill": "Form, Structure, and Sense",
    "difficulty": "M",
    "html": False,
    "stimulus": "Ecosystem ecologists studying alpine tundra vegetation in the Rocky Mountains have observed that cushion plants—dense, low-growing mats of perennial herbs—facilitate the survival of neighboring species. By trapping windblown soil and moisture, each cushion _______ microclimatic extremes for delicate seedlings that would otherwise perish.",
    "stem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "mitigate"},
        {"id": "B", "text": "mitigates"},
        {"id": "C", "text": "mitigating"},
        {"id": "D", "text": "have mitigated"}
    ],
    "correct": "B",
    "rationale": "Choice B is correct. The subject of the independent clause is 'each cushion' (singular), which requires the singular present-tense verb 'mitigates'.",
    "keySource": "paper",
    "expectedPace": 40
}

rw_m1_1[20] = {
    "id": "pt1-rw-m1-q21",
    "domain": "Standard English Conventions",
    "skill": "Form, Structure, and Sense",
    "difficulty": "M",
    "html": False,
    "stimulus": "Having spent nearly a decade cataloging the rare manuscript fragments preserved in the library at Mount Sinai, _______ the complete theological treatises of fourth-century scholars.",
    "stem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "the research team was able to reconstruct"},
        {"id": "B", "text": "the reconstruction was achieved by the research team of"},
        {"id": "C", "text": "it was possible for the research team to reconstruct"},
        {"id": "D", "text": "reconstruction of the texts was completed by the research team,"}
    ],
    "correct": "A",
    "rationale": "Choice A is correct. The opening participial phrase 'Having spent nearly a decade cataloging...' modifies the subject immediately following the comma. The research team spent the decade cataloging, not 'the reconstruction' or 'it'.",
    "keySource": "paper",
    "expectedPace": 45
}

save_test(path1, pt1)
print("Test 1 fully recalibrated.")


# ==============================================================================
# PRACTICE TEST 2 UPGRADES
# ==============================================================================
path2, pt2 = load_test(2)
m1_2 = pt2["form"]["sections"][1]["module1"]["items"]
m2l_2 = pt2["form"]["sections"][1]["module2"]["lower"]["items"]
m2u_2 = pt2["form"]["sections"][1]["module2"]["upper"]["items"]
rw_m2l_2 = pt2["form"]["sections"][0]["module2"]["lower"]["items"]

# pt2-math-m1-q02
m1_2[1] = {
    "id": "pt2-math-m1-q02",
    "domain": "Algebra",
    "skill": "Linear models in context",
    "difficulty": "E",
    "html": False,
    "stem": "A car rental company charges a flat reservation fee of $35 plus $0.20 per mile driven. If a customer drove $m$ miles and the total cost was $71, how many miles did the customer drive?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "145"},
        {"id": "B", "text": "160"},
        {"id": "C", "text": "180"},
        {"id": "D", "text": "215"}
    ],
    "correct": "C",
    "rationale": "Set up the linear equation: $35 + 0.20m = 71$. Subtract 35: $0.20m = 36$. Divide by 0.20: $m = 180$ miles.",
    "keySource": "paper",
    "expectedPace": 65
}

# pt2-math-m1-q04
m1_2[3] = {
    "id": "pt2-math-m1-q04",
    "domain": "Algebra",
    "skill": "Linear systems in context",
    "difficulty": "M",
    "html": False,
    "stem": "A chemist mixes an 8% saline solution with a 20% saline solution to produce 30 liters of a 12% saline solution. How many liters of the 20% saline solution are used in the mixture?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "8"},
        {"id": "B", "text": "10"},
        {"id": "C", "text": "12"},
        {"id": "D", "text": "15"}
    ],
    "correct": "B",
    "rationale": "Let $x$ be liters of 20% solution. Then $30 - x$ liters of 8% solution are used: $0.08(30 - x) + 0.20x = 0.12(30) \\implies 2.4 - 0.08x + 0.20x = 3.6 \\implies 0.12x = 1.2 \\implies x = 10$ liters.",
    "keySource": "paper",
    "expectedPace": 75
}

# pt2-math-m1-q18
m1_2[17] = {
    "id": "pt2-math-m1-q18",
    "domain": "Algebra",
    "skill": "Linear equations (structure)",
    "difficulty": "M",
    "html": False,
    "stem": "If $2(3x - 4) + 5 = 27$, what is the value of $3x - 4$?",
    "format": "spr",
    "accepted": ["11"],
    "rationale": "Subtract 5 from both sides: $2(3x - 4) = 22$. Divide by 2: $3x - 4 = 11$.",
    "keySource": "paper",
    "expectedPace": 60
}

# pt2-math-m1-q19
m1_2[18] = {
    "id": "pt2-math-m1-q19",
    "domain": "Algebra",
    "skill": "Linear functions (tables)",
    "difficulty": "M",
    "html": False,
    "stem": "For a linear function $f$, $f(2) = 11$, $f(5) = 23$, and $f(8) = 35$. What is the value of $f(0)$?",
    "format": "spr",
    "accepted": ["3"],
    "rationale": "The slope is $m = (23 - 11)/(5 - 2) = 12/3 = 4$. Using $f(x) = 4x + b$, substitute $(2, 11)$: $11 = 4(2) + b \\implies b = 3$. Thus $f(0) = 3$.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt2-math-m2l-q02
m2l_2[1] = {
    "id": "pt2-math-m2l-q02",
    "domain": "Algebra",
    "skill": "Linear equations in context",
    "difficulty": "E",
    "html": False,
    "stem": "A gym charges a $40 initiation fee plus $25 per month for membership. If a member has paid a total of $240, for how many months has the member belonged to the gym?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "6"},
        {"id": "B", "text": "7"},
        {"id": "C", "text": "8"},
        {"id": "D", "text": "9"}
    ],
    "correct": "C",
    "rationale": "Set up $40 + 25m = 240 \\implies 25m = 200 \\implies m = 8$ months.",
    "keySource": "paper",
    "expectedPace": 65
}

# pt2-math-m2l-q03
m2l_2[2] = {
    "id": "pt2-math-m2l-q03",
    "domain": "Algebra",
    "skill": "Linear inequalities in context",
    "difficulty": "E",
    "html": False,
    "stem": "To qualify for free shipping, an online order must total at least $75. An order currently contains a book for $19 and $n$ notebook sets for $14 each. Which inequality represents all values of $n$ for which the order qualifies for free shipping?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "19 + 14n >= 75"},
        {"id": "B", "text": "19 + 14n <= 75"},
        {"id": "C", "text": "14n - 19 >= 75"},
        {"id": "D", "text": "19n + 14 >= 75"}
    ],
    "correct": "A",
    "rationale": "The total cost of the order is $19 + 14n$. For it to be at least $75, $19 + 14n \\ge 75$.",
    "keySource": "paper",
    "expectedPace": 60
}

# pt2-math-m2l-q04
m2l_2[3] = {
    "id": "pt2-math-m2l-q04",
    "domain": "Geometry and Trigonometry",
    "skill": "Area and perimeter",
    "difficulty": "E",
    "html": False,
    "stem": "A rectangular art studio has an area of 432 square feet. If the length of the studio is 6 feet greater than its width, what is the width, in feet, of the studio?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "14"},
        {"id": "B", "text": "16"},
        {"id": "C", "text": "18"},
        {"id": "D", "text": "24"}
    ],
    "correct": "C",
    "rationale": "Let $w$ be the width. Area $= w(w + 6) = 432 \\implies w^2 + 6w - 432 = 0 \\implies (w + 24)(w - 18) = 0$. Since width must be positive, $w = 18$ feet.",
    "keySource": "paper",
    "expectedPace": 75
}

# pt2-math-m2l-q07
m2l_2[6] = {
    "id": "pt2-math-m2l-q07",
    "domain": "Advanced Math",
    "skill": "Factoring quadratics",
    "difficulty": "E",
    "html": False,
    "stem": "Which of the following expressions is a factor of $2x^2 + 7x - 15$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "2x - 3"},
        {"id": "B", "text": "2x + 3"},
        {"id": "C", "text": "x - 5"},
        {"id": "D", "text": "x + 3"}
    ],
    "correct": "A",
    "rationale": "Factor $2x^2 + 7x - 15$: we look for factors of $2(-15) = -30$ that sum to 7, which are 10 and -3: $2x^2 + 10x - 3x - 15 = 2x(x + 5) - 3(x + 5) = (2x - 3)(x + 5)$. Therefore, $2x - 3$ is a factor.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt2-math-m2u-q01
m2u_2[0] = {
    "id": "pt2-math-m2u-q01",
    "domain": "Advanced Math",
    "skill": "Quadratic discriminant",
    "difficulty": "H",
    "html": False,
    "stem": "For what positive value of the constant $b$ does the equation $x^2 + bx + 36 = 0$ have exactly one distinct real solution?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "6"},
        {"id": "B", "text": "9"},
        {"id": "C", "text": "12"},
        {"id": "D", "text": "18"}
    ],
    "correct": "C",
    "rationale": "A quadratic equation has exactly one real solution when its discriminant is zero: $b^2 - 4(1)(36) = 0 \\implies b^2 - 144 = 0 \\implies b = 12$ (since $b > 0$).",
    "keySource": "paper",
    "expectedPace": 75
}

# pt2-math-m2u-q03
m2u_2[2] = {
    "id": "pt2-math-m2u-q03",
    "domain": "Advanced Math",
    "skill": "Nonlinear systems",
    "difficulty": "H",
    "html": False,
    "stem": "The system of equations below is satisfied by the point $(x, y)$. What is the greatest possible value of $x$?\n$$x^2 + y^2 = 25$$\n$$y = 2x - 5$$",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "0"},
        {"id": "B", "text": "2"},
        {"id": "C", "text": "4"},
        {"id": "D", "text": "5"}
    ],
    "correct": "C",
    "rationale": "Substitute $y = 2x - 5$ into $x^2 + y^2 = 25$: $x^2 + (2x - 5)^2 = 25 \\implies x^2 + 4x^2 - 20x + 25 = 25 \\implies 5x^2 - 20x = 0 \\implies 5x(x - 4) = 0$. Thus $x = 0$ or $x = 4$. The greatest value is 4.",
    "keySource": "paper",
    "expectedPace": 85
}

# RW Test 2 Module 2 Lower grammar upgrades
academic_rw_fixes = [
    (16, "In her 1962 landmark book *Silent Spring*, marine biologist Rachel Carson documented the detrimental environmental effects of indiscriminate pesticide use, _______ the modern environmental movement and leading to the eventual nationwide ban on DDT.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "catalyzing"}, {"id": "B", "text": "catalyzes"}, {"id": "C", "text": "it catalyzed"}, {"id": "D", "text": "and catalyze"}],
     "A", "Choice A is correct. The non-finite participial phrase 'catalyzing the modern environmental movement' correctly modifies the main clause without creating a comma splice."),
    (17, "Archaeologists excavating the ancient Maya city of Tikal uncovered hundreds of ceremonial vessels; subsequent chemical analysis revealed residues of theobromine, an organic compound unique to _______ confirming that the elite residents regularly consumed chocolate drinks during ritual feasts.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "cacao;"}, {"id": "B", "text": "cacao,"}, {"id": "C", "text": "cacao:"}, {"id": "D", "text": "cacao"}],
     "B", "Choice B is correct. A comma followed by the participial phrase 'confirming that...' correctly attaches the supplementary result to the independent clause."),
    (18, "During the late nineteenth century, astronomer Henrietta Swan Leavitt discovered that Cepheid variable stars exhibit a direct relationship between their intrinsic luminosity and their pulsation period: the brighter the star, the longer its period. This revelation _______ astronomers like Edwin Hubble to measure the vast distances to distant galaxies for the first time.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "enabled"}, {"id": "B", "text": "enabling"}, {"id": "C", "text": "to enable"}, {"id": "D", "text": "having enabled"}],
     "A", "Choice A is correct. The independent clause requires a finite past-tense main verb ('enabled') to agree with the subject 'This revelation'."),
    (19, "Neither the lead engineer nor the laboratory technicians _______ surprised by the composite material's tensile resilience during the cryogenic stress tests, as earlier simulations had predicted comparable durability.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "was"}, {"id": "B", "text": "were"}, {"id": "C", "text": "is"}, {"id": "D", "text": "are"}],
     "B", "Choice B is correct. In a 'neither... nor' construction, the verb agrees with the closer subject. 'Technicians' is plural, requiring the plural verb 'were' in past tense."),
    (20, "Emerging in northern France during the mid-twelfth century, Gothic cathedrals revolutionized architectural engineering through three innovative _______ pointed arches, ribbed vaulting, and flying buttresses.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "elements:"}, {"id": "B", "text": "elements,"}, {"id": "C", "text": "elements;"}, {"id": "D", "text": "elements"}] ,
     "A", "Choice A is correct. A colon is the standard punctuation mark used after an independent clause to introduce an illustrative list of elements."),
    (21, "Having completed exhaustive surveys of pollinator diversity across agricultural hedgerows in East Anglia, _______ an alarming 40 percent decline in native bumblebee foraging activity over the past decade.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "the researchers documented"}, {"id": "B", "text": "the documentation by the researchers showed"}, {"id": "C", "text": "it was documented by researchers that"}, {"id": "D", "text": "an alarming report was published by researchers showing"}],
     "A", "Choice A is correct. The introductory modifying phrase 'Having completed exhaustive surveys...' logically modifies the subject 'the researchers', who performed the action.")
]

for idx, stim, stem, chs, corr, rat in academic_rw_fixes:
    rw_m2l_2[idx] = {
        "id": rw_m2l_2[idx]["id"],
        "domain": "Standard English Conventions",
        "skill": "Boundaries and Sentence Structure",
        "difficulty": "M",
        "html": False,
        "stimulus": stim,
        "stem": stem,
        "format": "mc",
        "choices": chs,
        "correct": corr,
        "rationale": rat,
        "keySource": "paper",
        "expectedPace": 45
    }

save_test(path2, pt2)
print("Test 2 fully recalibrated.")


# ==============================================================================
# PRACTICE TEST 3 UPGRADES
# ==============================================================================
path3, pt3 = load_test(3)
m1_3 = pt3["form"]["sections"][1]["module1"]["items"]
m2l_3 = pt3["form"]["sections"][1]["module2"]["lower"]["items"]
m2u_3 = pt3["form"]["sections"][1]["module2"]["upper"]["items"]
rw_m1_3 = pt3["form"]["sections"][0]["module1"]["items"]
rw_m2l_3 = pt3["form"]["sections"][0]["module2"]["lower"]["items"]

# pt3-math-m1-q01
m1_3[0] = {
    "id": "pt3-math-m1-q01",
    "domain": "Algebra",
    "skill": "Linear models in context",
    "difficulty": "E",
    "html": False,
    "stem": "An IT technician charges a flat diagnostic fee of $50 plus $35 per half hour of network repair. If a company was billed a total of $260, how many total hours of network repair did the technician perform?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "2.5"},
        {"id": "B", "text": "3.0"},
        {"id": "C", "text": "3.5"},
        {"id": "D", "text": "4.0"}
    ],
    "correct": "B",
    "rationale": "At $35 per half hour, the hourly rate is $70/hr. Set up $50 + 70h = 260 \\implies 70h = 210 \\implies h = 3$ hours.",
    "keySource": "paper",
    "expectedPace": 65
}

# pt3-math-m1-q02
m1_3[1] = {
    "id": "pt3-math-m1-q02",
    "domain": "Algebra",
    "skill": "Linear equations (structure)",
    "difficulty": "E",
    "html": False,
    "stem": "If $4(3x - 1) - 6 = 26$, what is the value of $3x - 1$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "6"},
        {"id": "B", "text": "8"},
        {"id": "C", "text": "10"},
        {"id": "D", "text": "12"}
    ],
    "correct": "B",
    "rationale": "Add 6 to both sides: $4(3x - 1) = 32$. Divide both sides by 4: $3x - 1 = 8$.",
    "keySource": "paper",
    "expectedPace": 60
}

# pt3-math-m1-q08
m1_3[7] = {
    "id": "pt3-math-m1-q08",
    "domain": "Advanced Math",
    "skill": "Quadratic functions (symmetry)",
    "difficulty": "M",
    "html": False,
    "stem": "For the quadratic function $f$, $f(x) = x^2 - 6x + c$, where $c$ is a constant. If $f(4) = 5$, what is the value of $f(2)$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "1"},
        {"id": "B", "text": "3"},
        {"id": "C", "text": "5"},
        {"id": "D", "text": "9"}
    ],
    "correct": "C",
    "rationale": "The axis of symmetry for $f(x) = x^2 - 6x + c$ is $x = -(-6)/2 = 3$. Because $x = 2$ and $x = 4$ are equidistant from the axis of symmetry ($|2 - 3| = |4 - 3| = 1$), their function values are equal: $f(2) = f(4) = 5$.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt3-math-m2l-q01
m2l_3[0] = {
    "id": "pt3-math-m2l-q01",
    "domain": "Algebra",
    "skill": "Linear models in context",
    "difficulty": "E",
    "html": False,
    "stem": "A catering service charges a base delivery fee of $60 plus $18 per guest. If an event host was billed a total of $690, how many guests attended the event?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "25"},
        {"id": "B", "text": "30"},
        {"id": "C", "text": "35"},
        {"id": "D", "text": "40"}
    ],
    "correct": "C",
    "rationale": "Set up $60 + 18g = 690 \\implies 18g = 630 \\implies g = 35$ guests.",
    "keySource": "paper",
    "expectedPace": 65
}

# pt3-math-m2u-q01
m2u_3[0] = {
    "id": "pt3-math-m2u-q01",
    "domain": "Algebra",
    "skill": "Linear systems (infinite solutions)",
    "difficulty": "H",
    "html": False,
    "stem": "The system of equations below has infinitely many solutions. What is the value of the constant $k$?\n$$4x - 6y = 10$$\n$$6x - ky = 15$$",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "6"},
        {"id": "B", "text": "8"},
        {"id": "C", "text": "9"},
        {"id": "D", "text": "12"}
    ],
    "correct": "C",
    "rationale": "Multiply the first equation by $1.5$: $1.5(4x - 6y) = 1.5(10) \\implies 6x - 9y = 15$. Comparing with $6x - ky = 15$, we have $k = 9$.",
    "keySource": "paper",
    "expectedPace": 75
}

# pt3-math-m2u-q04
m2u_3[3] = {
    "id": "pt3-math-m2u-q04",
    "domain": "Advanced Math",
    "skill": "Exponential growth modeling",
    "difficulty": "H",
    "html": False,
    "stem": "A microbiologist models a bacterial colony with the function $P(t) = 800(2)^{t/4}$, where $t$ is the elapsed time in hours. By what factor does the population increase every 12 hours?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "4"},
        {"id": "B", "text": "6"},
        {"id": "C", "text": "8"},
        {"id": "D", "text": "16"}
    ],
    "correct": "C",
    "rationale": "Over 12 hours, $t = 12$. The growth factor is $2^{12/4} = 2^3 = 8$. The population increases by a factor of 8.",
    "keySource": "paper",
    "expectedPace": 75
}

# pt3-rw grammar fixes
rw_m1_3[17] = {
    "id": "pt3-rw-m1-q18",
    "domain": "Standard English Conventions",
    "skill": "Boundaries",
    "difficulty": "M",
    "html": False,
    "stimulus": "Glaciologists measuring ice core samples extracted from the West Antarctic Ice Sheet identified distinct ash layers dating back millennia. These tephra deposits provide precise chronological _______ allowing researchers to synchronize Antarctic climatic records with Greenland ice cores.",
    "stem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "markers,"},
        {"id": "B", "text": "markers;"},
        {"id": "C", "text": "markers:"},
        {"id": "D", "text": "markers"}
    ],
    "correct": "A",
    "rationale": "Choice A is correct. A comma is required before the participial phrase 'allowing researchers to...' which acts as an adverbial modifier explaining the consequence of the markers.",
    "keySource": "paper",
    "expectedPace": 45
}

save_test(path3, pt3)
print("Test 3 fully recalibrated.")


# ==============================================================================
# PRACTICE TEST 4 UPGRADES
# ==============================================================================
path4, pt4 = load_test(4)
m1_4 = pt4["form"]["sections"][1]["module1"]["items"]
m2l_4 = pt4["form"]["sections"][1]["module2"]["lower"]["items"]
m2u_4 = pt4["form"]["sections"][1]["module2"]["upper"]["items"]
rw_m2l_4 = pt4["form"]["sections"][0]["module2"]["lower"]["items"]

# pt4-math-m1-q01
m1_4[0] = {
    "id": "pt4-math-m1-q01",
    "domain": "Algebra",
    "skill": "Linear models in context",
    "difficulty": "E",
    "html": False,
    "stem": "A solar panel installer charges a flat consultation fee of $250 plus $75 per hour of installation work. If a residential installation totaled $1,450 in charges, how many hours of work were performed?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "12"},
        {"id": "B", "text": "14"},
        {"id": "C", "text": "16"},
        {"id": "D", "text": "18"}
    ],
    "correct": "C",
    "rationale": "Set up $250 + 75h = 1450 \\implies 75h = 1200 \\implies h = 16$ hours.",
    "keySource": "paper",
    "expectedPace": 65
}

# pt4-math-m1-q02
m1_4[1] = {
    "id": "pt4-math-m1-q02",
    "domain": "Algebra",
    "skill": "Linear equations (structure)",
    "difficulty": "E",
    "html": False,
    "stem": "If $3(4x - 7) + 5 = 26$, what is the value of $4x - 7$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "5"},
        {"id": "B", "text": "7"},
        {"id": "C", "text": "9"},
        {"id": "D", "text": "11"}
    ],
    "correct": "B",
    "rationale": "Subtract 5 from both sides: $3(4x - 7) = 21$. Divide by 3: $4x - 7 = 7$.",
    "keySource": "paper",
    "expectedPace": 60
}

# pt4-math-m1-q18
m1_4[17] = {
    "id": "pt4-math-m1-q18",
    "domain": "Algebra",
    "skill": "Linear equations (algebraic structure)",
    "difficulty": "M",
    "html": False,
    "stem": "If $5(2x - 3) = 45$, what is the value of $2x - 1$?",
    "format": "spr",
    "accepted": ["11"],
    "rationale": "Divide by 5: $2x - 3 = 9 \\implies 2x = 12$. Therefore, $2x - 1 = 12 - 1 = 11$.",
    "keySource": "paper",
    "expectedPace": 60
}

# pt4-math-m1-q19
m1_4[18] = {
    "id": "pt4-math-m1-q19",
    "domain": "Algebra",
    "skill": "Linear function extrapolation",
    "difficulty": "M",
    "html": False,
    "stem": "For the linear function $f$, $f(2) = 7$ and $f(6) = 19$. What is the value of $f(10)$?",
    "format": "spr",
    "accepted": ["31"],
    "rationale": "The slope is $m = (19 - 7)/(6 - 2) = 12/4 = 3$. Since 10 is 4 units past 6, $f(10) = 19 + 3(4) = 31$.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt4-math-m2u-q01
m2u_4[0] = {
    "id": "pt4-math-m2u-q01",
    "domain": "Advanced Math",
    "skill": "Nonlinear system tangency",
    "difficulty": "H",
    "html": False,
    "stem": "In the $xy$-plane, the line $y = 2x + k$ intersects the parabola $y = 2x^2 - 8x + 11$ at exactly one point. What is the value of the constant $k$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-3"},
        {"id": "B", "text": "-1.5"},
        {"id": "C", "text": "1.5"},
        {"id": "D", "text": "3"}
    ],
    "correct": "B",
    "rationale": "Set the equations equal: $2x^2 - 8x + 11 = 2x + k \\implies 2x^2 - 10x + (11 - k) = 0$. For exactly one intersection point, the discriminant must equal zero: $D = (-10)^2 - 4(2)(11 - k) = 0 \\implies 100 - 88 + 8k = 0 \\implies 12 + 8k = 0 \\implies k = -1.5$.",
    "keySource": "paper",
    "expectedPace": 85
}

# pt4-math-m2u-q05
m2u_4[4] = {
    "id": "pt4-math-m2u-q05",
    "domain": "Geometry and Trigonometry",
    "skill": "Circle equations (standard form)",
    "difficulty": "H",
    "html": False,
    "stem": "The equation $x^2 + 10x + y^2 - 6y = 15$ represents a circle in the $xy$-plane. What is the diameter of the circle?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "7"},
        {"id": "B", "text": "10"},
        {"id": "C", "text": "14"},
        {"id": "D", "text": "28"}
    ],
    "correct": "C",
    "rationale": "Complete the square for $x$ and $y$: $(x^2 + 10x + 25) + (y^2 - 6y + 9) = 15 + 25 + 9 \\implies (x + 5)^2 + (y - 3)^2 = 49$. The radius is $r = \\sqrt{49} = 7$. The diameter is $2r = 14$.",
    "keySource": "paper",
    "expectedPace": 80
}

# RW Test 4 M2L upgrades
academic_rw_fixes_t4 = [
    (17, "During deep-sea dives in the Mariana Trench, marine biologists observed the Mariana snailfish (*Pseudoliparis swirei*) thriving at depths exceeding 26,000 _______ its bones are partially cartilaginous and its cellular membranes are rich in unsaturated fatty acids that resist immense hydrostatic pressure.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "feet; because"}, {"id": "B", "text": "feet: because"}, {"id": "C", "text": "feet:"}, {"id": "D", "text": "feet,"}],
     "C", "Choice C is correct. A colon introduces an independent clause that elaborates upon or explains the preceding statement."),
    (18, "In the early twentieth century, composer Florence Price seamlessly blended classical European symphonic structures with African American spiritual _______ her Symphony in E minor was the first composition by an African American woman to be played by a major American orchestra.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "melodies, in 1933,"}, {"id": "B", "text": "melodies; in 1933,"}, {"id": "C", "text": "melodies in 1933,"}, {"id": "D", "text": "melodies and in 1933"}],
     "B", "Choice B is correct. A semicolon separates two related independent clauses where the second clause begins with the prepositional phrase 'in 1933'."),
    (19, "A coalition of international botanists, after reviewing herbarium specimens gathered over two centuries across five _______ that at least 15 percent of endemic alpine flora face elevated extinction risks due to climate change.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "continents, concluded"}, {"id": "B", "text": "continents; concluded"}, {"id": "C", "text": "continents concluded,"}, {"id": "D", "text": "continents, concluding"}],
     "A", "Choice A is correct. The nonrestrictive prepositional phrase 'after reviewing herbarium specimens...' must be closed with a comma before the main predicate 'concluded'."),
    (20, "Analyzing satellite telemetry from migration corridors, researchers found that the Arctic tern's annual round-trip journey spans nearly 44,000 miles, an endurance feat that _______ any other avian migration recorded.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "surpasses"}, {"id": "B", "text": "surpassing"}, {"id": "C", "text": "to surpass"}, {"id": "D", "text": "have surpassed"}],
     "A", "Choice A is correct. The singular antecedent 'an endurance feat' takes the singular present verb 'surpasses' inside the relative clause."),
    (21, "Having refined the CRISPR-Cas9 genome editing technique to target single nucleotide substitutions with unprecedented precision, _______ a vast array of hereditary genetic disorders without introducing double-stranded DNA breaks.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "molecular biologists can now correct"}, {"id": "B", "text": "the correction of genetic mutations by molecular biologists allows"}, {"id": "C", "text": "it is now possible for molecular biologists to correct"}, {"id": "D", "text": "therapies developed by molecular biologists now treat"}],
     "A", "Choice A is correct. The modifier 'Having refined...' correctly refers to 'molecular biologists', the subject that did the refining.")
]

for idx, stim, stem, chs, corr, rat in academic_rw_fixes_t4:
    rw_m2l_4[idx] = {
        "id": rw_m2l_4[idx]["id"],
        "domain": "Standard English Conventions",
        "skill": "Boundaries and Syntax",
        "difficulty": "M",
        "html": False,
        "stimulus": stim,
        "stem": stem,
        "format": "mc",
        "choices": chs,
        "correct": corr,
        "rationale": rat,
        "keySource": "paper",
        "expectedPace": 45
    }

save_test(path4, pt4)
print("Test 4 fully recalibrated.")


# ==============================================================================
# PRACTICE TEST 5 UPGRADES
# ==============================================================================
path5, pt5 = load_test(5)
m1_5 = pt5["form"]["sections"][1]["module1"]["items"]
m2l_5 = pt5["form"]["sections"][1]["module2"]["lower"]["items"]
m2u_5 = pt5["form"]["sections"][1]["module2"]["upper"]["items"]
rw_m2l_5 = pt5["form"]["sections"][0]["module2"]["lower"]["items"]

# pt5-math-m1-q02
m1_5[1] = {
    "id": "pt5-math-m1-q02",
    "domain": "Algebra",
    "skill": "Linear models in context",
    "difficulty": "E",
    "html": False,
    "stem": "A graphic design studio charges an initial client onboarding fee of $75 plus $45 per hour of design production. If a client was billed a total of $345, for how many hours of design work was the client charged?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "4"},
        {"id": "B", "text": "5"},
        {"id": "C", "text": "6"},
        {"id": "D", "text": "8"}
    ],
    "correct": "C",
    "rationale": "Set up $75 + 45h = 345 \\implies 45h = 270 \\implies h = 6$ hours.",
    "keySource": "paper",
    "expectedPace": 65
}

# pt5-math-m1-q04
m1_5[3] = {
    "id": "pt5-math-m1-q04",
    "domain": "Algebra",
    "skill": "Linear systems in context",
    "difficulty": "M",
    "html": False,
    "stem": "A community recreation pool charges $8 per child and $14 per adult for day admission. On a Saturday afternoon, 120 visitors purchased admission, generating $1,320 in ticket revenue. How many children entered the pool?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "45"},
        {"id": "B", "text": "50"},
        {"id": "C", "text": "60"},
        {"id": "D", "text": "75"}
    ],
    "correct": "C",
    "rationale": "Let $c$ be children and $a$ be adults: $c + a = 120$ and $8c + 14a = 1320$. Substitute $a = 120 - c$: $8c + 14(120 - c) = 1320 \\implies 8c + 1680 - 14c = 1320 \\implies -6c = -360 \\implies c = 60$.",
    "keySource": "paper",
    "expectedPace": 75
}

# pt5-math-m1-q05
m1_5[4] = {
    "id": "pt5-math-m1-q05",
    "domain": "Algebra",
    "skill": "Linear equation structure",
    "difficulty": "E",
    "html": False,
    "stem": "If $3(2x - 7) + 8 = 29$, what is the value of $2x - 7$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "5"},
        {"id": "B", "text": "7"},
        {"id": "C", "text": "9"},
        {"id": "D", "text": "11"}
    ],
    "correct": "B",
    "rationale": "Subtract 8 from both sides: $3(2x - 7) = 21$. Divide by 3: $2x - 7 = 7$.",
    "keySource": "paper",
    "expectedPace": 60
}

# pt5-math-m1-q08
m1_5[7] = {
    "id": "pt5-math-m1-q08",
    "domain": "Advanced Math",
    "skill": "Quadratic vertex coordinates",
    "difficulty": "M",
    "html": False,
    "stem": "For the quadratic function $g$, $g(x) = x^2 - 8x + c$. If the vertex of the graph of $g$ in the $xy$-plane has coordinates $(4, -7)$, what is the value of $c$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-9"},
        {"id": "B", "text": "7"},
        {"id": "C", "text": "9"},
        {"id": "D", "text": "16"}
    ],
    "correct": "C",
    "rationale": "Substitute the vertex coordinates $(4, -7)$ into $g(x)$: $-7 = (4)^2 - 8(4) + c \\implies -7 = 16 - 32 + c \\implies -7 = -16 + c \\implies c = 9$.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt5-math-m1-q19
m1_5[18] = {
    "id": "pt5-math-m1-q19",
    "domain": "Algebra",
    "skill": "Linear functions (slope & intercept)",
    "difficulty": "M",
    "html": False,
    "stem": "The linear function $p$ satisfies $p(3) = 14$ and $p(7) = 30$. What is the value of $p(10)$?",
    "format": "spr",
    "accepted": ["42"],
    "rationale": "The slope is $m = (30 - 14)/(7 - 3) = 16/4 = 4$. Using $p(x) = 4x + b$: $14 = 4(3) + b \\implies b = 2$. Therefore $p(10) = 4(10) + 2 = 42$.",
    "keySource": "paper",
    "expectedPace": 70
}

# pt5-math-m2u-q01
m2u_5[0] = {
    "id": "pt5-math-m2u-q01",
    "domain": "Advanced Math",
    "skill": "Nonlinear system tangency",
    "difficulty": "H",
    "html": False,
    "stem": "In the $xy$-plane, the line $y = 3x + c$ intersects the parabola $y = 2x^2 - 5x + 11$ at exactly one point. What is the value of the constant $c$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-3"},
        {"id": "B", "text": "1"},
        {"id": "C", "text": "3"},
        {"id": "D", "text": "5"}
    ],
    "correct": "C",
    "rationale": "Set equations equal: $2x^2 - 5x + 11 = 3x + c \\implies 2x^2 - 8x + (11 - c) = 0$. For exactly one intersection, the discriminant must be zero: $D = (-8)^2 - 4(2)(11 - c) = 0 \\implies 64 - 88 + 8c = 0 \\implies -24 + 8c = 0 \\implies c = 3$.",
    "keySource": "paper",
    "expectedPace": 85
}

# pt5-math-m2u-q05
m2u_5[4] = {
    "id": "pt5-math-m2u-q05",
    "domain": "Advanced Math",
    "skill": "Quadratic symmetry & evaluation",
    "difficulty": "H",
    "html": False,
    "stem": "The function $f$ is defined by $f(x) = a(x - 4)^2 + 12$, where $a$ is a constant. If $f(1) = -15$, what is the value of $f(7)$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "-27"},
        {"id": "B", "text": "-15"},
        {"id": "C", "text": "12"},
        {"id": "D", "text": "15"}
    ],
    "correct": "B",
    "rationale": "The parabola has axis of symmetry at $x = 4$. Notice that $x = 1$ and $x = 7$ are equidistant from $x = 4$ ($|1 - 4| = |7 - 4| = 3$). By the symmetry of quadratic functions, $f(7) = f(1) = -15$.",
    "keySource": "paper",
    "expectedPace": 75
}

# RW Test 5 M2L upgrades
academic_rw_fixes_t5 = [
    (16, "In materials science, metamaterials possess engineered properties that do not occur in nature _______ their microstructures can bend electromagnetic waves around objects, rendering them undetectable to specific radar wavelengths.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "for example,"}, {"id": "B", "text": "for example:"}, {"id": "C", "text": "for example;"}, {"id": "D", "text": "for example"}] ,
     "B", "Choice B is correct. A colon introduces an independent clause that gives a specific, illustrative example of the preceding general claim."),
    (18, "Urban planners studying traffic congestion in Singapore observed that dynamic toll pricing curtailed peak-hour congestion by 16 _______ commuters shifted travel times or opted for mass transit alternatives.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "percent, because"}, {"id": "B", "text": "percent; because"}, {"id": "C", "text": "percent:"}, {"id": "D", "text": "percent,"}],
     "A", "Choice A is correct. A comma followed by the subordinating conjunction 'because' properly links the independent clause to the dependent causal clause."),
    (19, "A team of behavioral economists at Stanford University, examining retirement savings behavior across several corporate _______ that automatic enrollment nudges increased employee participation rates from 59 percent to over 85 percent.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "plans, discovered"}, {"id": "B", "text": "plans; discovered"}, {"id": "C", "text": "plans discovered,"}, {"id": "D", "text": "plans, discovering"}],
     "A", "Choice A is correct. A comma is required to close the nonessential participial phrase 'examining retirement savings behavior across several corporate plans' before the main verb 'discovered'."),
    (20, "Long-term monitoring of coral bleaching events on the Great Barrier Reef indicates that thermal stress during marine heatwaves _______ the symbiotic relationship between corals and their photosynthetic zooxanthellae.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "disrupts"}, {"id": "B", "text": "disrupting"}, {"id": "C", "text": "to disrupt"}, {"id": "D", "text": "have disrupted"}],
     "A", "Choice A is correct. The singular subject 'thermal stress' requires the singular present verb 'disrupts' in the noun clause."),
    (21, "Having conducted rigorous isotopic analysis of fossilized tooth enamel from Neanderthal and anatomically modern human specimens in the Levant, _______ that both species occupied overlapping ecological niches during the late Pleistocene epoch.",
     "Which choice completes the text so that it conforms to the conventions of Standard English?",
     [{"id": "A", "text": "paleoanthropologists concluded"}, {"id": "B", "text": "the conclusion of paleoanthropologists was"}, {"id": "C", "text": "it was concluded by paleoanthropologists"}, {"id": "D", "text": "evidence analyzed by paleoanthropologists showed"}],
     "A", "Choice A is correct. The introductory modifier 'Having conducted rigorous isotopic analysis...' must modify 'paleoanthropologists', the researchers who performed the isotopic analysis.")
]

for idx, stim, stem, chs, corr, rat in academic_rw_fixes_t5:
    rw_m2l_5[idx] = {
        "id": rw_m2l_5[idx]["id"],
        "domain": "Standard English Conventions",
        "skill": "Boundaries and Syntax",
        "difficulty": "M",
        "html": False,
        "stimulus": stim,
        "stem": stem,
        "format": "mc",
        "choices": chs,
        "correct": corr,
        "rationale": rat,
        "keySource": "paper",
        "expectedPace": 45
    }

save_test(path5, pt5)
print("Test 5 fully recalibrated.")

print("All 5 practice tests successfully upgraded to authentic SAT difficulty standards!")
