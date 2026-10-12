import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function keyPool(): string[] {
  return (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export type ExplainMoreRequest = {
  stem: string;
  stimulus?: string;
  choices?: { id: string; text: string }[];
  correct: string;
  studentAnswer?: string;
  rationale?: string;
  domain?: string;
  skill?: string;
  sectionId?: "rw" | "math";
};

export type ExplainMoreResponse = {
  ok: boolean;
  coreConcept: string;
  steps: string[];
  desmosShortcut?: string;
  desmosKeystrokes?: string[];
  eliminationTip?: string;
  trapToAvoid: string;
  takeaway: string;
  error?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExplainMoreRequest;
    const {
      stem,
      stimulus,
      choices,
      correct,
      studentAnswer,
      rationale,
      domain,
      skill,
      sectionId,
    } = body;

    if (!stem || !correct) {
      return NextResponse.json(
        { ok: false, error: "Missing required question stem or correct key." },
        { status: 400 }
      );
    }

    const isMath = Boolean(
      sectionId === "math" ||
        (domain &&
          [
            "Algebra",
            "Advanced Math",
            "Problem-Solving and Data Analysis",
            "Geometry and Trigonometry",
          ].includes(domain))
    );

    const prompt = `You are Klutch's friendly expert SAT tutor. A student got this question wrong (or wants a deeper, simpler explanation) and clicked 'Explain More'.
Explain this in a crystal-clear, approachable, step-by-step way so that any student can instantly grasp it. No heavy jargon or intimidating math proofs.

QUESTION DETAILS:
- Domain: ${domain || "SAT"}
- Skill: ${skill || "General"}
- Section: ${isMath ? "Math" : "Reading & Writing"}
${stimulus ? `- Stimulus/Passage: """${stimulus.slice(0, 1500)}"""\n` : ""}- Question Stem: """${stem}"""
${choices && choices.length > 0 ? `- Choices:\n${choices.map((c) => `  ${c.id}: ${c.text}`).join("\n")}\n` : ""}- Correct Answer: ${correct}
${studentAnswer ? `- Student's Answer: ${studentAnswer}\n` : ""}${rationale ? `- Official Rationale: """${rationale.slice(0, 1200)}"""\n` : ""}

INSTRUCTIONS:
Return STRICT, VALID JSON ONLY with this exact structure:
{
  "coreConcept": "A short, crystal-clear 1-sentence breakdown of what this problem is asking in plain English.",
  "steps": [
    "Step 1: Simple explanation of the first move...",
    "Step 2: Simple execution of arithmetic/logic...",
    "Step 3: Direct conclusion verifying why answer is correct."
  ],
  ${
    isMath
      ? `"desmosShortcut": "How to solve this in under 20 seconds using Desmos Graphing Calculator (e.g. type equations, look for gray points, intercept or vertex).",
  "desmosKeystrokes": ["y = 2x + 3", "y = -x + 6"],`
      : `"eliminationTip": "A fast elimination rule showing why the trap answers fail.",`
  }
  "trapToAvoid": "The common trap or careless mistake students make on this exact type of question.",
  "takeaway": "A memorable 1-line rule to remember for test day."
}`;

    const keys = keyPool();
    if (keys.length > 0) {
      const apiKey = keys[0];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);

      try {
        const res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            "http-referer": "https://klutchtestprep.com",
            "x-title": "Klutch Explain More AI",
          },
          body: JSON.stringify({
            model: MODEL,
            temperature: 0.3,
            max_tokens: 1500,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const rawContent = data.choices?.[0]?.message?.content ?? "";
          if (rawContent) {
            const parsed = JSON.parse(rawContent);
            return NextResponse.json({
              ok: true,
              coreConcept: parsed.coreConcept || "Key concept for this question.",
              steps: Array.isArray(parsed.steps) ? parsed.steps : [parsed.steps || "Follow standard solution steps."],
              desmosShortcut: parsed.desmosShortcut || undefined,
              desmosKeystrokes: Array.isArray(parsed.desmosKeystrokes) ? parsed.desmosKeystrokes : undefined,
              eliminationTip: parsed.eliminationTip || undefined,
              trapToAvoid: parsed.trapToAvoid || "Watch out for misreading the requested variable or unit.",
              takeaway: parsed.takeaway || "Review this concept pattern before test day.",
            });
          }
        }
      } catch (err) {
        console.warn("OpenRouter API error in explain-more, using fallback:", err);
      }
    }

    // Fallback if LLM call is offline or sandbox blocks outbound network
    return NextResponse.json(generateLocalFallback(body, isMath));
  } catch (error) {
    console.error("Explain-more route error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate explanation." },
      { status: 500 }
    );
  }
}

function generateLocalFallback(
  req: ExplainMoreRequest,
  isMath: boolean
): ExplainMoreResponse {
  const steps: string[] = [];

  if (req.rationale) {
    const sentences = req.rationale
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 10);
    if (sentences.length >= 2) {
      sentences.forEach((s, idx) => {
        steps.push(`Step ${idx + 1}: ${s.trim()}`);
      });
    } else {
      steps.push(`Step 1: Identify the given values and equations.`);
      steps.push(`Step 2: ${req.rationale}`);
    }
  } else {
    steps.push(`Step 1: Re-read the question carefully and isolate the required quantity.`);
    steps.push(`Step 2: Test candidate values against the condition.`);
    steps.push(`Step 3: Confirm that choice ${req.correct} satisfies all criteria.`);
  }

  let desmosShortcut: string | undefined = undefined;
  let desmosKeystrokes: string[] | undefined = undefined;

  if (isMath) {
    desmosShortcut =
      "Type the given equation or expression directly into Desmos. Click on the curve to inspect intercepts, vertices, or points of intersection with the axes.";
    desmosKeystrokes = ["y = f(x)", "y = 0"];
  }

  return {
    ok: true,
    coreConcept: `This question tests ${req.skill || req.domain || "core SAT principles"}. Focus on isolating what the question explicitly asks for.`,
    steps,
    desmosShortcut,
    desmosKeystrokes,
    eliminationTip: !isMath
      ? "Cross out choices that add unsupported assumptions, extreme wording ('always', 'never'), or reverse the cause-and-effect relationship."
      : undefined,
    trapToAvoid: isMath
      ? "Solving for 'x' when the question asks for '2x + 5' or another transformed value."
      : "Selecting an answer that sounds plausible in real life but is not directly backed up by the passage text.",
    takeaway: "Always circle what the question is asking for before doing calculations or picking an option.",
  };
}
