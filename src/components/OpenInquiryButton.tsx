"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useUI, type BuyerType } from "@/lib/store";

/** Opens the inquiry drawer, optionally with the buyer type chosen and a note already written for the buyer. */
type Props = ComponentPropsWithoutRef<"button"> & { buyerType?: BuyerType; note?: string };

export function OpenInquiryButton({ buyerType, note, onClick, ...rest }: Props) {
  const openDrawer = useUI((s) => s.openDrawer);
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        openDrawer(buyerType, undefined, note);
      }}
      {...rest}
    />
  );
}
