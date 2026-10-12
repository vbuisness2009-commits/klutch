import { TargetedPracticeView } from "@/components/targeted/TargetedPracticeView";

export const metadata = {
  title: "Targeted SAT Practice | Klutch Prep",
  description:
    "Drill specific SAT math and reading topics with 30 calibrated questions (10 Easy, 10 Medium, 10 Hard) or generate custom topic drills with AI.",
};

export default function TargetedPracticePage() {
  return <TargetedPracticeView />;
}
