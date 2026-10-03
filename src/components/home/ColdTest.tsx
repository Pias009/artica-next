"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap, useGSAP } from "@/lib/gsap";
import { byId } from "@/lib/products";

const P = byId.p04;
const spot = (id: string) => P.hotspots.find((h) => h.id === id)!;

// Callouts appear as the reading falls; each is pinned to a real spot on the photo.
const CALLOUTS = [
  { at: -8, spot: spot("collar"), title: "Shearling blend lining", text: "Warmth stays in around the ankle.", side: "top" },
  { at: -16, spot: spot("upper"), title: "Full-grain leather upper", text: "Passes a 6-hour water immersion test.", side: "up" },
  { at: -24, spot: spot("outsole"), title: "Rubber lug outsole, 6 mm", text: "Deep tread that grips snow and ice.", side: "right" },
] as const;

const MIN = -25;
const fmt = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}°C`;

/**
 * Signature moment: the visitor scrolls the temperature down to −25°C.
 * The air turns to ice, frost gathers at the edges and the boot's features light up.
 * Without JS or with reduced motion, the finished (−25°C) state is shown.
 */
export function ColdTest() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 864px) and (prefers-reduced-motion: no-preference)",
          mobile: "(max-width: 863px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { desktop } = ctx.conditions as { desktop: boolean };
          const read = ref.current!.querySelector<HTMLElement>("[data-temp]")!;
          const t = { v: 0 };
          read.textContent = fmt(0);

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: desktop
              ? { trigger: "[data-cold-panel]", start: "top top", end: "+=150%", pin: true, scrub: 0.8, anticipatePin: 1 }
              : { trigger: "[data-cold-panel]", start: "top 65%", toggleActions: "play none none reverse" },
          });
          const span = 10; // timeline length in seconds of scroll
          tl.to(t, { v: MIN, duration: span, onUpdate: () => (read.textContent = fmt(Math.round(t.v))) }, 0)
            .from("[data-cold-air]", { opacity: 0, duration: span }, 0)
            .from("[data-frost]", { opacity: 0, scale: 1.15, duration: span }, 0)
            .from("[data-fill]", { scaleX: 0, transformOrigin: "0% 50%", duration: span }, 0)
            .fromTo(
              "[data-halo]",
              { filter: "drop-shadow(0 0 0px rgba(255,255,255,0))" },
              { filter: "drop-shadow(0 0 22px rgba(255,255,255,0.95))", duration: span },
              0,
            );

          CALLOUTS.forEach((c, i) => {
            const at = (c.at / MIN) * span;
            tl.from(`[data-callout="${i}"]`, { opacity: 0, y: 14, duration: 0.9, ease: "power2.out" }, at - 0.9);
            tl.from(`[data-dot="${i}"]`, { scale: 0, duration: 0.6, ease: "expo.out" }, at - 0.9);
          });
          tl.from("[data-cold-end]", { opacity: 0, y: 16, duration: 1, ease: "power2.out" }, span - 0.6);

          if (!desktop) tl.duration(3.2);
        },
      );
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="cold" aria-labelledby="h-cold" className="bleed mt-sec">
      <div data-cold-panel className="relative isolate overflow-hidden bg-white md:h-svh md:min-h-[640px]">
        {/* icy air + frost vignette */}
        <div data-cold-air aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#e3edf2_0%,#cfe0e8_100%)]" />
        <div
          data-frost
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgb(255_255_255/.75)_88%,#fff_100%)]"
        />

        <div className="wrap grid h-full items-center gap-10 px-(--shell-pad) py-20 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:py-0">
          {/* readout */}
          <div className="relative z-[2]">
            <h2 id="h-cold" className="type-section max-w-[12ch]">
              Built for real winters.
            </h2>
            <p className="mt-4 max-w-[36ch] text-[17px] text-ink-2">Scroll to take Nord from the shop floor down to its rated temperature.</p>
            <p
              data-temp
              aria-hidden="true"
              className="mt-10 text-[clamp(84px,11vw,168px)] leading-[0.85] font-semibold tracking-[-0.05em] text-glacier tabular-nums"
            >
              {fmt(MIN)}
            </p>
            <p className="sr-only">Rated to minus 25 degrees Celsius.</p>
            <div aria-hidden="true" className="mt-6 max-w-[360px]">
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div data-fill className="h-full rounded-full bg-[linear-gradient(90deg,#9fbccb,#2d5d6f)]" />
              </div>
              <div className="mt-2 flex justify-between text-[13px] font-medium text-ink-2 tabular-nums">
                <span>0°C</span>
                <span>−25°C</span>
              </div>
            </div>
            <div data-cold-end className="mt-10 flex flex-wrap items-center gap-4">
              <p className="text-[20px] font-semibold tracking-[-0.02em]">Still warm at −25°C.</p>
              <OpenInquiryButton className="btn btn-dark">
                Request a sample pair <Icon name="arrow" className="size-4" />
              </OpenInquiryButton>
            </div>
          </div>

          {/* boot with pinned callouts */}
          <div className="relative">
            <div
              data-cold-boot
              className="relative mx-auto"
              style={{ aspectRatio: `${P.outer.w} / ${P.outer.h}`, width: `min(100%, ${Math.round((520 * P.outer.w) / P.outer.h)}px)` }}
            >
              <QuickViewButton id={P.id} aria-label={`View details: Chime Long ${P.name}`} className="absolute inset-0 cursor-zoom-in">
                <span data-halo className="absolute inset-0">
                  <Image src={P.outer.src} alt={P.desc} fill sizes="(max-width: 864px) 92vw, 760px" className="object-contain drop-shadow-hero" />
                </span>
              </QuickViewButton>
              {CALLOUTS.map((c, i) => (
                // Outer span positions; the inner one is what GSAP animates (GSAP owns its transform).
                <span key={c.title} aria-hidden="true" className="pointer-events-none absolute z-[2] -translate-1/2" style={{ left: `${c.spot.x}%`, top: `${c.spot.y}%` }}>
                  <span data-dot={i} className="block size-3.5 rounded-full border-2 border-white bg-glacier shadow-[0_0_0_6px_rgb(255_255_255/.35)]" />
                </span>
              ))}
              {/* floating labels on larger screens */}
              {CALLOUTS.map((c, i) => (
                <div
                  key={c.title}
                  className={clsx(
                    "absolute z-[3] hidden w-[220px] lg:block",
                    c.side === "top" && "-translate-x-[30%] -translate-y-[calc(100%+22px)]",
                    c.side === "up" && "translate-x-[22px] -translate-y-[calc(100%+14px)]",
                    c.side === "right" && "translate-x-[28px] -translate-y-1/2",
                  )}
                  style={{ left: `${c.spot.x}%`, top: `${c.spot.y}%` }}
                >
                  <div data-callout={i} className="rounded-card bg-white/90 p-4 shadow-float backdrop-blur-sm">
                    <p className="text-[15px] font-semibold leading-snug">{c.title}</p>
                    <p className="mt-1 text-[14px] leading-snug text-ink-2">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* the same callouts as a list below the boot on smaller screens */}
            <ol className="mt-8 grid gap-3 sm:grid-cols-3 lg:hidden">
              {CALLOUTS.map((c, i) => (
                <li key={c.title} data-callout={i} className="rounded-card bg-white/85 p-4">
                  <p className="text-[15px] font-semibold leading-snug">{c.title}</p>
                  <p className="mt-1 text-[14px] leading-snug text-ink-2">{c.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
