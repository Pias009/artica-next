import clsx from "clsx";
import { badgeTone, type Product } from "@/lib/products";

/** Quiet text tag on a white pill: "New", "Top reorder", "Trending". */
export function Badge({ badge, className }: { badge?: Product["badge"]; className?: string }) {
  if (!badge) return null;
  return (
    <span
      className={clsx(
        "rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold",
        badgeTone(badge) === "new" ? "text-brand" : "text-brand-red",
        className,
      )}
    >
      {badge}
    </span>
  );
}
