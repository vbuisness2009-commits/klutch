import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userSession";
import {
  listMissedQuestions,
  saveMissedQuestions,
  setMissedQuestionMastered,
} from "@/lib/missedQuestionsStore";
import type { MissedQuestionItem } from "@/lib/attempts";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: true, missedQuestions: [] });
  }

  try {
    const list = await listMissedQuestions(user.id);
    return NextResponse.json({ ok: true, missedQuestions: list });
  } catch (err: any) {
    console.error("Failed to list missed questions:", err);
    return NextResponse.json(
      { error: "Failed to load missed questions." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to save missed questions." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const items = (Array.isArray(body?.missedQuestions)
      ? body.missedQuestions
      : []) as MissedQuestionItem[];

    const saved = await saveMissedQuestions(user.id, items);
    return NextResponse.json({ ok: true, savedCount: saved });
  } catch (err: any) {
    console.error("Failed to save missed questions:", err);
    return NextResponse.json(
      { error: "Failed to save missed questions." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to update question status." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, mastered } = body;
    if (!id || typeof mastered !== "boolean") {
      return NextResponse.json(
        { error: "id and mastered boolean are required." },
        { status: 400 }
      );
    }

    const updated = await setMissedQuestionMastered(user.id, id, mastered);
    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    console.error("Failed to update missed question:", err);
    return NextResponse.json(
      { error: "Failed to update question status." },
      { status: 500 }
    );
  }
}
