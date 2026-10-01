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
  title = "Built for cold.",
  muted = "Tested for retail.",
}: {
  id?: string;
  items?: TechSpec[];
  title?: string;
  muted?: string;
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
    <section ref={ref} id={id} aria-labelledby={`h-${id}`} className="mt-sec scroll-mt-6">
      <SectionHead id={`h-${id}`} title={title} muted={muted} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((t, i) => (
          <div
            key={t.title}
            data-reveal
            className="group flex flex-col items-center gap-2 rounded-card border border-line/60 bg-tile px-3.5 pt-5 pb-5 text-center card-lift transition-all hover:border-ink/25 hover:bg-surface"
          >
            <div className="flex w-full items-center justify-between text-[9px] font-mono text-muted">
              <span>[0{i + 1}]</span>
              <span className="size-1.5 rounded-full bg-accent/40 group-hover:bg-accent" />
            </div>
            <div className="grid size-12 place-items-center rounded-2xl bg-surface border border-line/60 text-ink shadow-xs">
              <Icon name={t.icon} className="size-6 stroke-[1.4] text-accent" />
            </div>
            <b className="mt-1 text-[11px] font-extrabold tracking-[.08em] uppercase text-ink">{t.title}</b>
            <span className="text-2xl font-extrabold tracking-[-.02em] tabular-nums text-ink">
              <span aria-hidden="true" data-num={t.value} data-suffix={t.suffix}>
                {fmt(t.value, t.suffix)}
              </span>
              <span className="sr-only">{fmt(t.value, t.suffix)}</span>
            </span>
            <span className="text-[11px] leading-snug text-muted">{t.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
