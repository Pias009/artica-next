"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { byId } from "@/lib/products";

const P = byId.p04;

interface StepDetail {
  title: string;
  text: string;
  spec: string;
  benefit: string;
  badge: string;
  icon: "layers" | "shield" | "boot" | "sole";
  x: number;
  y: number;
  scale: number;
}

const STEPS: StepDetail[] = [
  {
    title: "Wool herringbone collar",
    text: "Padded and soft where the boot meets the leg. Provides thermal insulation without chafing.",
    spec: "Italian Wool Blend · 12mm Ergonomic Padding",
    benefit: "Zero ankle bite & thermal breathing",
    badge: "Thermal Wool",
    icon: "layers",
    x: 22,
    y: 22,
    scale: 2.45,
  },
  {
    title: "Anti-oxidation metal hooks",
    text: "Fast, uniform lacing tension from toe to collar with dual-riveted base anchors.",
    spec: "Zinc-Alloy Speed Hooks · Waxed Cord",
    benefit: "Snag-free glide & high-tensile pull rating",
    badge: "Speed Hooks",
    icon: "shield",
    x: 42,
    y: 23,
    scale: 2.5,
  },
  {
    title: "360° Stitched Goodyear welt",
    text: "Upper stitched directly to the sole with braided waxed thread, then vulcanized sealed against slush.",
    spec: "Braided Waxed Thread · Vulcanized Seal",
    benefit: "Re-soleable & watertight snow barrier",
    badge: "Lockstitch Welt",
    icon: "boot",
    x: 74,
    y: 77,
    scale: 2.65,
  },
  {
    title: "Deep-siped rubber lug outsole",
    text: "6 mm self-clearing lugs engineered to bite packed snow, icy cobblestones, and wet sidewalks.",
    spec: "Cold-Resistant Rubber · Rated −30°C",
    benefit: "Multi-directional ice traction & shock absorption",
    badge: "6mm Ice Lugs",
    icon: "sole",
    x: 44,
    y: 91,
    scale: 2.35,
  },
];

/**
 * Signature moment: Precision inspection studio with scroll-driven pinned camera,
 * interactive step navigation, optical magnifying loupe, and angle toggling.
 */
