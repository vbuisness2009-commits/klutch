import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AppChrome } from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Klutch: Complete SAT and AP Exam Prep",
  description:
    "An all-in-one prep platform for College Board exams. Sit adaptive Digital SAT practice tests under real timing, or work an AP subject unit by unit with graded practice, guides, and vocab.",
  metadataBase: new URL(
    process.env.APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3100")
  ),
  openGraph: {
    title: "Klutch: Complete SAT and AP Exam Prep",
    description:
      "Adaptive Digital SAT practice tests plus every AP subject, broken into units with graded practice, guides, and vocab.",
    siteName: "Klutch",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04040A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950 text-zinc-100 antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
