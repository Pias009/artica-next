"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useUI } from "@/lib/store";

/** Any boot, anywhere: opens the shared Quick View dialog for that style. */
export function QuickViewButton({ id, onClick, ...rest }: { id: string } & ComponentPropsWithoutRef<"button">) {
  const open = useUI((s) => s.openQuickView);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) open(id);
      }}
      {...rest}
    />
  );
}
