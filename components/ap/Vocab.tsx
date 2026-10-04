"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApVocab } from "@/lib/apSchema";
import { knownKey, readStore, writeStore } from "@/lib/apProgress";
import { markdownToText } from "@/lib/apMarkdown";
import { shuffle } from "@/lib/apMock";
import { Markdown } from "@/components/ap/Markdown";
import { typingTarget } from "@/components/ap/Choices";

/**
 * A unit's vocab: flashcards (flip, step, shuffle, mark known) and a
 * searchable list underneath. "Known" is saved per unit in localStorage.
 */
export function Vocab({ slug, unit, terms }: { slug: string; unit: number; terms: ApVocab[] }) {
  const [known, setKnown] = useState<string[]>([]);
  const [order, setOrder] = useState<number[]>(() => terms.map((_, k) => k));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hideKnown, setHideKnown] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const v = readStore<string[]>(knownKey(slug, unit), []);
    setKnown(Array.isArray(v) ? v : []);
  }, [slug, unit]);

  const deck = useMemo(
    () => order.filter((k) => !hideKnown || !known.includes(terms[k].term)),
    [order, hideKnown, known, terms]
  );
  const at = Math.min(pos, Math.max(0, deck.length - 1));
  const card = deck.length ? terms[deck[at]] : null;
  const isKnown = card ? known.includes(card.term) : false;

  const step = (d: number) => {
    if (!deck.length) return;
    setPos((at + d + deck.length) % deck.length);
    setFlipped(false);
  };
  const toggleKnown = () => {
    if (!card) return;
    const next = isKnown ? known.filter((t) => t !== card.term) : [...known, card.term];
    setKnown(next);
    writeStore(knownKey(slug, unit), next);
    // Marking known while hiding known cards moves you on by itself.
    if (!isKnown && hideKnown) setFlipped(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typingTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const inCards = (e.target as HTMLElement | null)?.closest?.("[data-flashcards]");
      if (!inCards) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key.toLowerCase() === "k") toggleKnown();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return terms;
    return terms.filter((t) =>
      `${t.term} ${markdownToText(t.definition)} ${markdownToText(t.example ?? "")}`.toLowerCase().includes(s)
    );
  }, [query, terms]);

  if (!terms.length) {
    return (
      <div className="panel p-6">
        <p className="text-sm text-zinc-400">No vocab for this unit yet.</p>
      </div>
    );
  }

  return (
    <div>
      <section data-flashcards aria-label="Flashcards">
        <div className="nums flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 text-[12px] text-zinc-500">
          <span>
            {deck.length ? `Card ${at + 1} of ${deck.length}` : "Every card is marked known"}
            {known.length > 0 && <span className="text-mint"> &middot; {known.length} known</span>}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => {
                setOrder(shuffle(terms.map((_, k) => k)));
                setPos(0);
                setFlipped(false);
              }}
              className="hover:text-white"
            >
              Shuffle
            </button>
            <button type="button" aria-pressed={hideKnown} onClick={() => setHideKnown(!hideKnown)} className="hover:text-white">
              {hideKnown ? "Show known" : "Hide known"}
            </button>
            {known.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setKnown([]);
                  writeStore(knownKey(slug, unit), null);
                }}
                className="hover:text-white"
              >
                Clear known
              </button>
            )}
          </span>
        </div>

        {card ? (
          <>
            <button
              type="button"
              onClick={() => setFlipped(!flipped)}
              aria-label={flipped ? `Definition of ${card.term}. Activate to show the term.` : `${card.term}. Activate to show the definition.`}
              className="panel mt-3 flex min-h-[13rem] w-full flex-col items-center justify-center px-6 py-8 text-center transition hover:border-white/25 focus:outline-none focus-visible:border-mint/60"
            >
              {!flipped ? (
                <>
                  <span className="ap-text font-display text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
                    {card.term}
                  </span>
                  <span className="mt-3 text-[12px] text-zinc-600">Tap or press Enter to flip</span>
                </>
              ) : (
                <span className="block max-w-[52ch] text-left">
                  <span className="block text-[12px] font-semibold text-zinc-500">{card.term}</span>
                  <Markdown source={card.definition} className="mt-2 text-[15px] text-zinc-100" />
                  {card.example && (
                    <Markdown source={card.example} className="mt-3 text-[13px] italic text-zinc-400" />
                  )}
                </span>
              )}
            </button>

            <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => step(-1)} className="text-[13px] text-zinc-400 hover:text-white">
                Previous
              </button>
              <button
                type="button"
                onClick={toggleKnown}
                aria-pressed={isKnown}
                className={`rounded border px-3 py-1.5 text-[12px] font-semibold transition ${
                  isKnown ? "border-mint/60 bg-mint/10 text-mint" : "border-white/15 text-zinc-300 hover:border-white/40"
                }`}
              >
                {isKnown ? "Known" : "Mark known"}
              </button>
              <button type="button" onClick={() => step(1)} className="text-[13px] font-medium text-zinc-200 hover:text-white">
                Next
              </button>
            </div>
            <p className="mt-2 hidden text-center text-[11px] text-zinc-600 sm:block">
              Arrow keys to move, K to mark known
            </p>
          </>
        ) : (
          <div className="panel mt-3 p-6 text-sm text-zinc-400">
            Nice. Show known cards to go through them again.
          </div>
        )}
      </section>

      <section className="mt-12" aria-label="All terms">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.14] pb-2">
          <h3 className="font-display text-base font-bold text-white">All terms</h3>
          <label className="w-full sm:w-64">
            <span className="sr-only">Search terms</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms"
              className="w-full rounded border border-white/15 bg-white/[0.03] px-3 py-1.5 text-[13px] text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none"
            />
          </label>
        </div>
        {filtered.length === 0 ? (
          <p className="mt-4 text-[13px] text-zinc-500">No terms match.</p>
        ) : (
          <dl>
            {filtered.map((t, k) => (
              <div key={`${t.term}-${k}`} className="grid gap-1 border-b border-white/[0.07] py-3 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <dt className="ap-text text-sm font-semibold text-zinc-100">
                  {t.term}
                  {known.includes(t.term) && <span className="ml-2 text-[11px] font-normal text-mint">known</span>}
                </dt>
                <dd>
                  <Markdown source={t.definition} className="text-[14px] text-zinc-300" />
                  {t.example && <Markdown source={t.example} className="mt-1.5 text-[13px] italic text-zinc-500" />}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
