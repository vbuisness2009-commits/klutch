"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type UnitTab = { id: string; label: string; count?: number; content: ReactNode };

/**
 * Tabs for a unit page. The active tab lives in the URL hash (#practice,
 * #vocab) so links from the subject page land on the right one and the page
 * itself stays static. Arrow keys move between tabs, per the ARIA tabs pattern.
 */
export function UnitTabs({ tabs }: { tabs: UnitTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === h)) setActive(h);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);

  const pick = (id: string, focus = false) => {
    setActive(id);
    try {
      window.history.replaceState(null, "", id === tabs[0]?.id ? window.location.pathname : `#${id}`);
    } catch {
      // Not fatal; the tab still switches.
    }
    if (focus) refs.current[tabs.findIndex((t) => t.id === id)]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Unit sections" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-white/[0.14]">
        {tabs.map((t, k) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[k] = el;
              }}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => pick(t.id)}
              onKeyDown={(e) => {
                const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                pick(tabs[(k + d + tabs.length) % tabs.length].id, true);
              }}
              className={`-mb-px border-b-2 pb-2.5 text-sm transition ${
                on ? "border-mint font-semibold text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {t.label}
              {t.count ? <span className="nums ml-2 text-[12px] text-mint">{t.count}</span> : null}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          className="mt-8"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
