import React from "react";

type Props = {
  title: string;
  subtitle: string;
  cta: string;
  alt: React.ReactNode;
  showName?: boolean;
};

const inputClass =
  "w-full rounded border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-mint/60 focus:outline-none";

export function AuthShell({ title, subtitle, cta, alt, showName }: Props) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-sm flex-col justify-center px-5 py-14">
      <h1 className="font-display text-2xl font-bold tracking-tight text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p>

      <form className="mt-7 space-y-2.5">
        {showName && (
          <input type="text" placeholder="First name" className={inputClass} />
        )}
        <input
          type="email"
          placeholder="you@school.edu"
          className={inputClass}
        />
        <input type="password" placeholder="Password" className={inputClass} />
        <button
          type="button"
          className="w-full rounded bg-mint px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
        >
          {cta}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-400">{alt}</p>
    </section>
  );
}
