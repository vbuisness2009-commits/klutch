"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateTestButton({
  isLoggedIn = true,
  className = "",
}: {
  isLoggedIn?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      router.push("/signup?next=/dashboard");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg("Checking test bank for fresh exam...");

    try {
      // Simulate quick step for UI feedback
      const timer = setTimeout(() => {
        setStatusMsg("Synthesizing authentic 98-question adaptive test...");
      }, 1500);

      const res = await fetch("/api/tests/generate", {
        method: "POST",
      });

      clearTimeout(timer);

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate test.");
      }

      setStatusMsg(
        data.reusedFromBank
          ? `Allocated ${data.title} from bank! Launching...`
          : `Generated brand new ${data.title}! Launching...`
      );

      // Navigate straight into the player
      router.push(`/practice/test/${data.testId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`flex items-center gap-2 rounded bg-mint px-5 py-3 text-sm font-bold text-ink-950 transition hover:bg-mint-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 ${className}`}
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin text-ink-950"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{statusMsg || "Preparing Test..."}</span>
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>Generate a New Adaptive Test</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs font-medium text-rose-400">{error}</p>
      )}
    </div>
  );
}
