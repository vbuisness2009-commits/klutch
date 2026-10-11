import json
import glob
import os

# ==============================================================================
# UPGRADES FOR AP CALCULUS AB & BC
# ==============================================================================
CALC_UPGRADES = {
    # Calc AB/BC Unit 1
    "u1-q01": {
        "tier": "Intro",
        "topic": "1.6 Determining Limits Using Algebraic Manipulation",
        "stimulus": None,
        "stem": "For what value of the constant k is the function f continuous at x = 3, where f(x) = (x² + kx − 15)/(x − 3) for x ≠ 3 and f(3) = 8?",
        "choices": [
            {"id": "A", "text": "2"},
            {"id": "B", "text": "−2"},
            {"id": "C", "text": "5"},
            {"id": "D", "text": "No such value of k exists."}
        ],
        "answer": "A",
        "explanation": "For f to be continuous at x = 3, lim x→3 f(x) must equal f(3) = 8. Since the denominator approaches 0, the numerator must also approach 0: 3² + 3k − 15 = 0 ⇒ 3k = 6 ⇒ k = 2. With k = 2, f(x) = (x² + 2x − 15)/(x − 3) = ((x − 3)(x + 5))/(x − 3) = x + 5 for x ≠ 3. Then lim x→3 (x + 5) = 8 = f(3), confirming continuity.",
        "distractors": {
            "B": "Solves 3k = −6 instead of 3k = 6.",
            "C": "Confuses the root x = −5 with the coefficient k.",
            "D": "Fails to recognize that the 0/0 indeterminate form can be resolved by factoring."
        }
    },
    "u1-q03": {
        "tier": "Intro",
        "topic": "1.15 Connecting Limits at Infinity and Horizontal Asymptotes",
        "stimulus": None,
        "stem": "What is lim x→−∞ (√(9x² − 2x) + 4)/(2x − 5)?",
        "choices": [
            {"id": "A", "text": "−3/2"},
            {"id": "B", "text": "3/2"},
            {"id": "C", "text": "9/2"},
            {"id": "D", "text": "The limit does not exist."}
        ],
        "answer": "A",
        "explanation": "As x → −∞, x is negative, so √(x²) = |x| = −x. Factoring x² from the square root gives √(9x² − 2x) = √[x²(9 − 2/x)] = |x|√(9 − 2/x) = −x√(9 − 2/x). Dividing numerator and denominator by x gives [−√(9 − 2/x) + 4/x] / [2 − 5/x]. Taking the limit as x → −∞ yields (−√9 + 0)/(2 − 0) = −3/2.",
        "distractors": {
            "B": "Forgets that √(x²) = −x when x < 0, resulting in an erroneous positive sign.",
            "C": "Squares the ratio 3/2 or forgets the square root of 9.",
            "D": "Mistakenly assumes the square root cannot be evaluated as x → −∞."
        }
    },
    "u1-q05": {
        "tier": "Exam level",
        "topic": "1.9 Connecting Multiple Representations of Limits",
        "stimulus": None,
        "stem": "What is lim x→0 (1 − cos(4x))/(x·sin(2x))?",
        "choices": [
            {"id": "A", "text": "4"},
            {"id": "B", "text": "2"},
            {"id": "C", "text": "8"},
            {"id": "D", "text": "0"}
        ],
        "answer": "A",
        "explanation": "Direct substitution gives 0/0. Using standard trigonometric limits, multiply and divide by 16x²: (1 − cos(4x))/(16x²) · 16x² / (x·sin(2x)) = [(1 − cos(4x))/(4x)²] · [16x / (2x · sin(2x)/(2x))] · (1/1) = (1/2) · (16/2) / 1 = (1/2) · 8 = 4.",
        "distractors": {
            "B": "Forgets the factor of 16 in (4x)² or takes (4/2) = 2 without accounting for the 1/2 factor in 1 - cos(u).",
            "C": "Neglects the 1/2 factor in lim (1 - cos u)/u² = 1/2.",
            "D": "Assumes the numerator 1 - cos(0) = 0 forces the whole limit to be 0 without evaluating the indeterminate form."
        }
    },

    # Calc AB/BC Unit 2
    "u2-q01": {
        "tier": "Intro",
        "topic": "2.2 Defining the Derivative",
        "stimulus": None,
        "stem": "lim x→4 (x·√x − 8)/(x − 4) represents the derivative of a function f at a number a. What are f and a?",
        "choices": [
            {"id": "A", "text": "f(x) = x^(3/2) and a = 4"},
            {"id": "B", "text": "f(x) = x·√x and a = 8"},
            {"id": "C", "text": "f(x) = √x and a = 4"},
            {"id": "D", "text": "f(x) = x² − 8 and a = 4"}
        ],
        "answer": "A",
        "explanation": "The alternative definition of derivative is f′(a) = lim x→a [f(x) − f(a)] / (x − a). Here the denominator is x − 4, indicating a = 4. The numerator is f(x) − f(4), where f(x) = x·√x = x^(3/2) and f(4) = 4·√4 = 8. Thus f(x) = x^(3/2) and a = 4.",
        "distractors": {
            "B": "Confuses the output value f(4) = 8 with the input value a.",
            "C": "Ignores the factor of x multiplying √x.",
            "D": "Manufactures a quadratic from the numerator numbers."
        }
    },
    "u2-q03": {
        "tier": "Intro",
        "topic": "2.4 Connecting Differentiability and Continuity",
        "stimulus": None,
        "stem": "Let f(x) = ax² + 1 for x ≤ 1 and f(x) = bx − 2 for x > 1. For which values of constants a and b is f differentiable at x = 1?",
        "choices": [
            {"id": "A", "text": "a = 3 and b = 6"},
            {"id": "B", "text": "a = −3 and b = −6"},
            {"id": "C", "text": "a = 2 and b = 5"},
            {"id": "D", "text": "a = −1 and b = −2"}
        ],
        "answer": "A",
        "explanation": "For f to be differentiable at x = 1, it must be both continuous and have equal one-sided derivatives at x = 1. Continuity: a(1)² + 1 = b(1) − 2 ⇒ a + 1 = b − 2 ⇒ b = a + 3. Differentiability: left derivative is 2ax evaluated at 1 = 2a; right derivative is b. So b = 2a. Setting 2a = a + 3 yields a = 3, which implies b = 6.",
        "distractors": {
            "B": "Inverts the signs of the coefficients.",
            "C": "Satisfies continuity (2+1 = 5-2 = 3) but fails differentiability (2a = 4 ≠ 5).",
            "D": "Fails both conditions."
        }
    },
    "u2-q04": {
        "tier": "Intro",
        "topic": "2.9 The Quotient Rule",
        "stimulus": None,
        "stem": "What is the slope of the line tangent to the graph of y = (2x + 1)/(x² + 3) at the point where x = 1?",
        "choices": [
            {"id": "A", "text": "1/8"},
            {"id": "B", "text": "−1/8"},
            {"id": "C", "text": "1/2"},
            {"id": "D", "text": "5/16"}
        ],
        "answer": "A",
        "explanation": "Apply the quotient rule: y′ = [(x² + 3)(2) − (2x + 1)(2x)] / (x² + 3)². At x = 1: numerator is (4)(2) − (3)(2) = 8 − 6 = 2. Denominator is (4)² = 16. Thus y′(1) = 2/16 = 1/8.",
        "distractors": {
            "B": "Subtracts the terms in the numerator in reverse order: 6 - 8 = -2.",
            "C": "Differentiates numerator and denominator separately: 2/(2x) = 1.",
            "D": "Miscalculates the numerator as 8 - 3 = 5."
        }
    },

    # Calc AB/BC Unit 4
    "u4-q01": {
        "tier": "Intro",
        "topic": "4.2 Straight-Line Motion: Connecting Position, Velocity, and Acceleration",
        "stimulus": None,
        "stem": "A particle moves along the x-axis with position s(t) = 2t³ − 9t² + 12t for t ≥ 0. At what time(s) t is the particle at rest?",
        "choices": [
            {"id": "A", "text": "t = 1 and t = 2 only"},
            {"id": "B", "text": "t = 1.5 only"},
            {"id": "C", "text": "t = 0, t = 1, and t = 2"},
            {"id": "D", "text": "t = 3 only"}
        ],
        "answer": "A",
        "explanation": "A particle is at rest when its velocity is zero. The velocity is v(t) = s′(t) = 6t² − 18t + 12. Set v(t) = 0: 6(t² − 3t + 2) = 0 ⇒ 6(t − 1)(t − 2) = 0 ⇒ t = 1 and t = 2.",
        "distractors": {
            "B": "Solves for the zero of acceleration (12t - 18 = 0 ⇒ t = 1.5) instead of velocity.",
            "C": "Includes t = 0 where position is 0, confusing position with velocity.",
            "D": "Factors incorrectly."
        }
    },
    "u4-q04": {
        "tier": "Intro",
        "topic": "4.2 Straight-Line Motion: Speed",
        "stimulus": None,
        "stem": "A particle moves along a line with velocity v(t) = t² − 5t + 4 and acceleration a(t) = 2t − 5 for t ≥ 0. For which interval of t is the speed of the particle increasing?",
        "choices": [
            {"id": "A", "text": "(1, 2.5) and (4, ∞)"},
            {"id": "B", "text": "(0, 1) and (4, ∞)"},
            {"id": "C", "text": "(2.5, ∞)"},
            {"id": "D", "text": "(1, 4)"}
        ],
        "answer": "A",
        "explanation": "Speed is increasing when velocity and acceleration have the SAME sign. v(t) = (t − 1)(t − 4): positive on (0, 1) and (4, ∞); negative on (1, 4). a(t) = 2t − 5: negative on (0, 2.5); positive on (2.5, ∞). Both negative on (1, 2.5); both positive on (4, ∞). Thus speed increases on (1, 2.5) and (4, ∞).",
        "distractors": {
            "B": "Identifies where velocity is positive, confusing velocity increasing with speed increasing.",
            "C": "Identifies where acceleration is positive only.",
            "D": "Identifies where velocity is negative only."
        }
    },

    # Calc AB/BC Unit 5
    "u5-q08": {
        "tier": "Exam level",
        "topic": "5.11 Solving Optimization Problems",
        "stimulus": None,
        "stem": "What is the maximum area of a rectangle with its base on the x-axis and its upper two vertices on the parabola y = 12 − x²?",
        "choices": [
            {"id": "A", "text": "32"},
            {"id": "B", "text": "16"},
            {"id": "C", "text": "48"},
            {"id": "D", "text": "24"}
        ],
        "answer": "A",
        "explanation": "By symmetry, the upper vertices are (−x, 12 − x²) and (x, 12 − x²) for x > 0. The base has length 2x and height y = 12 − x². The area is A(x) = 2x(12 − x²) = 24x − 2x³ for 0 < x < √12. Setting A′(x) = 0 gives 24 − 6x² = 0 ⇒ x² = 4 ⇒ x = 2. Since A″(x) = −12x < 0, this gives the absolute maximum area: A(2) = 2(2)(12 − 4) = 4(8) = 32.",
        "distractors": {
            "B": "Uses width x instead of 2x: x(12 - x²) = 2(8) = 16.",
            "C": "Multiplies 2x by 12 without subtracting the x² term.",
            "D": "Arithmetic error multiplying dimensions."
        }
    },

    # Calc AB/BC Unit 6
    "u6-q01": {
        "tier": "Intro",
        "topic": "6.4 The Fundamental Theorem of Calculus and Accumulation Functions",
        "stimulus": None,
        "stem": "Let g(x) = ∫₂^(x³) √(t² + 5) dt. What is g′(1)?",
        "choices": [
            {"id": "A", "text": "3√6"},
            {"id": "B", "text": "√6"},
            {"id": "C", "text": "6"},
            {"id": "D", "text": "3√14"}
        ],
        "answer": "A",
        "explanation": "By FTC Part 1 and the Chain Rule: g′(x) = √((x³)² + 5) · d/dx(x³) = √(x⁶ + 5) · (3x²). Evaluating at x = 1 gives g′(1) = √(1 + 5) · 3(1)² = 3√6.",
        "distractors": {
            "B": "Forgets the chain rule derivative 3x².",
            "C": "Evaluates 3 * 2 = 6, mistaking √6 for a rational value.",
            "D": "Substitutes incorrectly."
        }
    },
    "u6-q02": {
        "tier": "Intro",
        "topic": "6.7 Fundamental Theorem of Calculus and Definite Integrals",
        "stimulus": None,
        "stem": "If f is a continuous function such that ∫₁⁴ f(x) dx = 7 and ∫₁² f(x) dx = 3, what is ∫₁² [2f(2x) − 1] dx?",
        "choices": [
            {"id": "A", "text": "3"},
            {"id": "B", "text": "2"},
            {"id": "C", "text": "4"},
            {"id": "D", "text": "6"}
        ],
        "answer": "A",
        "explanation": "Split the integral: ∫₁² 2f(2x) dx − ∫₁² 1 dx. By u-substitution (u = 2x, du = 2 dx), ∫₁² 2f(2x) dx = ∫₂⁴ f(u) du. Since ∫₁⁴ f(x) dx = ∫₁² f(x) dx + ∫₂⁴ f(x) dx, we have 7 = 3 + ∫₂⁴ f(x) dx ⇒ ∫₂⁴ f(x) dx = 4. Then 4 − ∫₁² 1 dx = 4 − (2 − 1) = 4 − 1 = 3.",
        "distractors": {
            "B": "Subtracts 2 instead of 1.",
            "C": "Omits the second integral ∫₁² 1 dx.",
            "D": "Doubles the integral to 8 before subtracting 2."
        }
    },

    # Calc AB/BC Unit 7
    "u7-q01": {
        "tier": "Intro",
        "topic": "7.7 Solving Separable Differential Equations",
        "stimulus": None,
        "stem": "What is the particular solution to the differential equation dy/dx = 2xy with the initial condition y(0) = 3?",
        "choices": [
            {"id": "A", "text": "y = 3e^(x²)"},
            {"id": "B", "text": "y = 3e^(2x)"},
            {"id": "C", "text": "y = x² + 3"},
            {"id": "D", "text": "y = e^(x²) + 2"}
        ],
        "answer": "A",
        "explanation": "Separating variables: (1/y) dy = 2x dx. Integrating gives ln|y| = x² + C ⇒ y = Ae^(x²). Since y(0) = 3, A = 3. Thus y = 3e^(x²).",
        "distractors": {
            "B": "Integrates 2x as 2 instead of x².",
            "C": "Integrates without separating variables.",
            "D": "Applies the initial condition additively instead of multiplicatively."
        }
    },
    "u7-q04": {
        "tier": "Intro",
        "topic": "7.4 Reasoning Using Slope Fields",
        "stimulus": None,
        "stem": "Which of the following differential equations produces a slope field where slopes are negative for all points in Quadrant II and positive for all points in Quadrant IV?",
        "choices": [
            {"id": "A", "text": "dy/dx = x·y²"},
            {"id": "B", "text": "dy/dx = x/y"},
            {"id": "C", "text": "dy/dx = x²y"},
            {"id": "D", "text": "dy/dx = xy"}
        ],
        "answer": "A",
        "explanation": "In Quadrant II, x < 0 and y > 0. For dy/dx = x·y², (negative)·(positive) = negative. In Quadrant IV, x > 0 and y < 0. For dy/dx = x·y², (positive)·(positive) = positive. Therefore dy/dx = x·y² satisfies both conditions.",
        "distractors": {
            "B": "In Quadrant IV, x/y is negative because positive/negative is negative.",
            "C": "In Quadrant IV, x²y is negative because positive * negative is negative.",
            "D": "In Quadrant IV, xy is negative."
        }
    },

    # Calc AB/BC Unit 8
    "u8-q03": {
        "tier": "Intro",
        "topic": "8.3 Using Accumulation Functions and Definite Integrals in Applied Contexts",
        "stimulus": None,
        "stem": "A particle moves along a straight line with velocity v(t) = 3√t − t for t ≥ 0. If the particle's position is x = 4 when t = 1, what is the particle's position when t = 4?",
        "choices": [
            {"id": "A", "text": "21/2"},
            {"id": "B", "text": "13/2"},
            {"id": "C", "text": "17/2"},
            {"id": "D", "text": "19/2"}
        ],
        "answer": "A",
        "explanation": "By FTC: x(4) = x(1) + ∫₁⁴ (3√t − t) dt. Antiderivative is 2t^(3/2) − t²/2. At t = 4: 2(8) − 8 = 8. At t = 1: 2(1) − 1/2 = 3/2. The displacement is 8 − 3/2 = 13/2. Adding initial position: x(4) = 4 + 13/2 = 21/2.",
        "distractors": {
            "B": "Finds displacement ∫₁⁴ v(t) dt = 13/2 but forgets to add initial position x(1) = 4.",
            "C": "Adds 4 to 8 without subtracting the lower limit at t = 1.",
            "D": "Arithmetic error."
        }
    },
    "u8-q12": {
        "tier": "Hardest",
        "topic": "8.8 Volumes with Cross Sections: Non-Axis Solids",
        "stimulus": None,
        "stem": "The base of a solid is the region bounded by y = ln(x), the x-axis, and the vertical line x = e. Every cross section perpendicular to the y-axis is an equilateral triangle. Which expression gives the volume of the solid?",
        "choices": [
            {"id": "A", "text": "(√3/4) ∫₀¹ (e − eʸ)² dy"},
            {"id": "B", "text": "(√3/4)(e² − 1)/2"},
            {"id": "C", "text": "(√3/4) ∫₁ᵉ (ln x)² dx"},
            {"id": "D", "text": "(√3/2) ∫₀¹ (e − eʸ) dy"}
        ],
        "answer": "A",
        "explanation": "Cross sections are perpendicular to the y-axis, so integrate with respect to y from y = 0 to y = ln(e) = 1. For any y, the side length of the equilateral triangle is the horizontal distance s(y) = e − eʸ. The cross-sectional area is A(y) = (√3/4)s² = (√3/4)(e − eʸ)². Therefore, the volume is (√3/4) ∫₀¹ (e − eʸ)² dy.",
        "distractors": {
            "B": "Confuses the integral with a standard polynomial area.",
            "C": "Integrates with respect to x instead of y.",
            "D": "Uses the height formula (√3/2)s instead of the area formula (√3/4)s²."
        }
    }
}

