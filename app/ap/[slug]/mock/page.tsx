import { notFound } from "next/navigation";
import { AP_SUBJECTS } from "@/lib/apSubjects";
import { loadMeta, mockPool } from "@/lib/apLoader";
import { mcqSection, type MockConfig } from "@/lib/apMock";
import { MockExam } from "@/components/ap/MockExam";

export function generateStaticParams() {
  return AP_SUBJECTS.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

/**
 * Timed practice exam built from the subject's Exam level and Hardest MCQs.
 * The page only carries a small config; the question pool (with answers) is
 * fetched from /api/ap/<slug>/mock when the student starts.
 */
export default function MockPage({ params }: { params: { slug: string } }) {
  const meta = loadMeta(params.slug);
  if (!meta) notFound();
  const pool = mockPool(params.slug);
  const { count, minutes } = mcqSection(meta);

  const config: MockConfig = {
    slug: params.slug,
    mcqCount: count,
    mcqMinutes: minutes,
    cutoffs: meta.scoring.approxCutoffs ?? null,
    units: meta.units.map((u) => ({
      number: u.number,
      title: u.title,
      weight: u.weight,
      available: pool.filter((p) => p.unit === u.number).length,
    })),
    available: pool.length,
  };

  return <MockExam config={config} />;
}
