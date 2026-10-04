import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Klutch: SAT and AP prep from the real papers",
  description:
    "A study archive for College Board exams. Sit a past digital SAT under real timing, or work an AP subject unit by unit with graded practice, guides, and vocab.",
  metadataBase: new URL(
    process.env.APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3100")
  ),
  openGraph: {
    title: "Klutch: SAT and AP prep from the real papers",
    description:
      "Past digital SAT papers plus every AP subject, broken into units with graded practice, guides, and vocab.",
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