print("CALC_UPGRADES defined.")

# ==============================================================================
# UPGRADES FOR AP PHYSICS 1
# ==============================================================================
PHYSICS_UPGRADES = {
    "u3-q02": {
        "tier": "Intro",
        "topic": "3.3 Work and the Work-Energy Theorem",
        "stimulus": None,
        "stem": "A block of mass m is released from rest at the top of a frictionless curved track of height h. At the bottom of the track, the block slides onto a rough horizontal surface with coefficient of kinetic friction μₖ. How far does the block slide along the rough surface before coming to rest?",
        "choices": [
            {"id": "A", "text": "h / μₖ"},
            {"id": "B", "text": "μₖ·h"},
            {"id": "C", "text": "h / (2μₖ)"},
            {"id": "D", "text": "√(2gh) / μₖ"}
        ],
        "answer": "A",
        "explanation": "By conservation of mechanical energy, the kinetic energy at the bottom of the ramp equals the initial gravitational potential energy: KE = mgh. On the rough surface, the friction force is fₖ = μₖ·N = μₖmg. The work done by friction over distance d must remove all kinetic energy: W_friction = −fₖ·d = −μₖmg·d. Setting |W_friction| = KE gives μₖmg·d = mgh ⇒ d = h / μₖ.",
        "distractors": {
            "B": "Multiplies by μₖ instead of dividing, which has incorrect units.",
            "C": "Includes an erroneous factor of 1/2 from kinetic energy.",
            "D": "Confuses speed with distance."
        }
    },
    "u4-q01": {
        "tier": "Intro",
        "topic": "4.3 Conservation of Linear Momentum",
        "stimulus": None,
        "stem": "A block of mass m moving with speed v₀ on a frictionless horizontal surface collides with and sticks to a block of mass 3m initially at rest. What fraction of the initial kinetic energy of the system is dissipated during the collision?",
        "choices": [
            {"id": "A", "text": "3/4"},
            {"id": "B", "text": "1/4"},
            {"id": "C", "text": "1/2"},
            {"id": "D", "text": "2/3"}
        ],
        "answer": "A",
        "explanation": "By conservation of linear momentum: m·v₀ = (m + 3m)·v_f ⇒ 4m·v_f = mv₀ ⇒ v_f = v₀ / 4. Initial kinetic energy is K_i = ½ m v₀². Final kinetic energy is K_f = ½ (4m) v_f² = 2m (v₀/4)² = 2m (v₀²/16) = ⅛ m v₀² = ¼ K_i. The fraction of initial kinetic energy dissipated as thermal energy and deformation is (K_i − K_f) / K_i = (K_i − ¼ K_i) / K_i = 3/4.",
        "distractors": {
            "B": "Finds the fraction of kinetic energy remaining (1/4) rather than the fraction dissipated.",
            "C": "Assumes an arbitrary 50% energy loss.",
            "D": "Inverts mass ratio."
        }
    },
    "u6-q02": {
        "tier": "Intro",
        "topic": "6.5 Conservation of Angular Momentum",
        "stimulus": None,
        "stem": "A uniform horizontal disk of mass M and radius R rotates freely about a vertical axle through its center with angular speed ω₀. An identical disk initially at rest is dropped onto the first disk. Due to friction between the surfaces, the two disks eventually rotate together at angular speed ω_f. What is ω_f, and what fraction of the initial rotational kinetic energy is lost to heat?",
        "choices": [
            {"id": "A", "text": "ω_f = ω₀ / 2; half of the rotational kinetic energy is lost"},
            {"id": "B", "text": "ω_f = ω₀ / 2; no rotational kinetic energy is lost"},
            {"id": "C", "text": "ω_f = ω₀ / 4; three-fourths of the rotational kinetic energy is lost"},
            {"id": "D", "text": "ω_f = ω₀ / √2; half of the rotational kinetic energy is lost"}
        ],
        "answer": "A",
        "explanation": "Since no external torque acts on the system about the axle, angular momentum is conserved: L_i = I·ω₀. When the second identical disk is added, the total rotational inertia becomes 2I. Conservation of angular momentum gives I·ω₀ = 2I·ω_f ⇒ ω_f = ω₀ / 2. Initial rotational kinetic energy is K_i = ½ I ω₀². Final rotational kinetic energy is K_f = ½ (2I) (ω₀/2)² = I (ω₀²/4) = ¼ I ω₀² = ½ K_i. Exactly half (50%) of the initial rotational kinetic energy is dissipated as thermal energy.",
        "distractors": {
            "B": "Incorrectly assumes mechanical energy is conserved in an inelastic rotational collision.",
            "C": "Assumes the final angular velocity drops by a factor of 4.",
            "D": "Conserves kinetic energy instead of angular momentum to find angular velocity."
        }
    },
    "u6-q04": {
        "tier": "Intro",
        "topic": "6.3 Rotational Kinetic Energy and Rolling",
        "stimulus": None,
        "stem": "A solid sphere (I = ⅖MR²), a solid cylinder (I = ½MR²), and a hollow spherical shell (I = ⅔MR²), all with identical mass M and outer radius R, are released from rest at the top of a ramp inclined at angle θ. All three roll down the ramp without slipping. In what order do they reach the bottom of the ramp?",
        "choices": [
            {"id": "A", "text": "Solid sphere first, then solid cylinder, then hollow sphere"},
            {"id": "B", "text": "All three reach the bottom at the same time because mass and radius are equal"},
            {"id": "C", "text": "Hollow sphere first, then solid cylinder, then solid sphere"},
            {"id": "D", "text": "Solid cylinder first, then solid sphere, then hollow sphere"}
        ],
        "answer": "A",
        "explanation": "For an object rolling without slipping down an incline, the linear acceleration is a = (g·sin θ) / (1 + I/(MR²)). The smaller the ratio I/(MR²), the smaller the fraction of gravitational potential energy converted into rotational kinetic energy, and the greater the translational linear acceleration. Here, I/(MR²) values are: solid sphere = 0.40, solid cylinder = 0.50, hollow sphere = 0.67. Therefore, the solid sphere has the greatest acceleration and finishes first, followed by the solid cylinder, and lastly the hollow sphere.",
        "distractors": {
            "B": "Neglects rotational inertia, applying the Galileo rule for sliding objects without friction.",
            "C": "Reverses the order, believing objects with larger rotational inertia accelerate faster.",
            "D": "Misorders the cylinder and solid sphere."
        }
    },
    "u8-q02": {
        "tier": "Intro",
        "topic": "8.2 Fluids: Pressure and Buoyancy",
        "stimulus": None,
        "stem": "A solid rectangular block of wood with uniform cross-sectional area A, height H, and density ρ_b floats vertically in water of density ρ_w (where ρ_b < ρ_w). If the block is pushed down slightly by a distance y into the water and released, what is the net restoring force on the block?",
        "choices": [
            {"id": "A", "text": "−ρ_w·A·g·y"},
            {"id": "B", "text": "−ρ_b·A·g·y"},
            {"id": "C", "text": "−(ρ_w − ρ_b)·A·g·y"},
            {"id": "D", "text": "−ρ_w·A·H·g"}
        ],
        "answer": "A",
        "explanation": "At equilibrium, the buoyant force equals the weight of the block: F_b,eq = mg = ρ_b·A·H·g. When displaced downward by distance y, the additional volume of displaced fluid is ΔV = A·y. The additional upward buoyant force created is ΔF_b = ρ_w·ΔV·g = ρ_w·A·y·g. Because this force opposes the displacement y, the net restoring force is F_net = −ρ_w·A·g·y. This linear restoring force is what produces simple harmonic vertical oscillations.",
        "distractors": {
            "B": "Uses the density of the block rather than the density of the displaced fluid.",
            "C": "Subtracts the block's density, forgetting that the block's gravitational weight is already balanced by the equilibrium buoyant force.",
            "D": "Calculates the total buoyant force on the fully submerged block rather than the restoring force."
        }
    }
}

