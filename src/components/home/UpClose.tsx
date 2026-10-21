"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap } from "@/lib/gsap";
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
    text: "A padded wool herringbone collar where the boot meets the leg: warm, and soft against the ankle.",
    spec: "Wool herringbone · padded collar",
    benefit: "Lined with a shearling blend",
    badge: "Collar",
    icon: "layers",
    x: 22,
    y: 22,
    scale: 2.45,
  },
  {
    title: "Metal lacing hooks",
    text: "Metal speed hooks over the instep for quick, even lacing, with a side zip to get the boot on and off.",
    spec: "Metal hooks · laces + side zip",
    benefit: "On and off in seconds",
    badge: "Closure",
    icon: "shield",
    x: 42,
    y: 23,
    scale: 2.5,
  },
  {
    title: "Stitched, sealed welt",
    text: "The full-grain leather upper is stitched to the sole and the seam sealed, to keep slush out.",
    spec: "Stitched welt · sealed seam",
    benefit: "Full-grain leather upper",
    badge: "Welt",
    icon: "boot",
    x: 74,
    y: 77,
    scale: 2.65,
  },
  {
    title: "Rubber lug outsole",
    text: "6 mm rubber lugs for grip on packed snow and wet pavements.",
    spec: "Rubber lug · 6 mm",
    benefit: "Rated to −25°C",
    badge: "Outsole",
    icon: "sole",
    x: 44,
    y: 91,
    scale: 2.35,
  },
];

/**
 * Signature moment: Chime Long Nord up close. The section scrolls normally; the camera
 * only moves when a point is picked (hotspot, detail card, chip or arrows).
 * Also: optical magnifying loupe and angle toggling.
 */
