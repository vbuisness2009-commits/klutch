"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedbackPayload } from "@/lib/testEngine/analytics";

type Msg = { role: "assistant" | "user"; content: string };

type Props = {
  analytics: FeedbackPayload;
};

export function FeedbackChat({ analytics }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, loading, expanded]);

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
          : "Could not load feedback. You can still ask below."
      );
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setExpanded(true);
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

  const latest = messages[messages.length - 1];
  const preview =
    latest?.role === "assistant"
      ? latest.content.replace(/\s+/g, " ").trim().slice(0, 220)
      : "";

  return (
    <div className="mt-8" data-testid="feedback-chat">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-[20px] font-bold tracking-tight text-white">
          Coach
        </h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-[12px] font-semibold text-zinc-500 transition hover:text-mint"
          >
            {expanded ? "Collapse" : "Expand chat"}
          </button>
        )}
      </div>

      <div className="mt-3 border-y border-white/[0.08] py-4">
        {messages.length === 0 && loading && (
          <p className="text-[14px] text-zinc-500">Writing feedback…</p>
        )}

        {!expanded && latest?.role === "assistant" && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mint/80">
              Klutch
            </div>
            <p className="text-[14px] leading-relaxed text-zinc-200">
              {preview}
              {latest.content.length > 220 ? "…" : ""}
            </p>
            {latest.content.length > 220 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-2 text-[12px] font-semibold text-mint transition hover:text-mint-400"
              >
                Read full feedback
              </button>
            )}
          </div>
        )}

        {expanded && (
          <div className="max-h-[16rem] space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "assistant"
                    ? "text-[14px] leading-relaxed text-zinc-200"
                    : "ml-4 border-l border-white/15 pl-3 text-[14px] leading-relaxed text-zinc-400"
                }
              >
                {m.role === "assistant" && i === 0 && (
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mint/80">
                    Klutch
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            {loading && messages.length > 0 && (
              <p className="text-[13px] text-zinc-500">Thinking…</p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-[13px] text-amber-300/90" role="alert">
          {error}
          {messages.length === 0 && (
            <button
              type="button"
              onClick={() => void loadSummary()}
              className="ml-2 underline transition hover:text-amber-200"
            >
              Retry
            </button>
          )}
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about pacing, a miss, or what to practice next"
          disabled={loading}
          className="min-w-0 flex-1 rounded border border-white/15 bg-ink-950 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 outline-none transition focus:border-mint/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-mint px-3.5 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
