"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useUI, type BuyerType } from "@/lib/store";

type Props = ComponentPropsWithoutRef<"button"> & { buyerType?: BuyerType };

export function OpenInquiryButton({ buyerType, onClick, ...rest }: Props) {
  const openDrawer = useUI((s) => s.openDrawer);
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        openDrawer(buyerType);
      }}
      {...rest}
    />
  );
}
