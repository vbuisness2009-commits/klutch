export type ApSubject = {
  slug: string;
  name: string;
  category:
    | "Math & CS"
    | "Sciences"
    | "History & Social Science"
    | "English"
    | "World Languages"
    | "Arts";
  emoji: string;
  units: number;
};

// The College Board's ~38 AP subjects (2025–2026).
export const AP_SUBJECTS: ApSubject[] = [
  // Math & CS
  { slug: "calc-ab", name: "AP Calculus AB", category: "Math & CS", emoji: "∫", units: 8 },
  { slug: "calc-bc", name: "AP Calculus BC", category: "Math & CS", emoji: "∞", units: 10 },
  { slug: "precalculus", name: "AP Precalculus", category: "Math & CS", emoji: "📐", units: 4 },
  { slug: "statistics", name: "AP Statistics", category: "Math & CS", emoji: "📊", units: 9 },
  { slug: "cs-a", name: "AP Computer Science A", category: "Math & CS", emoji: "☕", units: 10 },
  { slug: "cs-principles", name: "AP Computer Science Principles", category: "Math & CS", emoji: "💻", units: 5 },

  // Sciences
  { slug: "biology", name: "AP Biology", category: "Sciences", emoji: "🧬", units: 8 },
  { slug: "chemistry", name: "AP Chemistry", category: "Sciences", emoji: "⚗️", units: 9 },
  { slug: "environmental", name: "AP Environmental Science", category: "Sciences", emoji: "🌎", units: 9 },
  { slug: "physics-1", name: "AP Physics 1", category: "Sciences", emoji: "🍎", units: 8 },
  { slug: "physics-2", name: "AP Physics 2", category: "Sciences", emoji: "🌊", units: 7 },
  { slug: "physics-c-mech", name: "AP Physics C: Mechanics", category: "Sciences", emoji: "🚀", units: 7 },
  { slug: "physics-c-em", name: "AP Physics C: E&M", category: "Sciences", emoji: "⚡", units: 5 },

  // History & Social Science
  { slug: "us-history", name: "AP U.S. History", category: "History & Social Science", emoji: "🇺🇸", units: 9 },
  { slug: "world-history", name: "AP World History: Modern", category: "History & Social Science", emoji: "🌍", units: 9 },
  { slug: "european-history", name: "AP European History", category: "History & Social Science", emoji: "🏰", units: 9 },
  { slug: "us-gov", name: "AP U.S. Government & Politics", category: "History & Social Science", emoji: "🏛️", units: 5 },
  { slug: "comparative-gov", name: "AP Comparative Government & Politics", category: "History & Social Science", emoji: "🗳️", units: 5 },
  { slug: "psychology", name: "AP Psychology", category: "History & Social Science", emoji: "🧠", units: 5 },
  { slug: "human-geography", name: "AP Human Geography", category: "History & Social Science", emoji: "🗺️", units: 7 },
  { slug: "macroeconomics", name: "AP Macroeconomics", category: "History & Social Science", emoji: "📈", units: 6 },
  { slug: "microeconomics", name: "AP Microeconomics", category: "History & Social Science", emoji: "🛒", units: 6 },
  { slug: "african-american-studies", name: "AP African American Studies", category: "History & Social Science", emoji: "✊🏿", units: 4 },

  // English
  { slug: "english-lang", name: "AP English Language & Composition", category: "English", emoji: "✍️", units: 9 },
  { slug: "english-lit", name: "AP English Literature & Composition", category: "English", emoji: "📖", units: 9 },
  { slug: "seminar", name: "AP Seminar", category: "English", emoji: "🎤", units: 5 },
  { slug: "research", name: "AP Research", category: "English", emoji: "🔬", units: 5 },

  // World Languages
  { slug: "spanish-lang", name: "AP Spanish Language & Culture", category: "World Languages", emoji: "🇪🇸", units: 6 },
  { slug: "spanish-lit", name: "AP Spanish Literature & Culture", category: "World Languages", emoji: "📜", units: 6 },
  { slug: "french", name: "AP French Language & Culture", category: "World Languages", emoji: "🇫🇷", units: 6 },
  { slug: "german", name: "AP German Language & Culture", category: "World Languages", emoji: "🇩🇪", units: 6 },
  { slug: "italian", name: "AP Italian Language & Culture", category: "World Languages", emoji: "🇮🇹", units: 6 },
  { slug: "chinese", name: "AP Chinese Language & Culture", category: "World Languages", emoji: "🇨🇳", units: 6 },
  { slug: "japanese", name: "AP Japanese Language & Culture", category: "World Languages", emoji: "🇯🇵", units: 6 },
  { slug: "latin", name: "AP Latin", category: "World Languages", emoji: "🏛️", units: 8 },

  // Arts
  { slug: "art-history", name: "AP Art History", category: "Arts", emoji: "🖼️", units: 10 },
  { slug: "music-theory", name: "AP Music Theory", category: "Arts", emoji: "🎼", units: 8 },
  { slug: "studio-art-2d", name: "AP 2-D Art & Design", category: "Arts", emoji: "🎨", units: 3 },
  { slug: "studio-art-drawing", name: "AP Drawing", category: "Arts", emoji: "✏️", units: 3 },
];
