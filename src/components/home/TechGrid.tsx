"use client";

import { useRef } from "react";
import { Icon } from "../Icon";
import { SectionHead } from "../ui/SectionHead";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { TECH, type TechSpec } from "@/lib/tech";

const fmt = (n: number, suffix: string) => `${n < 0 ? "−" : ""}${Math.abs(n)}${suffix}`;

/** Spec tiles; numbers count up when scrolled into view. */
export function TechGrid({
  id = "tech",
  items = TECH,
  title = "Built for cold, tested for retail.",
  sub,
}: {
  id?: string;
  items?: TechSpec[];
  title?: string;
  sub?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>("[data-num]").forEach((el) => {
          const end = Number(el.dataset.num);
          const suffix = el.dataset.suffix ?? "";
          const o = { v: 0 };
          el.textContent = fmt(0, suffix);
          gsap.to(o, {
            v: end,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
            onUpdate: () => {
              el.textContent = fmt(Math.round(o.v), suffix);
            },
          });
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id={id} aria-labelledby={`h-${id}`} className="mt-sec scroll-mt-24">
      <SectionHead id={`h-${id}`} title={title} sub={sub} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((t) => (
          <div key={t.title} data-reveal className="flex flex-col gap-2 rounded-card bg-tile p-5">
            <Icon name={t.icon} className="size-6 stroke-[1.4] text-glacier" />
            <span className="mt-4 text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
              <span aria-hidden="true" data-num={t.value} data-suffix={t.suffix}>
                {fmt(t.value, t.suffix)}
              </span>
              <span className="sr-only">{fmt(t.value, t.suffix)}</span>
            </span>
            <b className="text-[15px] font-semibold">{t.title}</b>
            <span className="text-[13px] leading-snug text-muted">{t.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
