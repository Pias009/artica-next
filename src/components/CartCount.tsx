"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useInquiry } from "@/lib/store";

/** Pill showing the number of styles in the inquiry list; bumps when it changes. */
export function CartCount() {
  const n = useInquiry((s) => s.lines.length);
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      gsap.fromTo(ref.current, { scale: 1.3 }, { scale: 1, duration: 0.6, ease: "expo.out" });
    },
    { dependencies: [n] },
  );

  return (
    <span
      ref={ref}
      className="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full bg-on-accent px-1.5 text-xs font-bold text-ink tabular-nums"
    >
      {n}
      <span className="sr-only"> {n === 1 ? "style" : "styles"}</span>
    </span>
  );
}
