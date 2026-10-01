import clsx from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Uppercase section title; the second half reads in muted grey (e.g. "SHOP" + "BY LINE"). */
export function SectionHead({
  id,
  title,
  muted,
  right,
  className,
}: {
  id?: string;
  title: string;
  muted?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <h2 id={id} className="type-section">
        {title}
        {muted && <span className="text-muted"> {muted}</span>}
      </h2>
      {right}
    </div>
  );
}

export function MoreLink({ children, ...rest }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
      {...rest}
    >
      {children}
    </button>
  );
}