# ==============================================================================
# UPGRADES FOR AP CHEMISTRY
# ==============================================================================
CHEM_UPGRADES = {
    "u1-q01": {
        "tier": "Intro",
        "topic": "1.1 Moles and Molar Mass in Context",
        "stimulus": None,
        "stem": "A sample of a pure hydrocarbon containing only carbon and hydrogen is completely burned in excess oxygen, producing 8.80 g of CO₂ (molar mass 44.0 g/mol) and 5.40 g of H₂O (molar mass 18.0 g/mol). What is the empirical formula of the hydrocarbon?",
        "choices": [
            {"id": "A", "text": "CH₃"},
            {"id": "B", "text": "CH₄"},
            {"id": "C", "text": "C₂H₅"},
            {"id": "D", "text": "C₃H₈"}
        ],
        "answer": "A",
        "explanation": "Moles of CO₂ = 8.80 g / 44.0 g/mol = 0.200 mol CO₂, which contains 0.200 mol C. Moles of H₂O = 5.40 g / 18.0 g/mol = 0.300 mol H₂O, which contains 2 × 0.300 = 0.600 mol H. The molar ratio of C to H is 0.200 : 0.600 = 1 : 3. Therefore, the empirical formula is CH₃ (e.g., ethane C₂H₆).",
        "distractors": {
            "B": "Forgets to multiply moles of H₂O by 2 to account for two hydrogen atoms per water molecule, obtaining a 1:1.5 ratio.",
            "C": "Miscalculates the ratio as 2 : 5.",
            "D": "Assumes complete combustion of propane C₃H₈."
        }
    },
    "u1-q03": {
        "tier": "Intro",
        "topic": "1.7 Periodic Trends: Ionization Energy",
        "stimulus": None,
        "stem": "The first ionization energy of phosphorus (P) is 1,012 kJ/mol, while the first ionization energy of sulfur (S) is 999.6 kJ/mol. Which statement best explains why sulfur has a lower first ionization energy than phosphorus despite having a greater nuclear charge?",
        "choices": [
            {"id": "A", "text": "The electron removed from sulfur is paired in a 3p orbital, and electron-electron repulsion makes it easier to remove."},
            {"id": "B", "text": "Sulfur has greater core-electron shielding than phosphorus."},
            {"id": "C", "text": "The valence electrons in sulfur occupy a higher principal energy level than those in phosphorus."},
            {"id": "D", "text": "Phosphorus has a stable, fully filled 3p subshell."}
        ],
        "answer": "A",
        "explanation": "Phosphorus has the valence electron configuration 3s²3p³, with three unpaired electrons in separate 3p orbitals (half-filled subshell, minimizing repulsion according to Hund's rule). Sulfur has configuration 3s²3p⁴, where one 3p orbital contains a pair of electrons. The electrostatic repulsion between the two paired electrons in that single 3p orbital increases their energy and makes it require slightly less energy to remove one, overcoming the increase in nuclear charge.",
        "distractors": {
            "B": "Both P and S have the same core electron configuration ([Ne]), so core shielding is identical.",
            "C": "Both elements have valence electrons in the n = 3 principal energy level.",
            "D": "A half-filled subshell (3p³) has three electrons, not a fully filled subshell (3p⁶)."
        }
    },
    "u2-q12": {
        "tier": "Hardest",
        "topic": "2.7 Molecular Geometry and Polarity",
        "stimulus": None,
        "stem": "Consider the molecules XeF₄ and SF₄. Which statement accurately compares their molecular geometries and net dipole moments?",
        "choices": [
            {"id": "A", "text": "XeF₄ is square planar and nonpolar; SF₄ is seesaw-shaped and polar."},
            {"id": "B", "text": "Both XeF₄ and SF₄ are tetrahedral and nonpolar."},
            {"id": "C", "text": "XeF₄ is square planar and polar; SF₄ is tetrahedral and nonpolar."},
            {"id": "D", "text": "XeF₄ is octahedral and nonpolar; SF₄ is seesaw-shaped and nonpolar."}
        ],
        "answer": "A",
        "explanation": "XeF₄ has 8 + 4(7) = 36 valence electrons: 4 bonding pairs and 2 lone pairs on Xe (octahedral electron geometry). The two lone pairs occupy opposite axial positions, giving a square planar molecular geometry where bond dipoles cancel, making XeF₄ nonpolar. SF₄ has 6 + 4(7) = 34 valence electrons: 4 bonding pairs and 1 lone pair on S (trigonal bipyramidal electron geometry). The lone pair occupies an equatorial position, creating an asymmetric seesaw geometry where the polar S–F bonds do not cancel, making SF₄ polar.",
        "distractors": {
            "B": "Neglects lone pairs on the central atoms, incorrectly predicting simple tetrahedral geometry.",
            "C": "Claims square planar geometry is polar, ignoring inversion center symmetry.",
            "D": "Confuses electron domain geometry with molecular geometry."
        }
    }
}

