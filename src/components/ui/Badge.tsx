import clsx from "clsx";
import { badgeTone, type Product } from "@/lib/products";

export function Badge({ badge, className }: { badge?: Product["badge"]; className?: string }) {
  if (!badge) return null;
  return (
    <span
      className={clsx(
        "rounded-lg px-[9px] py-[5px] text-[10px] font-extrabold tracking-[.08em] uppercase",
        badgeTone(badge) === "new" ? "bg-badge-new text-accent" : "bg-badge-hot text-badge-hot-ink",
        className,
      )}
    >
      {badge}
    </span>
  );
}
