"use client";

import { usePathname } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { accent, plain } from "./copy-text";
import { pageCopy } from "@/lib/content/live";

/**
 * A piece of page text the admin panel can rewrite (Pages): shows the admin's words for this page and key if there
 * are some, the page's own otherwise, and marks itself (data-copy, data-default) so the panel can list it.
 */
export function Copy({ as: Tag = "p", k, className, children }: { as?: ElementType; k: string; className?: string; children: ReactNode }) {
  const own = pageCopy(usePathname(), k);
  return (
    <Tag className={className} data-copy={k} data-default={plain(children)}>
      {own ? accent(own) : children}
    </Tag>
  );
}
