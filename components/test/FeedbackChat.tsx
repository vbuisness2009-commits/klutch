"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedbackPayload } from "@/lib/testEngine/analytics";
import { Markdown } from "@/components/ap/Markdown";

type Msg = { role: "assistant" | "user"; content: string };

type Props = {
  analytics: FeedbackPayload;
};

const SUGGESTED_PROMPTS = [
  { label: "⏱️ How do I fix my pacing?", query: "How should I manage my time and fix my slow questions on this test?" },
  { label: "🎯 What should I drill first?", query: "Which specific skills should I practice first to gain the most points?" },
  { label: "📐 Where can Desmos save time?", query: "Which math questions on this test could I have solved in under 20 seconds with Desmos?" },
  { label: "❌ Break down my hardest misses", query: "Can you analyze my hardest misses and the trap answers to avoid?" },
];

export function FeedbackChat({ analytics }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "summary", analytics }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMessages([{ role: "assistant", content: String(json.content) }]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load feedback. You can still ask questions below."
      );
    } finally {
      setLoading(false);
    }
  }

  async function send(customPrompt?: string) {
    const text = (customPrompt ?? input).trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/practice/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          analytics,
          messages: next,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMessages([
        ...next,
        { role: "assistant", content: String(json.content) },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat request failed.");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0c131a] via-[#090e13] to-[#070b0e] p-5 shadow-2xl backdrop-blur sm:p-7"
      data-testid="feedback-chat"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[18px] font-bold tracking-tight text-white sm:text-[20px]">
                Klutch AI Performance Coach
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-[12px] text-zinc-400">
              Personalized test diagnostic &middot; Section routing &middot; Pacing analysis
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="mt-5 space-y-5 max-h-[36rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 && loading && (
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/30 p-4 text-[13px] text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Klutch AI Coach is synthesizing your score, module routing, and pacing telemetry...</span>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "rounded-xl border border-white/[0.08] bg-black/40 p-5 text-[14px] leading-relaxed text-zinc-200 shadow-md"
                : "ml-6 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-[14px] text-emerald-100 sm:ml-12"
            }
          >
            {m.role === "assistant" && (
              <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                <span>Klutch SAT Coach</span>
                {i === 0 && (
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400 font-normal">
                    Initial Diagnostic
                  </span>
                )}
              </div>
            )}
            {m.role === "assistant" ? (
              <div className="prose-invert">
                <Markdown source={m.content} className="text-[14px] leading-relaxed text-zinc-200" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap font-medium">{m.content}</div>
            )}
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-4 py-3 text-[13px] text-zinc-400">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Analyzing test data and generating advice...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-200" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="ml-3 font-semibold underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Suggested Prompts */}
      <div className="mt-5 border-t border-white/[0.08] pt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Suggested Questions
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => void send(p.query)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200 disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Input */}
      <form
        className="mt-3 flex gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach anything (e.g. 'How can I fix my time on Module 2 Math?')"
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-[13px] text-white placeholder:text-zinc-600 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-5 py-3 text-[13px] font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-40"
        >
          <span>Ask</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    </div>
  );
}
