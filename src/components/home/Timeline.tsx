"use client";

import { useRef } from "react";
import { Icon, type IconName } from "../Icon";
import { SectionHead } from "../ui/SectionHead";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { LEAD } from "@/lib/products";

const STATIONS: [string, string, IconName][] = [
  [LEAD.quote, "Quote", "chat"],
  [LEAD.samples, "Samples", "sample"],
  [LEAD.bulk, "Production", "box"],
  [LEAD.delivery, "Door delivery", "truck"],
];

/** Inquiry to shelf: the olive line fills and each station lights up in turn. */
export function Timeline() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: "[data-track]", start: "top 80%", once: true } });
        tl.from("[data-fill]", { scaleX: 0, transformOrigin: "0% 50%", duration: 1.8, ease: "none" });
        gsap.utils.toArray<HTMLElement>("[data-station]").forEach((el, i) => {
          tl.from(el, { backgroundColor: "#EAE9E2", color: "#55564E", scale: 0.9, duration: 0.35, ease: "power2.out" }, i * 0.55);
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="timeline" aria-labelledby="h-timeline" className="mt-sec">
      <SectionHead id="h-timeline" title="Inquiry to shelf" muted="in 11 weeks" />
      <div data-track className="relative rounded-shell border border-line/60 bg-tile px-4 py-8 shadow-soft sm:px-4">
        <div aria-hidden="true" className="absolute top-[68px] right-[12.5%] left-[12.5%] hidden h-0.5 rounded-full bg-chip-hover sm:block">
          <span data-fill className="block h-full rounded-full bg-accent" />
        </div>
        <ol className="relative grid grid-cols-2 gap-y-8 sm:grid-cols-4">
        {STATIONS.map(([num, label, icon], i) => (
          <li key={label} className="relative flex flex-col items-center gap-2 text-center">
            <span className="mono-label text-[9px] text-muted mb-0.5">MILESTONE 0{i + 1}</span>
            <span data-station className="grid size-14 place-items-center rounded-full bg-accent text-on-accent ring-8 ring-tile shadow-[0_4px_14px_rgb(71_76_56/0.25)]">
              <Icon name={icon} className="size-6 stroke-[1.4]" />
            </span>
            <span className="mt-1 text-[clamp(28px,4.2vw,52px)] leading-none font-extrabold tracking-[-.03em] tabular-nums text-ink">{num}</span>
            <span className="text-[13px] font-bold text-ink">
              <span className="sr-only">Step {i + 1}: </span>
              {label}
            </span>
          </li>
        ))}
        </ol>
      </div>
    </section>
  );
}
