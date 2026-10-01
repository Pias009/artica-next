"use client";

import Image from "next/image";
import { useRef } from "react";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { byId } from "@/lib/products";

const P = byId.p04;
const STATS = [
  { value: 120, decimals: 0, suffix: "+", label: "Retail partners" },
  { value: 45, decimals: 0, suffix: " days", label: "Bulk production" },
  { value: 0.4, decimals: 1, suffix: "%", label: "Defect rate" },
];

/** Full-bleed −25°C band: boot drifts on scroll, stats count up once. */
export function ColdBanner() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-drift]",
          { yPercent: 12, rotation: -2 },
          { yPercent: -10, rotation: -9, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 } },
        );
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const end = Number(el.dataset.count);
          const dec = Number(el.dataset.dec);
          const suffix = el.dataset.suffix ?? "";
          const o = { v: 0 };
          el.textContent = `${(0).toFixed(dec)}${suffix}`;
          gsap.to(o, {
            v: end,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
            onUpdate: () => {
              el.textContent = `${o.v.toFixed(dec)}${suffix}`;
            },
          });
        });
      });
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      aria-labelledby="h-cold"
      className="bleed bg-banner relative mt-sec isolate flex min-h-[520px] flex-col overflow-hidden px-(--shell-pad) py-[clamp(22px,3vw,40px)] md:h-[min(50vw,680px)]"
    >
      <div className="relative z-[3] flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="glass mono-label rounded-full px-3.5 py-1.5 text-ink shadow-xs">
            SUB-ZERO CERTIFIED · SATRA TM144
          </span>
          <span className="mono-label text-[10px] text-ink/70 hidden sm:inline">[ −25°C COLD RATED ]</span>
        </div>
        <OpenInquiryButton className="btn btn-dark">Get tier pricing</OpenInquiryButton>
      </div>

      <p className="type-banner pointer-events-none absolute top-1/2 left-[3%] z-0 -translate-y-[58%] text-accent select-none max-md:text-[17vw]">
        <span aria-hidden="true">−25°C</span>
        <span className="sr-only">Rated to minus 25 degrees Celsius</span>
      </p>

      <QuickViewButton
        id={P.id}
        aria-label={`View details: ARTICA ${P.name}`}
        data-drift
        className="absolute top-[16%] right-[4%] z-[1] h-[58%] w-[64%] cursor-zoom-in md:top-[12%] md:right-[8%] md:h-[74%] md:w-[48%]"
      >
        <Image src={P.zip!.src} alt={`${P.desc}, zip side`} fill sizes="(max-width: 864px) 64vw, 640px" className="object-contain drop-shadow-hero" />
      </QuickViewButton>

      <dl className="relative z-[2] mt-auto grid max-w-[640px] grid-cols-3 gap-2.5">
        {STATS.map((s) => (
          <div key={s.label} className="glass-card flex flex-col-reverse justify-end rounded-card px-4 py-3.5 shadow-soft">
            <dt className="mt-1.5 text-xs font-semibold text-ink-2">{s.label}</dt>
            <dd className="text-[clamp(22px,3vw,36px)] leading-none font-extrabold tracking-[-.02em] tabular-nums text-ink">
              {/* The count-up is visual only; screen readers get the final value. */}
              <span aria-hidden="true" data-count={s.value} data-dec={s.decimals} data-suffix={s.suffix}>
                {s.value.toFixed(s.decimals)}
                {s.suffix}
              </span>
              <span className="sr-only">
                {s.value.toFixed(s.decimals)}
                {s.suffix}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
