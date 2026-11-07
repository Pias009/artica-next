"use client";

import type { ElementType, ReactNode } from "react";
import { accent, plain } from "./copy-text";
import { useSectionScope } from "./SectionScope";
import { sectionCopy } from "@/lib/content/live";

/**
 * A home-page section's headline or supporting line that the admin panel can rewrite (Pages → Home), for sections
 * with their own heading markup. It shows the admin's words if there are some, the section's own otherwise, and marks
 * itself (data-copy, data-default) so the panel can show the words as built. A supporting line the section doesn't
 * have shows only once the admin writes one.
 */
export function SectionText({ as: Tag = "p", part, id, className, children }: { as?: ElementType; part: "title" | "sub"; id?: string; className?: string; children?: ReactNode }) {
  const scope = useSectionScope();
  const own = scope ? sectionCopy(scope)?.[part] : undefined;
  const marks = scope ? { "data-copy": `${scope}.${part}`, "data-default": plain(children) } : {};
  if (!own && (children === undefined || children === null || children === "")) return <Tag hidden {...marks} />;
  return (
    <Tag id={id} className={className} {...marks}>
      {own ? (part === "title" ? accent(own) : own) : children}
    </Tag>
  );
}
