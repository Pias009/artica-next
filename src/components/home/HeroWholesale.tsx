"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import {
  categoryOf,
  CASE_PACK,
  LINE_LABEL,
  MOQ_CASES,
  MOQ_PAIRS,
  PACK,
  products,
  type Product,
  type ProductLine,
} from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

// Curate 15 distinct high-quality styles across Men, Women, and Kids
const ALL_HERO_SHOES: Product[] = products.slice(0, 15);
const AUTOPLAY_MS = 4600;

type CategoryFilter = "all" | ProductLine;

export function HeroWholesale() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [activeId, setActiveId] = useState<string>(ALL_HERO_SHOES[0]?.id || "p04");
  const [isPaused, setIsPaused] = useState(false);
  const [viewAngle, setViewAngle] = useState<"outer" | "zip">("outer");
  const [mouseTilt, setMouseTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const openQuickView = useUI((s) => s.openQuickView);
  const toggleInquiry = useInquiry((s) => s.toggle);
  const shelfRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filtered shoes based on selected category pill
  const visibleShoes =
    filter === "all"
      ? ALL_HERO_SHOES
      : ALL_HERO_SHOES.filter((p) => p.line === filter);

  // Ensure current active shoe is valid within visible shoes
  const activeShoe =
    visibleShoes.find((p) => p.id === activeId) || visibleShoes[0] || ALL_HERO_SHOES[0];

  const inCart = useInCart(activeShoe?.id ?? "");
  const activeIdx = visibleShoes.findIndex((p) => p.id === activeShoe.id);

  // Auto-scroll the bottom 3D shelf to keep the active shoe centered
  useEffect(() => {
    if (!shelfRef.current) return;
    const activeEl = shelfRef.current.querySelector<HTMLElement>(`[data-shoe-id="${activeShoe.id}"]`);
    if (activeEl) {
      const container = shelfRef.current;
      const left = activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeShoe.id]);

  // Next / Previous shoe rotation handlers
  const advanceShoe = useCallback(
    (direction: 1 | -1 = 1) => {
      if (visibleShoes.length <= 1) return;
      const currentIdx = visibleShoes.findIndex((p) => p.id === activeShoe.id);
      const nextIdx = (currentIdx + direction + visibleShoes.length) % visibleShoes.length;
      setActiveId(visibleShoes[nextIdx].id);
      setViewAngle("outer");
    },
    [visibleShoes, activeShoe.id],
  );

  // Continuous auto-play loop
  useEffect(() => {
    if (isPaused) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      return;
    }

    autoPlayTimer.current = setInterval(() => {
      advanceShoe(1);
    }, AUTOPLAY_MS);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPaused, advanceShoe]);

  // Select a shoe manually from the bottom shelf
  const handleSelectShoe = (id: string) => {
    setActiveId(id);
    setViewAngle("outer");
  };

  // Change category filter
  const handleFilterChange = (cat: CategoryFilter) => {
    setFilter(cat);
    const subset = cat === "all" ? ALL_HERO_SHOES : ALL_HERO_SHOES.filter((p) => p.line === cat);
    if (subset.length > 0) {
      setActiveId(subset[0].id);
      setViewAngle("outer");
    }
  };

  // 3D Mouse Parallax Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
    setMouseTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  const currentShot =
    viewAngle === "zip" && activeShoe.zip ? activeShoe.zip : activeShoe.outer;

  const caseRatio = CASE_PACK[activeShoe.line] || [];

  return (
    <section
      id="hero"
      aria-label="3D Wholesale Footwear Showroom"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bleed relative isolate overflow-hidden border-b border-ink/8 bg-gradient-to-b from-[#ffffff] via-[#f8fafb] to-[#ecf1f4] text-ink select-none"
    >
      {/* 3D Atmospheric depth lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(215,228,240,0.6),transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white/80 to-transparent"
      />

      <div className="wrap relative flex flex-col justify-between px-(--shell-pad) pt-5 pb-5 lg:min-h-[min(calc(100svh-100px),880px)]">
        {/* TOP BAR: Minimal headline & category options */}
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Short Headline & Wholesale Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-headline text-[22px] sm:text-[28px] font-semibold tracking-[-0.02em] text-ink">
              Factory-Direct Winter Boots
            </h1>
            <span className="hidden h-3.5 w-px bg-ink/15 sm:inline-block" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/85 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-ink-2 uppercase backdrop-blur-sm shadow-2xs">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              <span>FW26 Showroom · MOQ {MOQ_PAIRS} Pairs</span>
            </div>
          </div>

          {/* Category Option Pills + Fast Line Sheet CTA */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="tablist"
              aria-label="Filter by line"
              className="inline-flex items-center rounded-full border border-ink/10 bg-white/90 p-1 shadow-xs backdrop-blur-md"
            >
              {(["all", "women", "men", "kids"] as CategoryFilter[]).map((cat) => {
                const isSelected = filter === cat;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleFilterChange(cat)}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold capitalize transition-all duration-300 ease-soft ${
                      isSelected
                        ? "bg-ink text-white shadow-xs"
                        : "text-ink-2 hover:bg-tile hover:text-ink"
                    }`}
                  >
                    {cat === "all" ? `All (${ALL_HERO_SHOES.length})` : LINE_LABEL[cat]}
                  </button>
                );
              })}
            </div>

            <OpenInquiryButton className="inline-flex h-8.5 items-center gap-1.5 rounded-full bg-ink px-4 text-[11.5px] font-bold tracking-[0.06em] text-white uppercase shadow-sm transition-all hover:bg-ink-hover hover:shadow-md">
              <span>Request Line Sheet</span>
              <Icon name="arrow" className="size-3" />
            </OpenInquiryButton>
          </div>
        </div>

        {/* MAIN STAGE: 3-COLUMN SPATIAL SHOWROOM (LEFT SPECS + CENTER 3D SHOE + RIGHT PACKING) */}
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative my-2 grid flex-1 items-center gap-4 lg:grid-cols-[270px_minmax(0,1fr)_270px] xl:grid-cols-[300px_minmax(0,1fr)_300px] [perspective:1400px]"
        >
          {/* LEFT COLUMN: Craft, Materials & Cold-Weather Anatomy (Chromatic 3D Optical Glass) */}
          <div
            style={{
              transform: `perspective(1000px) rotateY(${mouseTilt.x * 0.35 + 7}deg) rotateX(${mouseTilt.y * 0.35}deg) translateZ(22px)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="group order-2 flex flex-col gap-3 max-lg:hidden lg:order-1"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/80 p-4.5 backdrop-blur-2xl ring-1 ring-cyan-300/35 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.98),_inset_1.5px_0_3px_rgba(56,189,248,0.45),_inset_-1.5px_0_3px_rgba(236,72,153,0.35),_inset_0_-1.5px_2px_rgba(147,51,234,0.3),_0_24px_50px_-12px_rgba(18,20,22,0.16),_0_0_24px_-2px_rgba(56,189,248,0.22),_0_0_32px_-4px_rgba(217,70,239,0.16)] transition-all duration-300 hover:shadow-[inset_0_2px_3px_rgba(255,255,255,1),_0_28px_56px_-10px_rgba(18,20,22,0.22),_0_0_30px_rgba(56,189,248,0.3)]">
              {/* Chromatic color reflection gradients (Cyan & Fuchsia Caustics) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 -left-12 size-48 rounded-full bg-gradient-to-br from-cyan-400/35 via-sky-300/22 to-transparent blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-12 -right-12 size-48 rounded-full bg-gradient-to-tl from-fuchsia-500/30 via-purple-400/22 to-transparent blur-2xl"
              />
              {/* Prismatic glass body tint */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65)_0%,rgba(186,230,253,0.22)_28%,rgba(244,214,249,0.18)_60%,rgba(255,255,255,0.45)_100%)]"
              />
              {/* Specular glass glare reflection sheen */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-16 size-36 rounded-full bg-white/50 blur-xl"
              />

              <div className="relative z-10 flex items-center justify-between border-b border-white/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-6.5 place-items-center rounded-full bg-white/75 text-brand shadow-xs border border-white/90 ring-1 ring-cyan-200/50">
                    <Icon name="layers" className="size-3.5" />
                  </span>
                  <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-ink drop-shadow-2xs">
                    Technical Anatomy
                  </span>
                </div>
                {activeShoe.rating && (
                  <span className="rounded-md border border-brand/25 bg-gradient-to-r from-brand-soft to-purple-100/80 px-2 py-0.5 text-[11px] font-bold text-brand shadow-2xs backdrop-blur-sm">
                    {activeShoe.rating}
                  </span>
                )}
              </div>

              {/* Material Specs */}
              <div className="relative z-10 mt-3 flex flex-col gap-2">
                <div className="rounded-xl border border-white/70 bg-gradient-to-r from-white/55 via-white/40 to-sky-50/35 p-2.5 text-left backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),_0_2px_8px_-2px_rgba(56,189,248,0.1)] transition-all hover:bg-white/70 hover:border-cyan-200/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <Icon name="drop" className="size-3 text-cyan-600" />
                    <span>Upper Construction</span>
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink leading-snug">
                    {activeShoe.materials.find((m) => m.label === "Upper")?.value || activeShoe.spec}
                  </p>
                </div>

                <div className="rounded-xl border border-white/70 bg-gradient-to-r from-white/55 via-white/40 to-purple-50/35 p-2.5 text-left backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),_0_2px_8px_-2px_rgba(217,70,239,0.1)] transition-all hover:bg-white/70 hover:border-fuchsia-200/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <Icon name="snow" className="size-3 text-brand" />
                    <span>Thermal Protection</span>
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink leading-snug">
                    {activeShoe.materials.find((m) => m.label === "Lining")?.value || "Insulated Winter Lining"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/70 bg-gradient-to-r from-white/55 via-white/40 to-sky-50/35 p-2.5 text-left backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),_0_2px_8px_-2px_rgba(56,189,248,0.1)] transition-all hover:bg-white/70 hover:border-cyan-200/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <Icon name="sole" className="size-3 text-cyan-600" />
                    <span>Outsole Grip</span>
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink leading-snug">
                    {activeShoe.materials.find((m) => m.label === "Outsole")?.value || "High-Traction Lug Sole"}
                  </p>
                </div>
              </div>

              {/* Quality Seal */}
              <div className="relative z-10 mt-3 flex items-center gap-2 border-t border-white/60 pt-2.5 text-[11px] text-muted">
                <Icon name="shield" className="size-3.5 text-brand" />
                <span>100% Pre-Ship QC · &lt;0.4% Defect Rate</span>
              </div>
            </div>
          </div>

          {/* CENTER 3D POP-UP STAGE: Heroic Shoe with 3D Mouse Parallax */}
          <div className="order-1 flex flex-col items-center justify-center lg:order-2">
            <div
              style={{
                transform: `rotateX(${mouseTilt.y}deg) rotateY(${mouseTilt.x}deg)`,
                transformStyle: "preserve-3d",
                transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className="relative flex w-full max-w-[560px] flex-col items-center justify-center"
            >
              {/* Pop-up Shoe Header Pill */}
              <div className="z-10 -mb-2 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 px-4 py-1.5 shadow-xs backdrop-blur-md">
                <span className="text-[12px] font-bold text-brand uppercase tracking-wider">
                  {LINE_LABEL[activeShoe.line]}
                </span>
                <span className="size-1 rounded-full bg-ink/20" />
                <span className="text-[15px] font-bold tracking-tight text-ink">
                  {activeShoe.name}
                </span>
                <span className="text-[12px] text-muted hidden sm:inline">
                  · {categoryOf(activeShoe)}
                </span>
              </div>

              {/* Center Shoe Cutout with Pop-Up Animation */}
              <div className="relative flex aspect-[1.32] w-[min(90vw,520px)] items-center justify-center">
                {/* 3D Ground Shadow & Pedestal Glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[6%] left-1/2 h-[18%] w-[80%] -translate-x-1/2 rounded-[50%] bg-radial from-ink/30 via-ink/10 to-transparent blur-[16px] transition-all duration-500"
                />

                <div
                  key={`${activeShoe.id}-${viewAngle}`}
                  className="relative size-full animate-[shoe-pop-up_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Image
                    src={currentShot.src}
                    alt={`${activeShoe.name} boot - ${activeShoe.desc}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 520px, 90vw"
                    className="object-contain drop-shadow-[0_24px_32px_rgba(18,20,22,0.22)]"
                  />
                </div>

                {/* Outer Profile vs Zip Angle Switcher */}
                {activeShoe.zip && (
                  <div className="absolute right-2 bottom-3 z-20 flex items-center gap-1 rounded-full border border-ink/10 bg-white/90 p-0.5 shadow-xs backdrop-blur-md text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewAngle("outer")}
                      className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                        viewAngle === "outer" ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewAngle("zip")}
                      className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                        viewAngle === "zip" ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      Hardware
                    </button>
                  </div>
                )}
              </div>

              {/* Center Shoe Quick Action Bar */}
              <div className="z-10 mt-1 flex flex-wrap items-center justify-center gap-2.5">
                <span className="text-[12px] font-medium text-ink-2">
                  <b>{MOQ_PAIRS} pairs</b> MOQ ({MOQ_CASES} cs) · {PACK} pr/case · {activeShoe.sizes}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleInquiry(activeShoe.id)}
                    aria-pressed={inCart}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-bold tracking-[0.04em] uppercase shadow-xs transition-all duration-200 ${
                      inCart ? "bg-brand text-white" : "bg-ink text-white hover:bg-ink-hover"
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Icon name="check" className="size-3" />
                        <span>In List ({MOQ_CASES} cs)</span>
                      </>
                    ) : (
                      <>
                        <Icon name="plus" className="size-3" />
                        <span>Add to List</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openQuickView(activeShoe.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-ink/15 bg-white px-3 text-[11.5px] font-semibold text-ink transition-colors hover:border-ink hover:bg-tile"
                  >
                    <span>Specs</span>
                    <Icon name="arrow" className="size-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Wholesale Case Pack & Production Matrix (Chromatic 3D Optical Glass) */}
          <div
            style={{
              transform: `perspective(1000px) rotateY(${mouseTilt.x * 0.35 - 7}deg) rotateX(${mouseTilt.y * 0.35}deg) translateZ(22px)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="group order-3 flex flex-col gap-3 max-lg:hidden"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/80 p-4.5 backdrop-blur-2xl ring-1 ring-purple-300/35 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.98),_inset_1.5px_0_3px_rgba(236,72,153,0.35),_inset_-1.5px_0_3px_rgba(56,189,248,0.45),_inset_0_-1.5px_2px_rgba(147,51,234,0.3),_0_24px_50px_-12px_rgba(18,20,22,0.16),_0_0_24px_-2px_rgba(217,70,239,0.2),_0_0_32px_-4px_rgba(56,189,248,0.16)] transition-all duration-300 hover:shadow-[inset_0_2px_3px_rgba(255,255,255,1),_0_28px_56px_-10px_rgba(18,20,22,0.22),_0_0_30px_rgba(217,70,239,0.28)]">
              {/* Chromatic color reflection gradients (Fuchsia & Ice Cyan Caustics) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-gradient-to-bl from-purple-400/35 via-fuchsia-300/22 to-transparent blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-gradient-to-tr from-cyan-400/30 via-teal-300/20 to-transparent blur-2xl"
              />
              {/* Prismatic glass body tint */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65)_0%,rgba(244,214,249,0.22)_28%,rgba(186,230,253,0.18)_60%,rgba(255,255,255,0.45)_100%)]"
              />
              {/* Specular glass glare reflection sheen */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -left-16 size-36 rounded-full bg-white/50 blur-xl"
              />

              <div className="relative z-10 flex items-center justify-between border-b border-white/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-6.5 place-items-center rounded-full bg-white/75 text-brand shadow-xs border border-white/90 ring-1 ring-purple-200/50">
                    <Icon name="box" className="size-3.5" />
                  </span>
                  <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-ink drop-shadow-2xs">
                    Case Pack Matrix
                  </span>
                </div>
                <span className="rounded-md border border-brand/20 bg-white/60 px-2 py-0.5 text-[11px] font-bold text-brand backdrop-blur-sm shadow-2xs">
                  12 Pairs / Case
                </span>
              </div>

              {/* Case Size Ratio Bar */}
              <div className="relative z-10 mt-3">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                  <span>Pre-Packed Size Curve</span>
                  <span className="font-semibold text-ink">{activeShoe.sizes}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {caseRatio.map(([sz, qty]) => (
                    <div
                      key={sz}
                      className="flex-1 rounded-lg border border-white/70 bg-gradient-to-b from-white/60 via-white/40 to-purple-50/30 py-1.5 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),_0_2px_6px_-2px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-all hover:bg-white/80 hover:border-purple-200"
                    >
                      <p className="text-[10px] text-muted font-medium">{sz}</p>
                      <p className="text-[12px] font-bold text-ink">{qty}x</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wholesale Production Milestones */}
              <div className="relative z-10 mt-3 flex flex-col gap-1.5 border-t border-white/60 pt-2.5">
                <div className="flex items-center justify-between text-[11.5px] rounded-lg px-2.5 py-1.5 bg-gradient-to-r from-white/50 via-white/35 to-sky-50/30 border border-white/60 backdrop-blur-sm shadow-[0_2px_6px_-2px_rgba(56,189,248,0.08)]">
                  <span className="text-muted">Minimum Order</span>
                  <span className="font-semibold text-ink">{MOQ_CASES} cases ({MOQ_PAIRS} prs)</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] rounded-lg px-2.5 py-1.5 bg-gradient-to-r from-white/50 via-white/35 to-purple-50/30 border border-white/60 backdrop-blur-sm shadow-[0_2px_6px_-2px_rgba(217,70,239,0.08)]">
                  <span className="text-muted">Sample Lead Time</span>
                  <span className="font-semibold text-ink">10 Days Dispatch</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] rounded-lg px-2.5 py-1.5 bg-gradient-to-r from-white/50 via-white/35 to-pink-50/30 border border-white/60 backdrop-blur-sm shadow-[0_2px_6px_-2px_rgba(236,72,153,0.08)]">
                  <span className="text-muted">Private Label (OEM)</span>
                  <span className="font-semibold text-brand">From 600 pairs</span>
                </div>
              </div>

              {/* Shipping Note */}
              <div className="relative z-10 mt-3 flex items-center gap-2 border-t border-white/60 pt-2.5 text-[11px] text-muted">
                <Icon name="truck" className="size-3.5 text-cyan-600" />
                <span>Door-to-Door DDP Freight · US & Canada</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM 3D CURVED SHOES RAIL (CURVED PERSPECTIVE ARC WITH 15 SHOES) */}
        <div className="relative z-10 mt-2 pt-1">
          {/* Rail Header with Auto-play indicator & Left/Right Chevrons */}
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            <div className="flex items-center gap-2">
              <span className="text-ink">3D Curved Showroom</span>
              <span className="text-ink/30">·</span>
              <span>{visibleShoes.length} Handcrafted Styles</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Prev / Next Chevrons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => advanceShoe(-1)}
                  aria-label="Previous shoe"
                  className="grid size-6.5 place-items-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-2xs transition-all hover:bg-white hover:scale-105"
                >
                  <Icon name="arrow" className="size-2.5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => advanceShoe(1)}
                  aria-label="Next shoe"
                  className="grid size-6.5 place-items-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-2xs transition-all hover:bg-white hover:scale-105"
                >
                  <Icon name="arrow" className="size-2.5" />
                </button>
              </div>

              <span className="h-3 w-px bg-ink/15" />

              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={() => setIsPaused((v) => !v)}
                aria-label={isPaused ? "Play rotation" : "Pause rotation"}
                className="grid size-6.5 place-items-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-2xs hover:bg-white"
              >
                <Icon name={isPaused ? "play" : "pause"} className="size-2.5" />
              </button>
            </div>
          </div>

          {/* 3D U-Shaped Curved Platform Shell */}
          <div className="relative w-full [perspective:1400px]">
            {/* U-Shape 3D Cradle Track / Ribbon Underneath */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2 bottom-1 h-32 overflow-hidden"
            >
              {/* U-Shaped illuminated floor surface & glowing edge line */}
              <svg
                viewBox="0 0 1000 130"
                preserveAspectRatio="none"
                className="size-full opacity-85"
              >
                <defs>
                  <linearGradient id="uCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#984080" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="uFloorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
                    <stop offset="50%" stopColor="rgba(240,247,252,0.6)" />
                    <stop offset="100%" stopColor="rgba(240,247,252,0)" />
                  </linearGradient>
                </defs>
                {/* U-Shaped Floor Surface */}
                <path d="M 0,22 Q 500,122 1000,22 L 1000,130 L 0,130 Z" fill="url(#uFloorGrad)" />
                {/* U-Shaped Glowing Neon Edge Line */}
                <path d="M 0,22 Q 500,122 1000,22" fill="none" stroke="url(#uCurveGrad)" strokeWidth="3.5" />
                <path d="M 0,22 Q 500,122 1000,22" fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.95" />
              </svg>
              {/* Ambient U-curve glow */}
              <div className="absolute inset-x-12 bottom-3 h-12 rounded-[50%] bg-gradient-to-r from-cyan-400/25 via-brand/35 to-fuchsia-400/25 blur-xl" />
            </div>

            {/* The U-Shaped 3D Shoe Shelf Track */}
            <div
              ref={shelfRef}
              tabIndex={0}
              role="region"
              aria-label="3D U-Shaped curved shoe shelf"
              className="no-scrollbar flex w-full items-center gap-4 overflow-x-auto scroll-smooth pt-12 pb-7 px-8 focus:outline-none"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {visibleShoes.map((shoe, idx) => {
                const isActive = shoe.id === activeShoe.id;
                // Calculate distance from active shoe to form an unmistakable U-shape
                const diff = idx - activeIdx;
                // Pronounced 3D inward rotation: items turn inward to face the center of the U
                const rotY = Math.max(-38, Math.min(38, diff * 12));
                // 3D Z-depth: active item is prominent forward
                const transZ = isActive ? 45 : -Math.min(50, Math.abs(diff) * 10);
                // U-SHAPE VERTICAL CURVE: center dips down (+24px), sides curve UPWARDS (-44px) like the wings of a U
                const transY = 24 - Math.min(68, Math.pow(Math.abs(diff), 1.55) * 8.5);
                // Progressive scale perspective
                const scale = isActive ? 1.15 : Math.max(0.82, 1 - Math.abs(diff) * 0.04);
                // Dynamic layer ordering so center item always sits in front
                const zIndex = 30 - Math.min(25, Math.abs(diff));

                return (
                  <button
                    key={shoe.id}
                    type="button"
                    data-shoe-id={shoe.id}
                    onClick={() => handleSelectShoe(shoe.id)}
                    aria-pressed={isActive}
                    style={{
                      transform: `perspective(1000px) rotateY(${rotY}deg) translateZ(${transZ}px) translateY(${transY}px) scale(${scale})`,
                      transformStyle: "preserve-3d",
                      zIndex,
                      width: "clamp(90px, 8.8vw, 118px)",
                    }}
                    className={`group relative flex-none rounded-2xl transition-all duration-300 ease-soft focus:outline-none ${
                      isActive ? "opacity-100" : "opacity-82 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    {/* Animated Colorful Gradient Border Container */}
                    <div
                      className={`relative p-[2.5px] rounded-2xl transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-brand via-cyan-400 via-fuchsia-500 via-amber-300 to-brand bg-[length:300%_300%] animate-[border-flow_3.5s_linear_infinite] shadow-[0_16px_36px_-6px_rgba(152,64,128,0.5),_0_0_22px_rgba(56,189,248,0.38)]"
                          : "bg-white/80 hover:bg-gradient-to-r hover:from-cyan-300 hover:via-purple-300 hover:to-amber-200 hover:bg-[length:200%_200%] hover:animate-[border-flow_4s_linear_infinite] border border-ink/8 shadow-2xs"
                      }`}
                    >
                      {/* Inner White Plinth Box */}
                      <div className="relative flex aspect-square w-full flex-col items-center justify-center rounded-[13px] bg-white p-2">
                        {/* Shoe Image */}
                        <div className="relative size-full transition-transform duration-300 group-hover:scale-108">
                          <Image
                            src={shoe.outer.src}
                            alt={shoe.name}
                            fill
                            sizes="118px"
                            className="object-contain drop-shadow-sm"
                          />
                        </div>

                        {/* Active Progress Bar Timer */}
                        {isActive && !isPaused && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-2.5 bottom-1 h-0.5 overflow-hidden rounded-full bg-ink/10"
                          >
                            <span
                              key={activeShoe.id}
                              className="block h-full origin-left bg-gradient-to-r from-brand to-cyan-400"
                              style={{
                                animation: `spot-progress ${AUTOPLAY_MS}ms linear both`,
                              }}
                            />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shoe Label */}
                    <div className="mt-1.5 text-center">
                      <p
                        className={`text-[11.5px] font-bold truncate leading-tight transition-colors ${
                          isActive ? "text-brand drop-shadow-2xs" : "text-ink"
                        }`}
                      >
                        {shoe.name}
                      </p>
                      <p className="text-[10px] text-muted truncate">
                        {LINE_LABEL[shoe.line]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
