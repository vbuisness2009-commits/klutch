import { Fragment, type ReactNode } from "react";
import {
  parseMarkdown,
  type MdAlign,
  type MdBlock,
  type MdInline,
} from "@/lib/apMarkdown";

/**
 * Renders AP content Markdown (see lib/apMarkdown.ts) as React elements. No
 * HTML string is ever produced, so content can't inject markup.
 *
 * Not a client component on its own: it renders on the server inside pages and
 * in the browser inside the practice tools, whichever imports it.
 *
 * `inline` drops the wrapping paragraph for one-line strings (list items,
 * choices, table cells) so they sit inside the caller's own element.
 */
export function Markdown({
  source,
  className = "",
  inline = false,
}: {
  source: string | undefined | null;
  className?: string;
  inline?: boolean;
}) {
  const blocks = parseMarkdown(source ?? "");

  if (inline && blocks.length === 1 && blocks[0].t === "p") {
    return <span className={`ap-text ${className}`}>{renderInlines(blocks[0].c)}</span>;
  }

  return (
    <div className={`ap-text ap-md ${className}`}>{renderBlocks(blocks, false)}</div>
  );
}

function renderBlocks(blocks: MdBlock[], tight: boolean): ReactNode {
  return blocks.map((b, k) => <Fragment key={k}>{renderBlock(b, tight)}</Fragment>);
}

function renderBlock(b: MdBlock, tight: boolean): ReactNode {
  switch (b.t) {
    case "p":
      return tight ? <span className="block">{renderInlines(b.c)}</span> : <p>{renderInlines(b.c)}</p>;

    case "h":
      return (
        <p className="ap-md-h font-display font-bold text-white">{renderInlines(b.c)}</p>
      );

    case "code":
      return (
        <pre className="ap-code" tabIndex={0} aria-label={b.lang ? `${b.lang} code` : "Code"}>
          <code>{b.v}</code>
        </pre>
      );

    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag
          start={b.ordered && b.start !== 1 ? b.start : undefined}
          className={b.ordered ? "list-decimal" : "list-disc"}
        >
          {b.items.map((item, k) => (
            <li key={k}>
              {renderBlocks(item, item.filter((x) => x.t === "p").length <= 1)}
            </li>
          ))}
        </Tag>
      );
    }

    case "table":
      return (
        <div className="ap-table-wrap" tabIndex={0} role="region" aria-label="Table">
          <table>
            {b.head && (
              <thead>
                <tr>
                  {b.head.map((cell, k) => (
                    <th key={k} style={alignStyle(b.align[k])}>
                      {renderInlines(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, k) => (
                    <td key={k} style={alignStyle(b.align[k])}>
                      {renderInlines(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "quote":
      return <blockquote>{renderBlocks(b.c, false)}</blockquote>;

    case "hr":
      return <hr />;
  }
}

function alignStyle(a: MdAlign) {
  return a ? { textAlign: a } : undefined;
}

function renderInlines(nodes: MdInline[]): ReactNode {
  return nodes.map((n, k) => {
    switch (n.t) {
      case "text":
        return <Fragment key={k}>{n.v}</Fragment>;
      case "br":
        return <br key={k} />;
      case "code":
        return (
          <code key={k} className="ap-inline-code">
            {n.v}
          </code>
        );
      case "strong":
        return (
          <strong key={k} className="font-semibold text-white">
            {renderInlines(n.c)}
          </strong>
        );
      case "em":
        return <em key={k}>{renderInlines(n.c)}</em>;
      case "link":
        return (
          <a
            key={k}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-mint underline decoration-mint/30 underline-offset-4 hover:decoration-mint"
          >
            {renderInlines(n.c)}
          </a>
        );
    }
  });
}
