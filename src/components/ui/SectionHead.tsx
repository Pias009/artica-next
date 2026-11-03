"use client";

import clsx from "clsx";
import { Fragment, type ReactNode } from "react";
import { useSectionScope } from "./SectionScope";
import { sectionCopy } from "@/lib/content/live";

/** The admin's headline: "*closing words*" in asterisks become the plum italic accent. */
const accent = (t: string) => t.split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>));

/**
 * The section heading, one format across the site: the title (sentence case; wrap its closing words in <em> for the
 * plum italic accent), an optional supporting line, and a right-hand action. `eyebrow` is accepted for existing callers
 * but not rendered: the heading carries the section (DESIGN.md, "No eyebrows").
 */
export function SectionHead({
  id,
  title,
  sub,
  right,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  sub?: string;
  right?: ReactNode;
  className?: string;
}) {
  // on the home page, the admin panel can rewrite a section's headline and line (Pages → Home)
  const scope = useSectionScope();
  const copy = scope ? sectionCopy(scope) : undefined;
  if (copy?.title) title = accent(copy.title);
  if (copy?.sub) sub = copy.sub;
  return (
    <div className={clsx("mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:mb-10", className)}>
      <div className="max-w-[640px]">
        <h2 id={id} className="type-section">
          {title}
        </h2>
        {sub && <p className="mt-3 text-[17px] text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Text link with an arrow that nudges on hover: the one section-level link style across the site. */
export function ArrowLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("group/al inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-ink transition-colors hover:text-brand", className)}>
      <span>{children}</span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4 fill-none stroke-current stroke-[1.8] transition-transform duration-300 group-hover/al:translate-x-1"
      >
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
