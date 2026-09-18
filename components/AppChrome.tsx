"use client";

import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

/**
 * Site chrome stays out of the way during a timed form. Bluebook is a
 * full-screen player; marketing nav and footer break that spell.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = Boolean(pathname?.startsWith("/practice/test/"));

  return (
    <div className="relative flex min-h-screen flex-col">
      {!immersive && <Nav />}
      <main className="flex-1">{children}</main>
      {!immersive && <Footer />}
    </div>
  );
}