export function UpClose() {
  const containerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const zoomStageRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);

  const [activeStep, setActiveStep] = useState<number>(0);
  const [viewAngle, setViewAngle] = useState<"outer" | "zip">("outer");
  const [loupeActive, setLoupeActive] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, relX: 0.5, relY: 0.5, inside: false });

  const activeStepRef = useRef<number>(0);
  activeStepRef.current = activeStep;

  const currentShot = viewAngle === "outer" ? P.outer : P.zip ?? P.outer;

  // Manual smooth zoom application
  const applyZoomToTarget = useCallback((xPercent: number, yPercent: number, scale: number, duration = 0.75) => {
    if (!zoomTargetRef.current) return;
    gsap.to(zoomTargetRef.current, {
      xPercent,
      yPercent,
      scale,
      duration,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, []);

  const scrollToStep = useCallback((index: number) => {
    setActiveStep(index);
    const step = STEPS[index];
    const targetX = (50 - step.x) * step.scale;
    const targetY = (50 - step.y) * step.scale;

    if (stRef.current) {
      // Map step to scroll position along timeline
      const progressTargets = [0.12, 0.38, 0.64, 0.9];
      const targetScroll =
        stRef.current.start + progressTargets[index] * (stRef.current.end - stRef.current.start);
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
    } else {
      applyZoomToTarget(targetX, targetY, step.scale);
    }
  }, [applyZoomToTarget]);

  const resetToOverview = useCallback(() => {
    if (stRef.current) {
      window.scrollTo({ top: stRef.current.start, behavior: "smooth" });
    }
    applyZoomToTarget(0, 0, 1, 0.6);
  }, [applyZoomToTarget]);

  // GSAP ScrollTrigger timeline setup
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const zoomEl = zoomTargetRef.current;
        if (!zoomEl || !panelRef.current) return;

        // Reset transform
        gsap.set(zoomEl, { xPercent: 0, yPercent: 0, scale: 1 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panelRef.current,
            start: "top 72px",
            end: "+=260%",
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            onUpdate: (self) => {
              const p = self.progress;
              let nextStep = 0;
              if (p < 0.25) nextStep = 0;
              else if (p < 0.5) nextStep = 1;
              else if (p < 0.75) nextStep = 2;
              else nextStep = 3;

              if (nextStep !== activeStepRef.current) {
                activeStepRef.current = nextStep;
                setActiveStep(nextStep);
              }
            },
          },
        });

        stRef.current = tl.scrollTrigger ?? null;

        // Step 0: Collar
        const s0 = STEPS[0];
        tl.to(zoomEl, {
          xPercent: (50 - s0.x) * s0.scale,
          yPercent: (50 - s0.y) * s0.scale,
          scale: s0.scale,
          duration: 1.2,
          ease: "power2.inOut",
        });
        tl.to({}, { duration: 1.2 }); // Hold stop

        // Step 1: Hooks
        const s1 = STEPS[1];
        tl.to(zoomEl, {
          xPercent: (50 - s1.x) * s1.scale,
          yPercent: (50 - s1.y) * s1.scale,
          scale: s1.scale,
          duration: 1.2,
          ease: "power2.inOut",
        });
        tl.to({}, { duration: 1.2 }); // Hold stop

        // Step 2: Welt
        const s2 = STEPS[2];
        tl.to(zoomEl, {
          xPercent: (50 - s2.x) * s2.scale,
          yPercent: (50 - s2.y) * s2.scale,
          scale: s2.scale,
          duration: 1.2,
          ease: "power2.inOut",
        });
        tl.to({}, { duration: 1.2 }); // Hold stop

        // Step 3: Outsole
        const s3 = STEPS[3];
        tl.to(zoomEl, {
          xPercent: (50 - s3.x) * s3.scale,
          yPercent: (50 - s3.y) * s3.scale,
          scale: s3.scale,
          duration: 1.2,
          ease: "power2.inOut",
        });
        tl.to({}, { duration: 1.2 }); // Hold stop
      });
    },
    { scope: containerRef },
  );

  // Mouse tracking on zoom stage for Optical Loupe
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomStageRef.current) return;
    const rect = zoomStageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const relX = Math.max(0, Math.min(1, x / rect.width));
    const relY = Math.max(0, Math.min(1, y / rect.height));
    setMousePos({ x, y, relX, relY, inside: true });
  };

  const handleMouseLeave = () => {
    setMousePos((prev) => ({ ...prev, inside: false }));
  };

  // Touch tracking for mobile loupe inspection
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!zoomStageRef.current || e.touches.length === 0) return;
    const rect = zoomStageRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const relX = Math.max(0, Math.min(1, x / rect.width));
    const relY = Math.max(0, Math.min(1, y / rect.height));
    setMousePos({ x, y, relX, relY, inside: true });
  };

  return (
    <section ref={containerRef} id="up-close" aria-labelledby="h-close" className="relative mt-sec pt-2">
      <div ref={panelRef} data-zoom-panel className="relative lg:min-h-[calc(100svh-80px)] lg:flex lg:flex-col lg:justify-center">
        {/* Section Header */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6 md:mb-9">
          <div className="max-w-[640px]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-[11px] font-bold tracking-[0.16em] text-brand uppercase shadow-soft">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-brand opacity-75 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
              </span>
              Precision Engineering · Model Nord
            </div>
            <h2 id="h-close" className="text-[clamp(30px,4.5vw,48px)] font-bold tracking-tight text-ink leading-[1.08]">
              Look closer. <em className="font-serif italic font-normal text-brand">Every stitch</em> inspected.
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2 md:text-[16.5px]">
              Scroll to move through each key feature stop, or activate the optical loupe to inspect fine leather grain and stitching.
            </p>
          </div>

          {/* Stepper Arrow Nav */}
          <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 p-1.5 shadow-soft backdrop-blur-md">
            <button
              type="button"
              onClick={() => scrollToStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="inline-flex size-9 items-center justify-center rounded-full text-ink transition-all hover:bg-ink/5 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous component"
            >
              <Icon name="arrow" className="size-3.5 rotate-180" />
            </button>
            <span className="px-2 text-[12.5px] font-bold tracking-wider text-ink tabular-nums">
              0{activeStep + 1} <span className="text-muted font-normal">/</span> 04
            </span>
            <button
              type="button"
              onClick={() => scrollToStep(Math.min(STEPS.length - 1, activeStep + 1))}
              disabled={activeStep === STEPS.length - 1}
              className="inline-flex size-9 items-center justify-center rounded-full text-ink transition-all hover:bg-ink/5 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next component"
            >
              <Icon name="arrow" className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Two-Column Inspection Chamber */}
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,4.6fr)_minmax(0,6.4fr)] lg:gap-12">
          {/* LEFT: Interactive Step Cards */}
          <div className="flex flex-col justify-center">
            {/* Progress Bar */}
            <div className="mb-4 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-muted">
              <span>Component Inspection</span>
              <span className="text-brand tabular-nums">{Math.round(((activeStep + 1) / 4) * 100)}% Complete</span>
            </div>
            <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-ink/8">
              <div
                className="h-full bg-gradient-to-r from-brand via-brand-deep to-brand transition-all duration-400 ease-out"
                style={{ width: `${((activeStep + 1) / 4) * 100}%` }}
              />
            </div>

            {/* Stepper Card List */}
            <div className="space-y-3" role="tablist" aria-label="Footwear craftsmanship details">
              {STEPS.map((s, i) => {
                const isActive = activeStep === i;
                return (
                  <button
                    key={s.title}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => scrollToStep(i)}
                    className={`group relative w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
                      isActive
                        ? "border-brand/40 bg-gradient-to-r from-brand/6 via-white to-brand/3 shadow-[0_12px_28px_-10px_rgba(152,64,128,0.22)] scale-[1.01]"
                        : "border-line bg-white/70 hover:border-ink/25 hover:bg-white hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                            isActive
                              ? "bg-brand text-white shadow-xs scale-105"
                              : "bg-ink/8 text-ink-2 group-hover:bg-ink/15"
                          }`}
                        >
                          0{i + 1}
                        </span>
                        <h3
                          className={`text-[16px] font-bold tracking-tight transition-colors ${
                            isActive ? "text-ink" : "text-ink/80 group-hover:text-ink"
                          }`}
                        >
                          {s.title}
                        </h3>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                          isActive ? "bg-brand/15 text-brand" : "bg-ink/6 text-muted"
                        }`}
                      >
                        {s.badge}
                      </span>
                    </div>

                    <p className="mt-1.5 pl-8.5 text-[13.5px] leading-relaxed text-ink-2">
                      {s.text}
                    </p>

                    {/* Expandable Spec Pill on Active Card */}
                    <div
                      className={`overflow-hidden transition-all duration-300 pl-8.5 ${
                        isActive ? "mt-2.5 max-h-20 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 border-t border-brand/15 pt-2">
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand">
                          <Icon name={s.icon} className="size-3.5" />
                          {s.spec}
                        </span>
                        <span className="text-[11px] text-muted">· {s.benefit}</span>
                      </div>
                    </div>

                    {/* Bottom Progress Accent Line */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-2xl bg-transparent">
                      <div
                        className={`h-full bg-gradient-to-r from-brand to-brand-deep transition-all duration-400 ${
                          isActive ? "w-full" : "w-0"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QuickViewButton
                id={P.id}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white px-5 text-[12.5px] font-bold text-ink shadow-soft transition-all hover:border-ink/40 hover:bg-white hover:shadow-md active:scale-98"
              >
                <Icon name="search" className="size-3.5" />
                <span>See all Nord specs</span>
              </QuickViewButton>
              <OpenInquiryButton className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-[12.5px] font-bold text-white shadow-[0_10px_22px_-8px_rgba(152,64,128,0.5)] transition-all hover:bg-brand-deep hover:shadow-md active:scale-98">
                <span>Request sample pair</span>
                <Icon name="arrow" className="size-3.5" />
              </OpenInquiryButton>
            </div>
          </div>

          {/* RIGHT: Studio Stage with Pinned Zoom, Hotspots, and Loupe Mode */}
          <div className="relative">
            <div
              ref={zoomStageRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseLeave}
              className={`relative aspect-[1.28/1] overflow-hidden rounded-[28px] border border-ink/10 bg-gradient-to-b from-[#fdfdfc] via-[#f5f6f2] to-[#e8ece3] shadow-[0_24px_50px_-15px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] select-none ${
                loupeActive ? "cursor-crosshair" : "cursor-default"
              }`}
            >
              {/* Engineering Corner Grid Crosshairs */}
              <span className="pointer-events-none absolute top-3.5 left-4 text-[11px] font-mono text-ink/25">+</span>
              <span className="pointer-events-none absolute top-3.5 right-4 text-[11px] font-mono text-ink/25">+</span>
              <span className="pointer-events-none absolute bottom-3.5 left-4 text-[11px] font-mono text-ink/25">+</span>
              <span className="pointer-events-none absolute bottom-3.5 right-4 text-[11px] font-mono text-ink/25">+</span>

              {/* Ambient radial lighting glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(152,64,128,0.06),transparent_70%)]" />

              {/* TOP HUD CONTROLS */}
              <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2.5">
                {/* Angle Toggle */}
                <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-white/85 p-1 shadow-soft backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setViewAngle("outer")}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wide transition-all ${
                      viewAngle === "outer"
                        ? "bg-ink text-white shadow-xs"
                        : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    Lateral View
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewAngle("zip")}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wide transition-all ${
                      viewAngle === "zip"
                        ? "bg-ink text-white shadow-xs"
                        : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    Medial Zip
                  </button>
                </div>

                {/* Loupe & Overview Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLoupeActive(!loupeActive)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold tracking-wide transition-all duration-300 ${
                      loupeActive
                        ? "bg-brand text-white shadow-[0_6px_20px_rgba(152,64,128,0.45)] ring-2 ring-brand/40 scale-102"
                        : "border border-ink/10 bg-white/90 text-ink shadow-soft hover:bg-white hover:border-brand/40 hover:text-brand hover:shadow-md"
                    }`}
                  >
                    <Icon name="zoom" className="size-3.5" />
                    <span>{loupeActive ? "Close Loupe" : "Look closer (Loupe)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetToOverview}
                    className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white/85 px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 shadow-soft backdrop-blur-md transition-all hover:bg-white hover:text-ink hover:shadow-xs"
                    title="Reset to full view"
                  >
                    <span>1× Overview</span>
                  </button>
                </div>
              </div>

              {/* CENTER STAGE: The Boot with Transform Zoom */}
              <div className="absolute inset-0 grid place-items-center">
                <div
                  ref={zoomTargetRef}
                  data-zoom
                  className="relative w-[78%] transition-transform duration-500 ease-out will-change-transform"
                  style={{ aspectRatio: `${currentShot.w} / ${currentShot.h}` }}
                >
                  <Image
                    src={currentShot.src}
                    alt={P.desc}
                    fill
                    sizes="(min-width: 1024px) 1200px, 90vw"
                    quality={90}
                    priority
                    className="object-contain drop-shadow-[0_20px_28px_rgba(18,20,22,0.28)]"
                  />

                  {/* Hotspots directly pinned on the boot (hidden during Loupe mode) */}
                  {!loupeActive && viewAngle === "outer" && (
                    <div className="pointer-events-none absolute inset-0 size-full">
                      {STEPS.map((s, i) => {
                        const isSelected = activeStep === i;
                        return (
                          <button
                            key={s.title}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToStep(i);
                            }}
                            className="pointer-events-auto group absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 hover:scale-125 focus:outline-none"
                            style={{ left: `${s.x}%`, top: `${s.y}%` }}
                            aria-label={`Inspect ${s.title}`}
                          >
                            {/* Animated Radar Pulse */}
                            <span
                              className={`absolute -inset-2.5 rounded-full transition-opacity duration-300 ${
                                isSelected
                                  ? "bg-brand/40 animate-ping opacity-100"
                                  : "opacity-0 group-hover:opacity-75 bg-brand/25"
                              }`}
                            />
                            {/* Hotspot Core Dot */}
                            <span
                              className={`relative flex size-6.5 items-center justify-center rounded-full border-2 transition-all duration-300 shadow-md backdrop-blur-sm ${
                                isSelected
                                  ? "border-white bg-brand text-white scale-110 shadow-[0_0_16px_rgba(152,64,128,0.7)]"
                                  : "border-ink/20 bg-white/95 text-ink hover:border-brand hover:text-brand"
                              }`}
                            >
                              <span className="text-[10px] font-bold">0{i + 1}</span>
                            </span>

                            {/* Floating Tooltip */}
                            <span
                              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-bold shadow-soft transition-all duration-200 ${
                                isSelected
                                  ? "bg-brand text-white opacity-100 -translate-y-1"
                                  : "bg-ink/90 text-white opacity-0 group-hover:opacity-100 group-hover:-translate-y-1"
                              }`}
                            >
                              {s.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* OPTICAL LOUPE: Magnifying Glass Lens overlay */}
              {loupeActive && mousePos.inside && (
                <div
                  className="pointer-events-none absolute z-30 size-44 rounded-full border-2 border-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_0_1px_rgba(18,20,22,0.15)] ring-4 ring-brand/20 overflow-hidden backdrop-blur-xs transition-transform duration-75 ease-out"
                  style={{
                    left: `${mousePos.x}px`,
                    top: `${mousePos.y}px`,
                    transform: "translate(-50%, -50%)",
                    backgroundImage: `url(${currentShot.src})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${(zoomStageRef.current?.clientWidth ?? 600) * 3.6}px ${(zoomStageRef.current?.clientHeight ?? 460) * 3.6}px`,
                    backgroundPosition: `${mousePos.relX * 100}% ${mousePos.relY * 100}%`,
                  }}
                >
                  {/* Optical Crosshair Reticle */}
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="size-full border border-black/10 rounded-full" />
                    <div className="absolute h-full w-px bg-brand/35" />
                    <div className="absolute w-full h-px bg-brand/35" />
                    <div className="size-3.5 rounded-full border border-brand/60 bg-brand/10" />
                  </div>

                  {/* Glass Reflection Highlight */}
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/15 to-white/35" />

                  {/* Lens Spec Badge */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-white uppercase backdrop-blur-md shadow-xs">
                    3.6× Macro
                  </div>
                </div>
              )}

              {/* BOTTOM HUD SPEC CAPSULE */}
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2.5">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/90 bg-white/90 px-3.5 py-1.5 shadow-soft backdrop-blur-md">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[12px] font-bold text-ink">
                    {STEPS[activeStep].title}
                  </span>
                  <span className="text-black/15">·</span>
                  <span className="text-[11.5px] font-medium text-ink-2 max-sm:hidden">
                    {STEPS[activeStep].spec}
                  </span>
                </div>

                <div className="pointer-events-auto rounded-full border border-ink/8 bg-white/80 px-3 py-1 text-[11px] font-bold text-ink-2 shadow-xs backdrop-blur-md">
                  Cold Rating −25°C
                </div>
              </div>
            </div>

            {/* Quick Zoom Preset Buttons */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted mr-1">
                  Preset focus:
                </span>
                {STEPS.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => scrollToStep(i)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      activeStep === i
                        ? "bg-brand text-white shadow-xs"
                        : "bg-white/80 text-ink-2 hover:bg-white hover:text-ink"
                    }`}
                  >
                    0{i + 1} {s.badge}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-medium text-muted">
                Move cursor over boot to inspect
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
