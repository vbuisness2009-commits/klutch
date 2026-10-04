import { AP_SUBJECTS } from "@/lib/apSubjects";
import { loadMeta } from "@/lib/apLoader";
import { Markdown } from "@/components/ap/Markdown";

export function generateStaticParams() {
  return AP_SUBJECTS.map((s) => ({ slug: s.slug }));
}

/** Everything about the exam itself, straight from content/ap/<slug>/meta.json. */
export default function ExamOverview({ params }: { params: { slug: string } }) {
  const meta = loadMeta(params.slug);
  if (!meta) {
    return (
      <div className="panel max-w-3xl p-6">
        <p className="text-sm text-zinc-300">The exam profile for this subject hasn&rsquo;t been written yet.</p>
      </div>
    );
  }

  const { scoring } = meta;
  const dist = scoring.distribution;

  return (
    <div className="max-w-3xl space-y-12">
      <Block title="Format">
        {meta.examMode && (
          <p className="text-[14px] text-zinc-300">
            {meta.examMode}
            {meta.totalMinutes ? <span className="nums text-zinc-500"> &middot; {meta.totalMinutes} minutes total</span> : null}
          </p>
        )}
        {meta.sections.length > 0 && (
          <div className="ap-table-wrap mt-4" tabIndex={0} role="region" aria-label="Exam sections">
            <table className="text-[13px]">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th>Time</th>
                  <th>Weight</th>
                  <th>Calculator</th>
                </tr>
              </thead>
              <tbody>
                {meta.sections.map((s, k) => (
                  <tr key={k}>
                    <td className="text-zinc-200">
                      {s.name}
                      {s.notes && <span className="mt-1 block max-w-[28ch] text-[12px] text-zinc-500">{s.notes}</span>}
                    </td>
                    <td className="text-zinc-300">{s.questionType}</td>
                    <td className="text-zinc-300">{s.count || "—"}</td>
                    <td className="text-zinc-300">{s.minutes ? `${s.minutes} min` : "Untimed"}</td>
                    <td className="text-zinc-300">{s.weight || "—"}</td>
                    <td className="text-zinc-400">{s.calculator ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      {meta.units.some((u) => u.weight) && (
        <Block title="Unit weightings">
          <ol>
            {meta.units.map((u) => (
              <li key={u.number} className="flex items-baseline gap-4 border-b border-white/[0.07] py-2.5 text-[13px]">
                <span className="nums w-6 flex-shrink-0 text-zinc-600">{u.number}</span>
                <span className="flex-1 text-zinc-200">{u.title}</span>
                <span className="nums flex-shrink-0 text-zinc-400">{u.weight ?? "—"}</span>
              </li>
            ))}
          </ol>
        </Block>
      )}

      {meta.skills.length > 0 && (
        <Block title="Skills tested">
          <dl className="space-y-4">
            {meta.skills.map((s) => (
              <div key={s.name}>
                <dt className="text-sm font-semibold text-zinc-100">{s.name}</dt>
                <dd className="mt-1">
                  <Markdown source={s.description} className="text-[13px] text-zinc-400" />
                </dd>
              </div>
            ))}
          </dl>
        </Block>
      )}

      <Block title="Scoring">
        {scoring.summary && <Markdown source={scoring.summary} className="text-[14px] text-zinc-300" />}

        {meta.frqTypes && meta.frqTypes.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[13px] font-semibold text-zinc-200">Free-response types</h3>
            <div className="mt-2">
              {meta.frqTypes.map((f) => (
                <div key={f.name} className="border-b border-white/[0.07] py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-zinc-100">{f.name}</span>
                    {f.points > 0 && <span className="nums text-[12px] text-zinc-500">{f.points} pts</span>}
                  </div>
                  <Markdown source={f.howScored} className="mt-1 text-[13px] text-zinc-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {scoring.approxCutoffs && (
          <div className="mt-6">
            <h3 className="text-[13px] font-semibold text-zinc-200">
              Approximate cutoffs <span className="font-normal text-zinc-500">(estimate)</span>
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              The College Board doesn&rsquo;t publish cut scores. These are rough
              composite percentages and move from year to year.
            </p>
            <div className="nums mt-3 flex flex-wrap gap-x-8 gap-y-2">
              {scoring.approxCutoffs.map((c) => (
                <div key={c.score}>
                  <div className="text-[11px] text-zinc-500">{c.score}</div>
                  <div className="font-display text-lg font-bold text-white">~{c.minPercent}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dist && (
          <div className="mt-6">
            <h3 className="text-[13px] font-semibold text-zinc-200">
              Score distribution{dist.year ? `, ${dist.year}` : ""}
            </h3>
            <div className="mt-3 space-y-1.5">
              {(["5", "4", "3", "2", "1"] as const).map((s) => (
                <div key={s} className="nums flex items-center gap-3 text-[12px]">
                  <span className="w-3 text-zinc-500">{s}</span>
                  <div className="h-2 flex-1 rounded-sm bg-white/[0.04]">
                    <div
                      className="h-2 rounded-sm bg-mint/70"
                      style={{ width: `${Math.min(100, Math.max(0, dist.percents[s]))}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-zinc-400">{dist.percents[s]}%</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-zinc-500">As published by the College Board; may be rounded.</p>
          </div>
        )}
      </Block>

      {meta.strategy.length > 0 && (
        <Block title="Strategy">
          <ol className="ap-text list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-zinc-300 marker:text-zinc-600">
            {meta.strategy.map((s, k) => (
              <li key={k}>
                <Markdown source={s} inline />
              </li>
            ))}
          </ol>
        </Block>
      )}

      {meta.pitfalls.length > 0 && (
        <Block title="Common pitfalls">
          <ul className="ap-text list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-zinc-300 marker:text-zinc-600">
            {meta.pitfalls.map((s, k) => (
              <li key={k}>
                <Markdown source={s} inline />
              </li>
            ))}
          </ul>
        </Block>
      )}

      {meta.referenceSheet && (
        <Block title="Reference sheet">
          <p className="mb-3 text-[12px] text-zinc-500">What you&rsquo;re given on exam day.</p>
          <div className="panel p-5">
            <Markdown source={meta.referenceSheet} className="text-[14px] text-zinc-200" />
          </div>
        </Block>
      )}

      {meta.caveats && meta.caveats.length > 0 && (
        <Block title="Caveats">
          <ul className="ap-text list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-zinc-400 marker:text-zinc-600">
            {meta.caveats.map((s, k) => (
              <li key={k}>
                <Markdown source={s} inline />
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Sources">
        {meta.lastVerified && (
          <p className="nums text-[12px] text-zinc-500">Last checked against the College Board: {meta.lastVerified}</p>
        )}
        <ul className="mt-3 space-y-1.5">
          {meta.sources.map((s) => (
            <li key={s.url} className="text-[13px]">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white hover:decoration-white/60"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] leading-relaxed text-zinc-600">
          Klutch is independent and not affiliated with the College Board. All
          practice material here is original.
        </p>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-white/[0.14] pb-2 font-display text-lg font-bold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