# ==============================================================================
# UPGRADES FOR AP BIOLOGY
# ==============================================================================
BIO_UPGRADES = {
    "u1-q01": {
        "tier": "Intro",
        "topic": "1.1 Structure of Water and Hydrogen Bonding",
        "stimulus": None,
        "stem": "Which of the following best explains how water's high specific heat capacity promotes biological homeostasis in temperate coastal ecosystems?",
        "choices": [
            {"id": "A", "text": "Extensive hydrogen bonding between water molecules absorbs large amounts of thermal energy with minimal temperature change, buffering organisms against extreme temperature fluctuations."},
            {"id": "B", "text": "Covalent bonds between hydrogen and oxygen break and reform rapidly, converting excess solar heat directly into chemical potential energy."},
            {"id": "C", "text": "Water expands upon freezing, forming an insulating surface layer of ice that prevents heat transfer from the underlying water."},
            {"id": "D", "text": "High surface tension reduces the rate of oceanic evaporation, maintaining high atmospheric humidity."}
        ],
        "answer": "A",
        "explanation": "Water's high specific heat capacity is caused by extensive hydrogen bonding among water molecules. Much of the absorbed thermal energy is used to disrupt hydrogen bonds rather than increase kinetic motion (temperature). As a result, coastal water bodies absorb and release immense heat without large temperature shifts, buffering marine and terrestrial organisms from physiological temperature stress.",
        "distractors": {
            "B": "Covalent O-H bonds within water molecules do not break during normal thermal absorption; only intermolecular hydrogen bonds are affected.",
            "C": "Describes ice density and insulation, which is related to freezing rather than specific heat capacity.",
            "D": "Describes surface tension (cohesion), not thermal buffering capacity."
        }
    },
    "u3-q01": {
        "tier": "Intro",
        "topic": "3.5 Photosynthesis and the Calvin Cycle",
        "stimulus": None,
        "stem": "In an experiment studying the Calvin cycle, Chlorella algae illuminated with constant light are suddenly transferred into complete darkness. Within seconds of the light-to-dark transition, which change in metabolite concentrations occurs in the chloroplast stroma?",
        "choices": [
            {"id": "A", "text": "3-PGA (3-phosphoglycerate) accumulates, while RuBP (ribulose-1,5-bisphosphate) rapidly depletes."},
            {"id": "B", "text": "RuBP accumulates, while 3-PGA rapidly depletes."},
            {"id": "C", "text": "Both RuBP and 3-PGA concentrations increase proportionally."},
            {"id": "D", "text": "G3P (glyceraldehyde-3-phosphate) accumulates due to accelerated reduction reactions."}
        ],
        "answer": "A",
        "explanation": "In the light, ATP and NADPH from the light-dependent reactions convert 3-PGA into G3P, which is then used to regenerate RuBP. In sudden darkness, ATP and NADPH production ceases immediately. However, RuBisCO continues fixing CO₂ onto existing RuBP in the stroma as long as RuBP remains, producing 3-PGA. Because 3-PGA cannot be reduced without ATP and NADPH, 3-PGA accumulates while RuBP is exhausted without being regenerated.",
        "distractors": {
            "B": "Reverses the reaction direction; RuBP regeneration requires ATP, which is absent in the dark.",
            "C": "Both cannot increase because the cycle requires energy input to complete.",
            "D": "G3P synthesis requires ATP and NADPH, so it halts in darkness."
        }
    },
    "u3-q02": {
        "tier": "Intro",
        "topic": "3.6 Cellular Respiration and the Electron Transport Chain",
        "stimulus": None,
        "stem": "The compound 2,4-dinitrophenol (DNP) acts as a mitochondrial uncoupler by shuttling protons across the inner mitochondrial membrane into the matrix. If isolated, actively respiring mitochondria are treated with DNP in the presence of pyruvate and ADP, what effect will DNP have on oxygen consumption and ATP synthesis?",
        "choices": [
            {"id": "A", "text": "Oxygen consumption continues or increases, while ATP synthesis drops dramatically."},
            {"id": "B", "text": "Both oxygen consumption and ATP synthesis cease immediately."},
            {"id": "C", "text": "ATP synthesis increases, while oxygen consumption decreases."},
            {"id": "D", "text": "The proton gradient increases, driving accelerated substrate-level phosphorylation."}
        ],
        "answer": "A",
        "explanation": "DNP dissipates the proton motive force by allowing protons to diffuse back across the inner mitochondrial membrane into the matrix without passing through ATP synthase. Because the proton gradient is dissipated, ATP synthase cannot synthesize ATP. However, the electron transport chain continues transferring electrons to oxygen (often at an accelerated rate because respiratory control by the proton gradient is lost). Thus oxygen consumption remains high while ATP synthesis halts.",
        "distractors": {
            "B": "Oxygen consumption does not cease because electron transport complexes are not directly inhibited by uncouplers.",
            "C": "ATP synthesis requires a proton gradient, so it cannot increase when the gradient is dissipated.",
            "D": "DNP decreases the proton gradient, and substrate-level phosphorylation occurs in glycolysis and the citric acid cycle, not at the inner membrane."
        }
    },
    "u4-q02": {
        "tier": "Intro",
        "topic": "4.6 Cell Cycle Regulation and Mitosis",
        "stimulus": None,
        "stem": "During mitosis, the spindle assembly checkpoint (M checkpoint) monitors whether all kinetochores are properly attached to spindle microtubules. If a chemical inhibitor prevents kinetochore attachment to the mitotic spindle, at which stage will dividing cells arrest?",
        "choices": [
            {"id": "A", "text": "Metaphase, preventing the transition to anaphase."},
            {"id": "B", "text": "Prophase, preventing chromatin condensation."},
            {"id": "C", "text": "Anaphase, preventing sister chromatid separation."},
            {"id": "D", "text": "Telophase, preventing nuclear envelope reformation."}
        ],
        "answer": "A",
        "explanation": "The spindle assembly checkpoint operates at the metaphase-to-anaphase transition. Unattached kinetochores emit an inhibitory signal that prevents activation of the anaphase-promoting complex/cyclosome (APC/C). Because APC/C cannot ubiquitinate securin, the enzyme separase remains inactive and cohesin cannot be cleaved. The cell arrests at metaphase.",
        "distractors": {
            "B": "Chromatin condenses normally during prophase before spindle attachment is verified.",
            "C": "The cell never enters anaphase; it arrests before anaphase begins.",
            "D": "Telophase occurs after chromosome separation has completed."
        }
    }
}

