"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { accent, plain } from "./copy-text";
import { useSectionScope } from "./SectionScope";
import { pageCopy, pageHidden, sectionCopy } from "@/lib/content/live";

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
  // the admin panel's Pages view can rewrite a heading and its line: home sections by section, other pages by the
  // heading's id; data-copy and data-default tell the panel which words these are and what they were as built
  const scope = useSectionScope();
  const path = usePathname();
  const builtTitle = plain(title);
  const builtSub = sub ?? "";
  const home = scope ? sectionCopy(scope) : undefined;
  const t = home?.title || (id && !scope ? pageCopy(path, `${id}.title`) : undefined);
  const s = home?.sub || (id && !scope ? pageCopy(path, `${id}.sub`) : undefined);
  if (t) title = accent(t);
  if (s) sub = s;
  // a section hidden on this page: its own <section> (the innermost one holding this heading) is not shown
  const hidden = !!id && !scope && pageHidden(path, id);
  return (
    <div className={clsx("mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:mb-10", className)}>
      {hidden && <style>{`section:has(#${id}):not(:has(section #${id})){display:none!important}`}</style>}
      <div className="max-w-[640px]">
        <h2 id={id} className="type-section" {...(id && { "data-copy": `${id}.title`, "data-default": builtTitle })}>
          {title}
        </h2>
        {(sub || id) && (
          <p className={clsx("mt-3 text-[17px] text-ink-2", !sub && "hidden")} {...(id && { "data-copy": `${id}.sub`, "data-default": builtSub })}>
            {sub}
          </p>
        )}
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
