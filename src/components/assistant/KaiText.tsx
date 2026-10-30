import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Kai's replies as text: paragraphs, bullet and numbered lists, **bold** and [links](/catalog). A small, strict
 * subset of markdown, rendered as elements (never as HTML), with links kept to this site or https.
 */
export function KaiText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={list.ordered ? "ml-5 list-decimal space-y-1" : "ml-4 list-disc space-y-1 marker:text-muted"}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>);
  }
  flush();
  return <div className="grid gap-2">{blocks}</div>;
}

/** **bold** and [label](href) inside one line. */
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let at = 0;
  for (let m; (m = re.exec(s)); ) {
    if (m.index > at) out.push(s.slice(at, m.index));
    if (m[1]) out.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>);
    else out.push(<KaiLink key={m.index} href={m[3]} label={m[2]} />);
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push(s.slice(at));
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

function KaiLink({ href, label }: { href: string; label: string }) {
  const cls = "font-semibold text-brand underline underline-offset-2 hover:text-brand-deep";
  if (/^\/(?!\/)/.test(href)) return <Link href={href} className={cls}>{label}</Link>;
  if (/^https:\/\//.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls}>{label}</a>;
  return <>{label}</>;
}