# ==============================================================================
# UPGRADES FOR AP COMPUTER SCIENCE A
# ==============================================================================
CSA_UPGRADES = {
    "u1-q02": {
        "tier": "Intro",
        "topic": "1.3 Expressions and Assignment Statements",
        "stimulus": None,
        "stem": "Consider the following code segment:\n\n```java\nint a = 7;\nint b = 2;\ndouble result = (double) (a / b) + (double) a / b;\nSystem.out.println(result);\n```\n\nWhat is printed as a result of executing the code segment?",
        "choices": [
            {"id": "A", "text": "6.5"},
            {"id": "B", "text": "7.0"},
            {"id": "C", "text": "6.0"},
            {"id": "D", "text": "7.5"}
        ],
        "answer": "A",
        "explanation": "In `(double) (a / b)`: parentheses force `a / b` first. Since both `a` and `b` are ints, `7 / 2` evaluates to integer `3`. Casting `3` to double gives `3.0`. In `(double) a / b`: the cast `(double) a` executes first, yielding `7.0`. Then `7.0 / 2` uses floating-point division, yielding `3.5`. Finally, `3.0 + 3.5 = 6.5`.",
        "distractors": {
            "B": "Assumes both operations perform floating-point division: 3.5 + 3.5 = 7.0.",
            "C": "Assumes both operations truncate to integers: 3.0 + 3.0 = 6.0.",
            "D": "Miscalculates the decimal addition."
        }
    },
    "u1-q03": {
        "tier": "Intro",
        "topic": "1.4 Compound Boolean Expressions and String Traversal",
        "stimulus": None,
        "stem": "Consider the following method:\n\n```java\npublic static String transform(String str) {\n    String res = \"\";\n    for (int i = 0; i < str.length(); i += 2) {\n        res += str.substring(i, i + 1);\n    }\n    return res;\n}\n```\n\nWhat is returned by the call `transform(\"COMPUTER\")`?",
        "choices": [
            {"id": "A", "text": "\"CMTE\""},
            {"id": "B", "text": "\"CPUR\""},
            {"id": "C", "text": "\"OMER\""},
            {"id": "D", "text": "\"COMP\""}
        ],
        "answer": "A",
        "explanation": "The loop starts at i = 0 and increments by 2 while i < 8. The indices accessed are: i = 0 → 'C', i = 2 → 'M', i = 4 → 'T', i = 6 → 'E'. Concatenating these characters produces \"CMTE\".",
        "distractors": {
            "B": "Includes indices 0, 1, 4, 7 arbitrarily.",
            "C": "Starts at index 1 instead of index 0 (odd indices: 'O', 'P', 'T', 'R'?).",
            "D": "Takes the first 4 characters of the string."
        }
    },
    "u1-q05": {
        "tier": "Exam level",
        "topic": "1.5 Generating Random Numbers",
        "stimulus": None,
        "stem": "Which of the following expressions evaluates to a random integer between 15 and 45, inclusive?",
        "choices": [
            {"id": "A", "text": "(int) (Math.random() * 31) + 15"},
            {"id": "B", "text": "(int) (Math.random() * 30) + 15"},
            {"id": "C", "text": "(int) (Math.random() * 45) + 15"},
            {"id": "D", "text": "(int) (Math.random() * 31) + 14"}
        ],
        "answer": "A",
        "explanation": "`Math.random()` returns a double in [0.0, 1.0). To produce integers in range [min, max], inclusive, the number of distinct integers is (max − min + 1) = 45 − 15 + 1 = 31. Multiplying by 31 gives values in [0.0, 31.0). Casting to int yields {0, 1, 2, ..., 30}. Adding 15 shifts the range to {15, 16, ..., 45}.",
        "distractors": {
            "B": "Only produces integers up to 44 because (int)(Math.random() * 30) produces {0, ..., 29}.",
            "C": "Produces integers from 15 to 59.",
            "D": "Produces integers from 14 to 44."
        }
    }
}

