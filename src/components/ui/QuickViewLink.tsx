"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { useUI } from "@/lib/store";

/**
 * A style's real link (/products/[slug]) that opens Quick View on a plain click. Search engines and new-tab clicks
 * (cmd, ctrl, shift, middle button) follow the link to the full product page; everyone else stays in the list.
 */
export function QuickViewLink({ id, slug, onClick, ...rest }: { id: string; slug: string } & Omit<ComponentPropsWithoutRef<"a">, "href">) {
  const open = useUI((s) => s.openQuickView);
  return (
    <Link
      href={`/products/${slug}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(id);
      }}
      {...rest}
    />
  );
}
