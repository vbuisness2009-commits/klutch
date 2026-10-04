import { AP_SUBJECTS } from "@/lib/apSubjects";
import { mockPool } from "@/lib/apLoader";

// The practice-exam question pool for one subject (Exam level + Hardest MCQ,
// answers included). Generated at build per subject, so the mock page stays
// light and only pays for the pool when a student presses Start.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return AP_SUBJECTS.map((s) => ({ slug: s.slug }));
}

export function GET(_req: Request, { params }: { params: { slug: string } }) {
  return Response.json({ pool: mockPool(params.slug) });
}