print("Physics, Chem, Bio, CS-A upgrades ready.")

def apply_upgrades_to_subject(slug, upgrades_dict):
    files = sorted(glob.glob(f'content/ap/{slug}/unit-*.json'))
    count = 0
    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as fp:
            d = json.load(fp)
        changed = False
        for q in d.get('practice', []):
            qid = q.get('id')
            if qid in upgrades_dict:
                up = upgrades_dict[qid]
                q['tier'] = up.get('tier', q.get('tier'))
                q['topic'] = up.get('topic', q.get('topic'))
                q['stimulus'] = up.get('stimulus')
                q['stem'] = up['stem']
                q['choices'] = up['choices']
                q['answer'] = up['answer']
                q['explanation'] = up['explanation']
                q['distractors'] = up.get('distractors', {})
                changed = True
                count += 1
        if changed:
            with open(fpath, 'w', encoding='utf-8') as fp:
                json.dump(d, fp, indent=2, ensure_ascii=False)
                fp.write('\n')
    print(f"[{slug}] Upgraded {count} questions.")

def main():
    apply_upgrades_to_subject('calc-ab', CALC_UPGRADES)
    apply_upgrades_to_subject('calc-bc', CALC_UPGRADES)
    apply_upgrades_to_subject('physics-1', PHYSICS_UPGRADES)
    apply_upgrades_to_subject('chemistry', CHEM_UPGRADES)
    apply_upgrades_to_subject('biology', BIO_UPGRADES)
    apply_upgrades_to_subject('cs-a', CSA_UPGRADES)

if __name__ == '__main__':
    main()
