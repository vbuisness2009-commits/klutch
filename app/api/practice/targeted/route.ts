import { NextResponse } from "next/server";
import {
  getTargetedSetFromBank,
  listTargetedSetsFromBank,
  slugifyTopic,
} from "@/lib/targeted/store";
import { getOrGenerateTargetedSet } from "@/lib/targeted/generator";
import { TARGETED_TOPICS } from "@/lib/targeted/topics";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 min for AI synthesis if needed

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const section = searchParams.get("section") as "math" | "rw" | null;

    if (id) {
      const set = await getTargetedSetFromBank(id);
      if (!set) {
        return NextResponse.json({ error: "Set not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, set });
    }

    // List sets in bank
    const bankSets = await listTargetedSetsFromBank(section || undefined);
    return NextResponse.json({
      ok: true,
      bankSets,
      presets: TARGETED_TOPICS.filter((t) => !section || t.section === section),
    });
  } catch (error: any) {
    console.error("Targeted sets GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch targeted sets." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { section, topic, domain, skill, customTopic } = body;

    const finalTopic = (customTopic || topic || "").trim();
    if (!finalTopic) {
      return NextResponse.json(
        { error: "Topic is required." },
        { status: 400 }
      );
    }

    const sec = section === "rw" ? "rw" : "math";
    const dom = domain || (sec === "math" ? "Math Focused Practice" : "Reading & Writing Focused Practice");
    const skl = skill || finalTopic;

    // Check bank or synthesize
    const result = await getOrGenerateTargetedSet({
      section: sec,
      topic: finalTopic,
      domain: dom,
      skill: skl,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Targeted sets POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate targeted practice set.",
      },
      { status: 500 }
    );
  }
}
