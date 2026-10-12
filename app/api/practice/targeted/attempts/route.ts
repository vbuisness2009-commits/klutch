import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import {
  saveTargetedAttempt,
  listTargetedAttempts,
} from "@/lib/targeted/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ ok: true, attempts: [] });
    }

    const attempts = await listTargetedAttempts(user.id);
    return NextResponse.json({ ok: true, attempts });
  } catch (error: any) {
    console.error("Failed to list targeted attempts:", error);
    return NextResponse.json(
      { error: "Failed to list targeted practice attempts." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    const body = await req.json();

    const {
      setId,
      section,
      domain,
      topic,
      totalQuestions = 30,
      answeredCount = 0,
      correctCount = 0,
      easyCorrect = 0,
      mediumCorrect = 0,
      hardCorrect = 0,
      scorePercent = 0,
    } = body;

    if (!topic || !section) {
      return NextResponse.json(
        { error: "Topic and section are required." },
        { status: 400 }
      );
    }

    const attempt = await saveTargetedAttempt({
      userId: user?.id || null,
      setId: setId || null,
      section: section === "rw" ? "rw" : "math",
      domain: domain || "General Practice",
      topic: String(topic),
      totalQuestions: Number(totalQuestions) || 30,
      answeredCount: Number(answeredCount) || 0,
      correctCount: Number(correctCount) || 0,
      easyCorrect: Number(easyCorrect) || 0,
      mediumCorrect: Number(mediumCorrect) || 0,
      hardCorrect: Number(hardCorrect) || 0,
      scorePercent: Math.round(Number(scorePercent) || 0),
    });

    return NextResponse.json({ ok: true, attempt });
  } catch (error: any) {
    console.error("Failed to save targeted attempt:", error);
    return NextResponse.json(
      { error: "Failed to save practice attempt." },
      { status: 500 }
    );
  }
}
