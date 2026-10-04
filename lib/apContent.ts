/**
 * Fallback AP unit lists.
 *
 * `AP_UNITS` carries the unit breakdown for every subject, transcribed from the
 * College Board course descriptions. It is only used until a subject's
 * content/ap/<slug>/meta.json lands; from then on meta.units is authoritative
 * (see lib/apLoader.ts). Subjects listed in `NEEDS_CHECK` are ones whose CED
 * was recently revised or that don't use conventional units (portfolio
 * courses, the QUEST framework, language themes). Their fallback titles are a
 * best reading and are marked provisional until real content replaces them.
 *
 * This file stays dependency-free so scripts/check-ap-units.ts can import it
 * straight from Node. Anything that touches the filesystem lives in
 * lib/apLoader.ts.
 */

// The six themes shared by every AP world language course.
const LANGUAGE_THEMES = [
  "Families and Communities",
  "Personal and Public Identities",
  "Beauty and Aesthetics",
  "Science and Technology",
  "Contemporary Life",
  "Global Challenges",
];

// AP Seminar and AP Research are both built on the QUEST framework rather
// than content units.
const QUEST = [
  "Question and Explore",
  "Understand and Analyze",
  "Evaluate Multiple Perspectives",
  "Synthesize Ideas",
  "Team, Transform, and Transmit",
];

const CALC_AB = [
  "Limits and Continuity",
  "Differentiation: Definition and Fundamental Properties",
  "Differentiation: Composite, Implicit, and Inverse Functions",
  "Contextual Applications of Differentiation",
  "Analytical Applications of Differentiation",
  "Integration and Accumulation of Change",
  "Differential Equations",
  "Applications of Integration",
];

