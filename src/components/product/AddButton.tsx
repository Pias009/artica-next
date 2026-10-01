"use client";

import clsx from "clsx";
import { Icon } from "../Icon";
import { byId } from "@/lib/products";
import { useInCart, useInquiry } from "@/lib/store";

/** Round +/✓ toggle that adds a style to the inquiry list at MOQ. */
export function AddButton({ id, className }: { id: string; className?: string }) {
  const on = useInCart(id);
  const toggle = useInquiry((s) => s.toggle);
  const name = byId[id].name;

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={on}
      aria-label={`${on ? "Remove" : "Add"} ${name} ${on ? "from" : "to"} inquiry list`}
      className={clsx(
        "hit-44 grid place-items-center rounded-full transition-[background-color,color,scale] duration-200 hover:scale-106",
        on ? "bg-accent text-on-accent" : "bg-white/85 text-ink",
        className,
      )}
    >
      <Icon name={on ? "check" : "plus"} className="size-4" />
    </button>
  );
}
