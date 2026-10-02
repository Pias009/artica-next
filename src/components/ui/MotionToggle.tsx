"use client";

import clsx from "clsx";
import { Icon } from "../Icon";

/** Pause/resume for a section's rotating products (hidden when the user prefers reduced motion). */
export function MotionToggle({ stopped, onToggle, className }: { stopped: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={stopped}
      className={clsx("inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-ink-2 transition-colors hover:text-ink motion-reduce:hidden", className)}
    >
      <span className="grid size-8 place-items-center rounded-full bg-chip">
        <Icon name={stopped ? "play" : "pause"} className="size-3.5" />
      </span>
      {stopped ? "Play" : "Pause"}
    </button>
  );
}