export const AP_UNITS: Record<string, string[]> = {
  // ---------- Math & CS ----------
  "calc-ab": CALC_AB,
  "calc-bc": [
    ...CALC_AB,
    "Parametric Equations, Polar Coordinates, and Vector-Valued Functions",
    "Infinite Sequences and Series",
  ],
  precalculus: [
    "Polynomial and Rational Functions",
    "Exponential and Logarithmic Functions",
    "Trigonometric and Polar Functions",
    "Functions Involving Parameters, Vectors, and Matrices",
  ],
  statistics: [
    "Exploring One-Variable Data",
    "Exploring Two-Variable Data",
    "Collecting Data",
    "Probability, Random Variables, and Probability Distributions",
    "Sampling Distributions",
    "Inference for Categorical Data: Proportions",
    "Inference for Quantitative Data: Means",
    "Inference for Categorical Data: Chi-Square",
    "Inference for Quantitative Data: Slopes",
  ],
  "cs-a": [
    "Primitive Types",
    "Using Objects",
    "Boolean Expressions and if Statements",
    "Iteration",
    "Writing Classes",
    "Array",
    "ArrayList",
    "2D Array",
    "Inheritance",
    "Recursion",
  ],
  "cs-principles": [
    "Creative Development",
    "Data",
    "Algorithms and Programming",
    "Computer Systems and Networks",
    "Impact of Computing",
  ],

  // ---------- Sciences ----------
  biology: [
    "Chemistry of Life",
    "Cell Structure and Function",
    "Cellular Energetics",
    "Cell Communication and Cell Cycle",
    "Heredity",
    "Gene Expression and Regulation",
    "Natural Selection",
    "Ecology",
  ],
  chemistry: [
    "Atomic Structure and Properties",
    "Compound Structure and Properties",
    "Properties of Substances and Mixtures",
    "Chemical Reactions",
    "Kinetics",
    "Thermodynamics",
    "Equilibrium",
    "Acids and Bases",
    "Applications of Thermodynamics",
  ],
  environmental: [
    "The Living World: Ecosystems",
    "The Living World: Biodiversity",
    "Populations",
    "Earth Systems and Resources",
    "Land and Water Use",
    "Energy Resources and Consumption",
    "Atmospheric Pollution",
    "Aquatic and Terrestrial Pollution",
    "Global Change",
  ],
  "physics-1": [
    "Kinematics",
    "Force and Translational Dynamics",
    "Work, Energy, and Power",
    "Linear Momentum",
    "Torque and Rotational Dynamics",
    "Energy and Momentum of Rotating Systems",
    "Oscillations",
    "Fluids",
  ],
  "physics-2": [
    "Thermodynamics",
    "Electric Force, Field, and Potential",
    "Electric Circuits",
    "Magnetism and Electromagnetic Induction",
    "Geometric Optics",
    "Waves, Sound, and Physical Optics",
    "Modern Physics",
  ],
  "physics-c-mech": [
    "Kinematics",
    "Force and Translational Dynamics",
    "Work, Energy, and Power",
    "Linear Momentum",
    "Torque and Rotational Dynamics",
    "Energy and Momentum of Rotating Systems",
    "Oscillations",
  ],
  "physics-c-em": [
    "Electrostatics",
    "Conductors, Capacitors, and Dielectrics",
    "Electric Circuits",
    "Magnetic Fields",
    "Electromagnetism",
  ],

  // ---------- History & Social Science ----------
  "us-history": [
    "Period 1, 1491 to 1607",
    "Period 2, 1607 to 1754",
    "Period 3, 1754 to 1800",
    "Period 4, 1800 to 1848",
    "Period 5, 1844 to 1877",
    "Period 6, 1865 to 1898",
    "Period 7, 1890 to 1945",
    "Period 8, 1945 to 1980",
    "Period 9, 1980 to present",
  ],
  "world-history": [
    "The Global Tapestry",
    "Networks of Exchange",
    "Land-Based Empires",
    "Transoceanic Interconnections",
    "Revolutions",
    "Consequences of Industrialization",
    "Global Conflict",
    "Cold War and Decolonization",
    "Globalization",
  ],
  "european-history": [
    "Renaissance and Exploration",
    "Age of Reformation",
    "Absolutism and Constitutionalism",
    "Scientific, Philosophical, and Political Developments",
    "Conflict, Crisis, and Reaction in the Late 18th Century",
    "Industrialization and Its Effects",
    "19th-Century Perspectives and Political Developments",
    "20th-Century Global Conflicts",
    "Cold War and Contemporary Europe",
  ],
  "us-gov": [
    "Foundations of American Democracy",
    "Interactions Among Branches of Government",
    "Civil Liberties and Civil Rights",
    "American Political Ideologies and Beliefs",
    "Political Participation",
  ],
  "comparative-gov": [
    "Political Systems, Regimes, and Governments",
    "Political Institutions",
    "Political Culture and Participation",
    "Party and Electoral Systems and Citizen Organizations",
    "Political and Economic Changes and Development",
  ],
  psychology: [
    "Biological Bases of Behavior",
    "Cognition",
    "Development and Learning",
    "Social Psychology and Personality",
    "Mental and Physical Health",
  ],
  "human-geography": [
    "Thinking Geographically",
    "Population and Migration Patterns and Processes",
    "Cultural Patterns and Processes",
    "Political Patterns and Processes",
    "Agriculture and Rural Land-Use Patterns and Processes",
    "Cities and Urban Land-Use Patterns and Processes",
    "Industrial and Economic Development Patterns and Processes",
  ],
  macroeconomics: [
    "Basic Economic Concepts",
    "Economic Indicators and the Business Cycle",
    "National Income and Price Determination",
    "Financial Sector",
    "Long-Run Consequences of Stabilization Policies",
    "Open Economy: International Trade and Finance",
  ],
  microeconomics: [
    "Basic Economic Concepts",
    "Supply and Demand",
    "Production, Cost, and the Perfect Competition Model",
    "Imperfect Competition",
    "Factor Markets",
    "Market Failure and the Role of Government",
  ],
  "african-american-studies": [
    "Origins of the African Diaspora",
    "Freedom, Enslavement, and Resistance",
    "The Practice of Freedom",
    "Movements and Debates",
  ],

  // ---------- English ----------
  "english-lang": [
    "Rhetorical Situation: Reading and Writing",
    "Claims and Evidence in Argument",
    "Reasoning and Organization",
    "Style and Word Choice",
    "Developing a Line of Reasoning",
    "Synthesizing Sources",
    "Complex Argument and Concession",
    "Nuanced Rhetorical Analysis",
    "Sustained Argument and Revision",
  ],
  "english-lit": [
    "Short Fiction I",
    "Poetry I",
    "Longer Fiction or Drama I",
    "Short Fiction II",
    "Poetry II",
    "Longer Fiction or Drama II",
    "Short Fiction III",
    "Poetry III",
    "Longer Fiction or Drama III",
  ],
  seminar: QUEST,
  research: QUEST,

  // ---------- World Languages ----------
  "spanish-lang": LANGUAGE_THEMES,
  "spanish-lit": [
    "La construcción del género",
    "La creación literaria",
    "Las relaciones interpersonales",
    "La dualidad del ser",
    "La sociedad en contacto",
    "El tiempo y el espacio",
  ],
  french: LANGUAGE_THEMES,
  german: LANGUAGE_THEMES,
  italian: LANGUAGE_THEMES,
  chinese: LANGUAGE_THEMES,
  japanese: LANGUAGE_THEMES,
  latin: [
    "Vergil, Aeneid Book 1",
    "Caesar, Gallic War Book 1",
    "Vergil, Aeneid Book 2",
    "Caesar, Gallic War Book 4",
    "Vergil, Aeneid Book 4",
    "Caesar, Gallic War Book 5",
    "Vergil, Aeneid Book 6",
    "Caesar, Gallic War Book 6",
  ],

  // ---------- Arts ----------
  "art-history": [
    "Global Prehistory, 30,000 to 500 BCE",
    "Ancient Mediterranean, 3500 BCE to 300 CE",
    "Early Europe and Colonial Americas, 200 to 1750 CE",
    "Later Europe and Americas, 1750 to 1980 CE",
    "Indigenous Americas, 1000 BCE to 1980 CE",
    "Africa, 1100 to 1980 CE",
    "West and Central Asia, 500 BCE to 1980 CE",
    "South, East, and Southeast Asia, 300 BCE to 1980 CE",
    "The Pacific, 700 to 1980 CE",
    "Global Contemporary, 1980 CE to present",
  ],
  "music-theory": [
    "Music Fundamentals I: Pitch, Major Scales and Key Signatures, Rhythm, Meter",
    "Music Fundamentals II: Minor Scales and Key Signatures, Melody, Timbre, Texture",
    "Music Fundamentals III: Triads and Seventh Chords",
    "Harmony and Voice Leading I: Chord Function, Cadence, and Phrase",
    "Harmony and Voice Leading II: Chord Progressions and Predominant Function",
    "Harmony and Voice Leading III: Embellishments, Motives, and Melodic Devices",
    "Harmony and Voice Leading IV: Secondary Function",
    "Modes and Form",
  ],
  "studio-art-2d": ["Sustained Investigation", "Selected Works", "Written Evidence"],
  "studio-art-drawing": ["Sustained Investigation", "Selected Works", "Written Evidence"],
};

/**
 * Subjects whose fallback unit titles still need checking against the current
 * CED, either because the course was recently redesigned or because it doesn't
 * use conventional content units. A subject stops being provisional as soon as
 * its meta.json exists.
 */
export const NEEDS_CHECK = new Set([
  "cs-a",
  "english-lang",
  "latin",
  "seminar",
  "research",
  "african-american-studies",
  "studio-art-2d",
  "studio-art-drawing",
]);

export function unitTitles(slug: string, unitCount: number): string[] {
  return (
    AP_UNITS[slug] ?? Array.from({ length: unitCount }, (_, i) => `Unit ${i + 1}`)
  );
}
