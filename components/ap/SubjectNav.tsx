"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The subject's sub-pages. Unit pages count as "Units". */
export function SubjectNav({
  slug,
  hasExam,
  hasMock,
}: {
  slug: string;
  hasExam: boolean;
  hasMock: boolean;
}) {
  const path = usePathname() ?? "";
  const base = `/ap/${slug}`;
  const links = [
    { href: base, label: "Units", active: path === base || path.startsWith(`${base}/unit`) },
    ...(hasExam ? [{ href: `${base}/exam`, label: "Exam overview", active: path.startsWith(`${base}/exam`) }] : []),
    ...(hasMock ? [{ href: `${base}/mock`, label: "Practice exam", active: path.startsWith(`${base}/mock`) }] : []),
  ];

  return (
    <nav aria-label="Subject sections" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-white/[0.14]">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.active ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2.5 text-sm transition ${
            l.active
              ? "border-mint font-semibold text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-200"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
