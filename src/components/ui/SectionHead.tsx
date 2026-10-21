import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The section heading, one format across the site: a small eyebrow, the title (sentence case; wrap its closing words in
 * <em> for the plum italic accent), an optional supporting line, and a right-hand action.
 */
export function SectionHead({
  id,
  eyebrow,
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
  return (
    <div className={clsx("mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:mb-10", className)}>
      <div className="max-w-[640px]">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id} className={clsx("type-section", eyebrow && "mt-3")}>
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
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.8] transition-transform duration-300 group-hover/al:translate-x-1">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