export function UpClose() {
  const zoomStageRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);

  // null = full view of the boot, no point in focus
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [viewAngle, setViewAngle] = useState<"outer" | "zip">("outer");
  const [loupeActive, setLoupeActive] = useState<boolean>(false);
  // the stage size rides along with the pointer, so the loupe never reads the DOM during render
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, relX: 0.5, relY: 0.5, w: 600, h: 460, inside: false });

  const currentShot = viewAngle === "outer" ? P.outer : P.zip ?? P.outer;
  const current = activeStep === null ? null : STEPS[activeStep];

  // Manual smooth zoom application
  const applyZoomToTarget = useCallback((xPercent: number, yPercent: number, scale: number, duration = 0.75) => {
    if (!zoomTargetRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(zoomTargetRef.current, {
      xPercent,
      yPercent,
      scale,
      duration: reduced ? 0 : duration,
      ease: "power2.inOut",
      overwrite: "auto",
    });
  }, []);

  const resetToOverview = useCallback(() => {
    setActiveStep(null);
    applyZoomToTarget(0, 0, 1, 0.6);
  }, [applyZoomToTarget]);

  // Zoom the camera onto one point; picking the point already in focus pulls back out
  const focusStep = useCallback(
    (index: number) => {
      if (index === activeStep) {
        resetToOverview();
        return;
      }
      const step = STEPS[index];
      // hotspot coordinates are mapped on the lateral shot, and the loupe reads the unzoomed image
      setViewAngle("outer");
      setLoupeActive(false);
      setActiveStep(index);
      applyZoomToTarget((50 - step.x) * step.scale, (50 - step.y) * step.scale, step.scale);
    },
    [activeStep, applyZoomToTarget, resetToOverview],
  );

  useEffect(() => {
    const el = zoomTargetRef.current;
    return () => {
      if (el) gsap.killTweensOf(el);
    };
  }, []);

  // Mouse tracking on zoom stage for Optical Loupe
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomStageRef.current) return;
    const rect = zoomStageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const relX = Math.max(0, Math.min(1, x / rect.width));
    const relY = Math.max(0, Math.min(1, y / rect.height));
    setMousePos({ x, y, relX, relY, w: rect.width, h: rect.height, inside: true });
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
    setMousePos({ x, y, relX, relY, w: rect.width, h: rect.height, inside: true });
  };

  return (
    <section id="up-close" aria-labelledby="h-close" className="relative mt-sec pt-2">
      <div className="relative">
        {/* Section Header */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6 md:mb-9">
          <div className="max-w-[640px]">
<p className="eyebrow mb-3">Up close · Chime Long Nord</p>
            <h2 id="h-close" className="type-section">
              Look closer. <em>Every stitch</em> inspected.
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2 md:text-[16.5px]">
              Tap a point on the boot to zoom in, or switch on the loupe to see the leather grain up close.
            </p>
          </div>

          {/* Stepper Arrow Nav */}
          <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 p-1.5 shadow-soft backdrop-blur-md">
            <button
              type="button"
              onClick={() => activeStep !== null && focusStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === null || activeStep === 0}
              className="inline-flex size-9 items-center justify-center rounded-full text-ink transition-all hover:bg-ink/5 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous component"
            >
              <Icon name="arrow" className="size-3.5 rotate-180" />
            </button>
            <span className="px-2 text-[12.5px] font-bold tracking-wider text-ink tabular-nums">
              {activeStep === null ? "--" : `0${activeStep + 1}`} <span className="text-muted font-normal">/</span> 04
            </span>
            <button
              type="button"
              onClick={() => focusStep(activeStep === null ? 0 : Math.min(STEPS.length - 1, activeStep + 1))}
              disabled={activeStep === STEPS.length - 1}
              className="inline-flex size-9 items-center justify-center rounded-full text-ink transition-all hover:bg-ink/5 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next component"
            >
              <Icon name="arrow" className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Two-Column Inspection Chamber */}
        <div data-upclose className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,4.6fr)_minmax(0,6.4fr)] lg:gap-12">
          {/* LEFT: Interactive Step Cards */}
          <div className="flex flex-col justify-center">
            {/* Progress Bar */}
            <div className="mb-4 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-muted">
              <span>The details</span>
              <span className="text-brand tabular-nums">
                {activeStep === null ? "Full view" : `${activeStep + 1} / ${STEPS.length}`}
              </span>
            </div>
            <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-ink/8">
              <div
                className="h-full bg-gradient-to-r from-brand via-brand-deep to-brand transition-all duration-400 ease-out"
                style={{ width: `${(((activeStep ?? -1) + 1) / STEPS.length) * 100}%` }}
              />
            </div>

            {/* Stepper Card List */}
            <div className="space-y-3" role="tablist" aria-label="Details of Chime Long Nord">
              {STEPS.map((s, i) => {
                const isActive = activeStep === i;
                return (
                  <button
                    key={s.title}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => focusStep(i)}
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
                    aria-pressed={viewAngle === "outer"}
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
                    onClick={() => {
                      // the zip shot has no mapped points, so show it whole
                      setViewAngle("zip");
                      resetToOverview();
                    }}
                    aria-pressed={viewAngle === "zip"}
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
                    onClick={() => {
                      // the loupe magnifies the unzoomed image, so pull the camera back first
                      if (!loupeActive) resetToOverview();
                      setLoupeActive(!loupeActive);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold tracking-wide transition-all duration-300 ${
                      loupeActive
                        ? "bg-brand text-white shadow-[0_6px_20px_rgba(152,64,128,0.45)] ring-2 ring-brand/40 scale-102"
                        : "border border-ink/10 bg-white/90 text-ink shadow-soft hover:bg-white hover:border-brand/40 hover:text-brand hover:shadow-md"
                    }`}
                  >
                    <Icon name="zoom" className="size-3.5" />
                    <span>{loupeActive ? "Close loupe" : "Loupe"}</span>
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
                  className="relative w-[78%] will-change-transform"
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
                              focusStep(i);
                            }}
                            className="pointer-events-auto group absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 hover:scale-125 focus:outline-none"
                            style={{ left: `${s.x}%`, top: `${s.y}%` }}
                            aria-label={isSelected ? `Back to full view from ${s.title}` : `Zoom in on ${s.title}`}
                            aria-pressed={isSelected}
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

                            {/* name tag, kept on the inner side of hotspots near an edge */}
                            <span
                              className={`pointer-events-none absolute -top-7 whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-bold shadow-soft transition-all duration-200 ${s.x > 62 ? "right-0" : s.x < 38 ? "left-0" : "left-1/2 -translate-x-1/2"} ${
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
                    backgroundSize: `${mousePos.w * 3.6}px ${mousePos.h * 3.6}px`,
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
                    {current ? current.title : "Full view"}
                  </span>
                  <span className="text-black/15">·</span>
                  <span className="text-[11.5px] font-medium text-ink-2 max-sm:hidden">
                    {current ? current.spec : "Tap a point to zoom in"}
                  </span>
                </div>

                <div className="pointer-events-auto rounded-full border border-ink/8 bg-white/80 px-3 py-1 text-[11px] font-bold text-ink-2 shadow-xs backdrop-blur-md">
                  Rated −25°C
                </div>
              </div>
            </div>

            {/* Quick Zoom Preset Buttons */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => focusStep(i)}
                    aria-pressed={activeStep === i}
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
