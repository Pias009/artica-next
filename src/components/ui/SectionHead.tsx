import clsx from "clsx";
import type { ReactNode } from "react";

/** Calm section heading: sentence case, optional supporting line and a right-hand action. */
export function SectionHead({
  id,
  title,
  sub,
  right,
  className,
}: {
  id?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  className?: string;
}) {
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

/** Text link with an arrow that nudges on hover. */
export function ArrowLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("group/al inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand", className)}>
      <span className="underline decoration-brand/30 underline-offset-[6px] transition-colors group-hover/al:decoration-brand">{children}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.8] transition-transform duration-300 group-hover/al:translate-x-1">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
