"use client";

import type { ElementType, ReactNode } from "react";
import { accent, plain } from "./copy-text";
import { useSectionScope } from "./SectionScope";
import { pageCopy } from "@/lib/content/live";

/**
 * One piece of a home-page section's text that the admin panel can rewrite (Pages → Home → the section): a badge, a
 * button, a card title, a list item, a note. It shows the admin's words if there are some, the built-in ones
 * otherwise, and marks itself (data-copy, data-default, data-label) so the panel lists every field of every section,
 * read straight from the page, with no list to keep up to date. `rich`: *asterisks* become the purple italic.
 */
export function Txt({ k, as: Tag = "span", label, rich = false, className, children }: { k: string; as?: ElementType; label?: string; rich?: boolean; className?: string; children?: ReactNode }) {
  const scope = useSectionScope();
  if (!scope) return <Tag className={className}>{children}</Tag>;
  const key = `${scope}.${k}`;
  const own = pageCopy("/", key);
  return (
    <Tag className={className} data-copy={key} data-default={plain(children)} {...(label && { "data-label": label })}>
      {own ? (rich ? accent(own) : own) : children}
    </Tag>
  );
}

/** The same for text used as a value (an attribute, a placeholder): the admin's words or the default. */
export function useTxt(k: string, fallback: string) {
  const scope = useSectionScope();
  return (scope && pageCopy("/", `${scope}.${k}`)) || fallback;
}

/**
 * Text a section shows only in some states (another tab, an opened panel, after a click): listed here, hidden, so the
 * admin panel finds and edits it like the rest. Nothing shows on the page.
 */
export function TxtCatalog({ items }: { items: [k: string, label: string, text: string][] }) {
  return (
    <div hidden aria-hidden="true">
      {items.map(([k, label, text]) => (
        <Txt key={k} k={k} label={label}>
          {text}
        </Txt>
      ))}
    </div>
  );
}
