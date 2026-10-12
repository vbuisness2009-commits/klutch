/**
 * POST /api/practice/feedback
 *
 * Accepts a compact session analytics payload and returns constructive AI
 * coaching. Modes:
 *   - summary: overall feedback (used as the chatbot's first message)
 *   - chat: follow-up Q&A with the same analytics context in the system prompt
 *
 * Resilient multi-model OpenRouter fallback with intelligent heuristic
 * coach backup so students always receive personalized guidance.
 */

import { NextResponse } from "next/server";
import type { FeedbackPayload, FeedbackItemPayload } from "@/lib/testEngine/analytics";
import { currentUser } from "@/lib/userSession";
import { getUserCreditInfo, PLAN_LIMITS } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const CANDIDATE_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct",
];

function keyPool(): string[] {
  return (process.env.OPENROUTER_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

type ChatMessage = { role: "user" | "assistant"; content: string };

type Body = {
  mode?: "summary" | "chat";
  analytics: FeedbackPayload;
  messages?: ChatMessage[];
};

function buildSystemPrompt(analytics: FeedbackPayload): string {
  const scoreLine = analytics.score
    ? `Total ${analytics.score.total} ± ${analytics.score.totalMargin}. Sections: ${analytics.score.sections
        .map(
          (s) =>
            `${s.name} ${s.score} (${s.correct}/${s.total}, ${s.route} route)`
        )
        .join("; ")}.`
    : "Form is not scorable (no answer key).";

  const misses = analytics.items
    .filter((i) => i.correct === false)
    .map((i) => ({
      id: i.itemId,
      sec: i.sectionId,
      mod: i.moduleNum,
      n: i.numberInModule,
      domain: i.domain,
      skill: i.skill,
      diff: i.difficulty,
      timeSec: i.timeSec,
      slow: i.excessive || undefined,
    }));

  const slowItems = analytics.items
    .filter((i) => i.excessive)
    .map((i) => ({
      id: i.itemId,
      sec: i.sectionId,
      mod: i.moduleNum,
      n: i.numberInModule,
      domain: i.domain,
      skill: i.skill,
      timeSec: i.timeSec,
      reason: i.excessiveReason,
    }));

  return [
    "You are Klutch, an elite, highly encouraging, and analytical Digital SAT coach.",
    "Speak directly to the student in a clear, confident, and actionable tone.",
    "Structure your response with clean markdown headings and concise bullet points.",
    "Always reference their exact score, routing path (Upper vs Lower Module 2), strengths, missed skills, and pacing flags.",
    "When discussing a miss or slow item, explain the test strategy pattern and how to fix it on test day.",
    "Never invent questions, scores, or results not in the student's analytics.",
    "",
    `Form: ${analytics.formName} (${analytics.formId})`,
    scoreLine,
    `Totals: ${analytics.totals.correct} correct, ${analytics.totals.incorrect} incorrect, ${analytics.totals.blank} blank. Total time: ${Math.round(analytics.totals.timeSec / 60)} minutes.`,
    `Routes Achieved: RW Module 2 = ${analytics.routes.rw ?? "standard"}, Math Module 2 = ${analytics.routes.math ?? "standard"}.`,
    `Timing Heuristic: ${analytics.heuristicNote}`,
    "",
    `Missed Items Summary (${misses.length} total misses):`,
    JSON.stringify(misses.slice(0, 25)),
    "",
    `Pacing Outliers (${slowItems.length} questions took longer than expected pace):`,
    JSON.stringify(slowItems.slice(0, 15)),
  ].join("\n");
}

const SUMMARY_USER =
  "Write an insightful, constructive post-test diagnostic for my attempt. Break it down into: 1) Executive Summary & Score Takeaways, 2) Section Performance & Key Strengths, 3) High-Yield Misses by Domain & Skill, 4) Pacing & Clock Management Diagnostic, and 5) My 3 Next Steps to boost my score. Keep tone professional, motivating, and direct.";

async function tryCallOpenRouter(
  apiKey: string,
  messages: { role: string; content: string }[]
): Promise<string | null> {
  for (const model of CANDIDATE_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "http-referer": "https://klutchtestprep.com",
          "x-title": "Klutch SAT Coach",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const content = String(json.choices?.[0]?.message?.content ?? "").trim();
        if (content) return content;
      } else {
        console.warn(`OpenRouter model ${model} failed with HTTP ${res.status}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`OpenRouter model ${model} error:`, err);
    }
  }

  return null;
}

/**
 * Intelligent local SAT coaching heuristic fallback engine.
 * Ensures the student receives an immediate, rich, diagnostic review
 * even if LLM connectivity is delayed or throttled.
 */
function generateLocalCoachFeedback(
  analytics: FeedbackPayload,
  mode: "summary" | "chat",
  messages?: ChatMessage[]
): string {
  if (mode === "chat" && messages && messages.length > 0) {
    const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
    
    if (lastUserMsg.includes("pace") || lastUserMsg.includes("time") || lastUserMsg.includes("slow")) {
      const slowCount = analytics.items.filter((i) => i.excessive).length;
      return `### Pacing & Clock Strategy Diagnostic\n\nOn this test, you had **${slowCount} question${slowCount === 1 ? "" : "s"}** that exceeded the target pace band.\n\n**Key rules to reclaim 5–8 minutes:**\n- **Vocab & Grammar (Sprint items):** Spend no more than 20–30 seconds per question. Rely on structural clues (transitions, semicolons) without second-guessing.\n- **Desmos for Complex Math:** Any system of equations, quadratic vertex, or intersection should be graphed directly in Desmos. Solving visually takes under 20 seconds vs 90+ seconds algebraic manipulation.\n- **The 60-Second Checkpoint:** If you haven't identified your approach after 45–60 seconds, mark the question with a flag, pick your best educated guess, and move on. Return to it with leftover time.`;
    }

    if (lastUserMsg.includes("math") || lastUserMsg.includes("desmos") || lastUserMsg.includes("algebra")) {
      const mathMisses = analytics.items.filter((i) => i.sectionId === "math" && i.correct === false);
      return `### Math Improvement Roadmap\n\nYou missed **${mathMisses.length} math problem${mathMisses.length === 1 ? "" : "s"}** across this test.\n\n**Immediate high-yield adjustments:**\n1. **Leverage Desmos for 40%+ of questions:** Graph equations directly to find points of intersection, zeros, and extrema rather than factoring by hand.\n2. **Isolate the Question's Target:** Check whether the question asks for $x$, $2x + 1$, or $y$. Over 15% of SAT math misses are trap answers calculating the wrong variable.\n3. **Targeted Practice:** Use Klutch's Targeted Practice module to drill your specific weak areas (like Advanced Math and Geometry) in 10-question sets.`;
    }

    if (lastUserMsg.includes("reading") || lastUserMsg.includes("writing") || lastUserMsg.includes("vocab") || lastUserMsg.includes("words")) {
      const rwMisses = analytics.items.filter((i) => i.sectionId === "rw" && i.correct === false);
      return `### Reading & Writing Strategy Roadmap\n\nYou had **${rwMisses.length} miss${rwMisses.length === 1 ? "" : "es"}** in Reading & Writing.\n\n**Strategic advice:**\n1. **Words in Context:** Read the sentence and predict a simple replacement word in your head *before* inspecting the 4 choices. This prevents you from being swayed by distractor choices.\n2. **Transitions & Punctuation:** Semicolons and periods perform the exact same grammatical job on the SAT. If two choices differ only between a period and a semicolon, both are almost always incorrect.\n3. **Evidence-Based Questions:** The correct answer must be 100% supported by direct text. If an option requires a logical leap or assumption, eliminate it immediately.`;
    }

    return `### SAT Coach Recommendation\n\nLooking across your test performance (${analytics.totals.correct}/${analytics.totals.answered} correct):\n\n- **Strength:** You demonstrated strong performance on foundational items and handled module routing effectively.\n- **Priority Drill:** Focus your next study block on review of your missed questions in **${analytics.formName}**.\n- **Practice Next:** Jump into the **Targeted Practice** tab to generate focused sets targeting your lowest-scoring skills.`;
  }

  // Summary generation
  const totalScore = analytics.score?.total ?? "N/A";
  const rwScore = analytics.score?.sections.find((s) => s.name.includes("Reading"))?.score ?? "N/A";
  const mathScore = analytics.score?.sections.find((s) => s.name.includes("Math"))?.score ?? "N/A";

  const mathMisses = analytics.items.filter((i) => i.sectionId === "math" && i.correct === false);
  const rwMisses = analytics.items.filter((i) => i.sectionId === "rw" && i.correct === false);
  const slowItems = analytics.items.filter((i) => i.excessive);

  // Group missed skills
  const skillCount: Record<string, number> = {};
  for (const item of analytics.items.filter((i) => i.correct === false)) {
    skillCount[item.skill] = (skillCount[item.skill] || 0) + 1;
  }
  const topMissedSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([skill, count]) => `**${skill}** (${count} miss${count > 1 ? "es" : ""})`);

  const rwRoute = analytics.routes.rw === "upper" ? "Harder Module 2 (Upper)" : "Standard Module 2";
  const mathRoute = analytics.routes.math === "upper" ? "Harder Module 2 (Upper)" : "Standard Module 2";

  return `### 🎯 Executive Performance Diagnostic
- **Composite Score:** **${totalScore}** ${analytics.score?.totalMargin ? `(±${analytics.score.totalMargin})` : ""}
- **Reading & Writing:** **${rwScore}** (${rwRoute})
- **Math:** **${mathScore}** (${mathRoute})
- **Accuracy:** **${analytics.totals.correct}** correct / **${analytics.totals.answered}** answered (${Math.round((analytics.totals.correct / Math.max(1, analytics.totals.answered)) * 100)}%)

---

### 🔍 Section Strengths & Routing Impact
${analytics.routes.math === "upper" && analytics.routes.rw === "upper" 
  ? "You successfully qualified for the **Upper (Harder) Module 2** on both sections! That unlocks access to top-percentile scores (1400–1600). Your foundational knowledge in Module 1 is dependable."
  : analytics.routes.math === "upper" || analytics.routes.rw === "upper"
  ? `You routed into the **Upper Module 2** on ${analytics.routes.math === "upper" ? "Math" : "Reading & Writing"}, demonstrating strong mastery in that subject. Concentrating on standard Module 1 accuracy on the other section will raise your overall ceiling.`
  : "You routed into the Standard Module 2. Focusing on mastering Module 1 high-frequency skills will allow you to unlock the Upper Module 2 routing on your next test."
}

---

### ⚠️ Priority Skills to Drill
${topMissedSkills.length > 0 
  ? `Your errors clustered most heavily in:\n${topMissedSkills.map((s) => `- ${s}`).join("\n")}`
  : "- Excellent consistency! No single skill dominated your error distribution."
}

---

### ⏱️ Pacing & Clock Management
You had **${slowItems.length} questions** flagged where your time exceeded target pace bands.
${slowItems.length > 0
  ? `- Review your slow items in the module breakdown above. Notice whether you spent extra time calculating or re-reading long passages.\n- Remember: on Digital SAT, all questions carry equal point value. Don't let a difficult 2-minute question starve you of time on 3 accessible questions later in the module.`
  : "- Your pacing across modules was consistent and well-balanced."
}

---

### 🚀 3 High-Impact Next Steps
1. **Targeted Practice:** Complete a 10-question practice set on your top missed skill using the Targeted Practice tool.
2. **Desmos Graphing Optimization:** Practice solving systems, quadratics, and coordinate geometry questions visually on Desmos to cut question solve time under 30 seconds.
3. **Log Misses:** Click **'Explain More'** on each missed question in the breakdown above to master the underlying concept and avoid similar traps on test day.`;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.analytics?.formId || !Array.isArray(body.analytics.items)) {
    return NextResponse.json(
      { error: "analytics payload with formId and items is required." },
      { status: 400 }
    );
  }

  const mode = body.mode === "chat" ? "chat" : "summary";

  // Check user membership tier & usage limits
  const user = await currentUser();
  const creditInfo = user ? await getUserCreditInfo(user.id) : null;
  const tier = creditInfo?.tier ?? "free";
  const isProOrUnlimited =
    tier === "pro" || tier === "unlimited" || Boolean(creditInfo?.isAdmin);
  const maxCoachQuestions = isProOrUnlimited
    ? 9999
    : PLAN_LIMITS.free.maxCoachQuestionsPerTest; // 3 questions per test review

  // In chat mode, enforce limit on user questions
  const userQuestions = (body.messages ?? []).filter((m) => m.role === "user");
  const questionsUsed = userQuestions.length;

  if (mode === "chat" && !isProOrUnlimited && questionsUsed > maxCoachQuestions) {
    return NextResponse.json(
      {
        ok: false,
        limitReached: true,
        tier: "free",
        questionsUsed,
        maxQuestions: maxCoachQuestions,
        error: `You have reached the free tier limit of ${maxCoachQuestions} AI Coach questions for this test review. Upgrade to Klutch Pro or Elite for unlimited coaching.`,
      },
      { status: 403 }
    );
  }

  const questionsRemaining = isProOrUnlimited
    ? 9999
    : Math.max(0, maxCoachQuestions - (mode === "chat" ? questionsUsed : 0));

  const keys = keyPool();

  if (keys.length > 0) {
    const system = buildSystemPrompt(body.analytics);
    const messages: { role: string; content: string }[] = [
      { role: "system", content: system },
    ];

    if (mode === "summary") {
      messages.push({ role: "user", content: SUMMARY_USER });
    } else {
      const history = (body.messages ?? []).filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      );
      if (history.length === 0) {
        return NextResponse.json(
          { error: "messages required for chat mode." },
          { status: 400 }
        );
      }
      for (const m of history.slice(-10)) {
        messages.push({ role: m.role, content: m.content.slice(0, 3000) });
      }
    }

    try {
      const content = await tryCallOpenRouter(keys[0], messages);
      if (content) {
        return NextResponse.json({
          ok: true,
          mode,
          content,
          model: "openrouter-gemini",
          tier,
          questionsRemaining,
          maxQuestions: maxCoachQuestions,
          isUnlimited: isProOrUnlimited,
        });
      }
    } catch (err) {
      console.warn("OpenRouter API error in feedback route:", err);
    }
  }

  // Reliable, high-precision diagnostic fallback
  const fallbackContent = generateLocalCoachFeedback(
    body.analytics,
    mode,
    body.messages
  );

  return NextResponse.json({
    ok: true,
    mode,
    content: fallbackContent,
    model: "klutch-coach-engine",
    tier,
    questionsRemaining,
    maxQuestions: maxCoachQuestions,
    isUnlimited: isProOrUnlimited,
  });
}
