"use client";

import clsx from "clsx";
import { setEffects, useEffectsOn } from "./effects";

/** "Season animations" on/off: the pause control for the moving weather (WCAG 2.2.2). */
export function EffectsToggle({ className }: { className?: string }) {
  const on = useEffectsOn();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setEffects(!on)}
      className={clsx("flex min-h-11 w-full items-center gap-3 rounded-ph px-3 text-[14px] hover:bg-tile", className)}
    >
      <span className="flex-1 text-left">Season animations</span>
      <span aria-hidden="true" className={clsx("relative h-6 w-10 rounded-full transition-colors", on ? "bg-ink" : "bg-ink/20")}>
        <span className={clsx("absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none", on && "translate-x-4")} />
      </span>
    </button>
  );
}
