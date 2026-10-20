"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import {
  categoryOf,
  getProduct,
  LINE_LABEL,
  MOQ_PAIRS,
  PACK,
  type Product,
  type ProductLine,
} from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

const NEW_ARRIVAL_SLUGS = [
  "tundra",
  "pop",
  "zinnia",
  "lynx",
  "toffee",
  "frost",
  "blossom",
  "bluebell",
];

const AUTOPLAY_MS = 5000;

type CategoryFilter = "all" | ProductLine;

/** Category display configuration tailored for professional wholesale presentation */
export const CATEGORY_CONFIG: Record<
  ProductLine,
  {
    name: string;
    fullName: string;
    badgeClass: string;
    dotClass: string;
    borderAccent: string;
  }
> = {
  men: {
    name: "Men",
    fullName: "Men's Collection",
    badgeClass: "bg-slate-900 text-white border-slate-700",
    dotClass: "bg-sky-400",
    borderAccent: "hover:border-slate-800",
  },
  women: {
    name: "Women",
    fullName: "Women's Collection",
    badgeClass: "bg-[#7c2d58] text-white border-[#672248]",
    dotClass: "bg-pink-300",
    borderAccent: "hover:border-[#7c2d58]",
  },
  kids: {
    name: "Children",
    fullName: "Children's Collection",
    badgeClass: "bg-[#b45309] text-white border-[#92400e]",
    dotClass: "bg-amber-300",
    borderAccent: "hover:border-[#b45309]",
  },
};

/** Calculate shortest signed circular offset in a looping array */
function getCircularOffset(index: number, current: number, total: number) {
  let diff = index - current;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

export function NewArrivals() {
  const allItems = NEW_ARRIVAL_SLUGS.map(getProduct).filter(
    (p): p is Product => !!p,
  );

  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [activeId, setActiveId] = useState<string>(allItems[0]?.id || "p05");
  const [isPaused, setIsPaused] = useState(false);
  const [viewAngle, setViewAngle] = useState<"outer" | "zip">("outer");

  const openQuickView = useUI((s) => s.openQuickView);
  const toggleInquiry = useInquiry((s) => s.toggle);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const filmstripRef = useRef<HTMLDivElement | null>(null);

  // Filter items by category
  const visibleItems =
    filter === "all" ? allItems : allItems.filter((p) => p.line === filter);

  // Active product index
  const currentIndex = Math.max(
    0,
    visibleItems.findIndex((p) => p.id === activeId),
  );
  const activeShoe = visibleItems[currentIndex] || visibleItems[0] || allItems[0];

  const inCart = useInCart(activeShoe?.id ?? "");

  // Next / Previous cycle
  const advanceShoe = useCallback(
    (direction: 1 | -1 = 1) => {
      if (visibleItems.length <= 1) return;
      const nextIdx =
        (currentIndex + direction + visibleItems.length) % visibleItems.length;
      setActiveId(visibleItems[nextIdx].id);
      setViewAngle("outer");
    },
    [visibleItems, currentIndex],
  );

  // Continuous auto-play loop (pauses on hover/touch or manual toggle)
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

  // Smooth scroll active item into view in filmstrip
  useEffect(() => {
    if (!filmstripRef.current) return;
    const activeEl = filmstripRef.current.querySelector(
      `[data-shoe-id="${activeId}"]`,
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeId]);

  const handleSelectShoe = (id: string) => {
    setActiveId(id);
    setViewAngle("outer");
  };

  const handleFilterChange = (cat: CategoryFilter) => {
    setFilter(cat);
    const subset =
      cat === "all" ? allItems : allItems.filter((p) => p.line === cat);
    if (subset.length > 0) {
      setActiveId(subset[0].id);
      setViewAngle("outer");
    }
  };

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        advanceShoe(1);
      } else {
        advanceShoe(-1);
      }
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  if (!activeShoe) return null;

  return (
    <section
      id="new"
      aria-labelledby="h-new"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="my-[clamp(56px,7vw,96px)] scroll-mt-20 select-none relative overflow-x-clip"
    >
      {/* PROFESSIONAL HEADER: Clean Editorial Hierarchy */}
      <div className="flex flex-col items-center text-center pb-6 sm:pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1 text-[11px] font-bold tracking-[0.14em] text-brand uppercase backdrop-blur-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-brand opacity-75 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
          <span>Wholesale Showcase 2026</span>
          <span className="text-brand/40">·</span>
          <span>{visibleItems.length} Silhouettes</span>
        </div>

        <h2
          id="h-new"
          className="mt-3 font-headline text-[32px] sm:text-[42px] lg:text-[46px] font-semibold tracking-[-0.03em] text-ink"
        >
          New Arrival Silhouettes
        </h2>

        {/* Category Filter Pills: All Styles · Men · Women · Children (Kids) */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <div
            role="tablist"
            aria-label="Filter new arrivals by category"
            className="inline-flex items-center rounded-full border border-ink/10 bg-white/95 p-1 shadow-2xs backdrop-blur-md"
          >
            {(
              [
                { id: "all", label: "All Silhouettes" },
                { id: "men", label: "Men" },
                { id: "women", label: "Women" },
                { id: "kids", label: "Children (Kids)" },
              ] as { id: CategoryFilter; label: string }[]
            ).map((cat) => {
              const isSelected = filter === cat.id;
              const count =
                cat.id === "all"
                  ? allItems.length
                  : allItems.filter((p) => p.line === cat.id).length;

              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleFilterChange(cat.id)}
                  className={`rounded-full px-4 sm:px-5 py-2 text-[12.5px] sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-ink text-white shadow-xs"
                      : "text-ink-2 hover:bg-tile hover:text-ink"
                  }`}
                >
                  {cat.label} <span className="opacity-60 text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>

          <Link
            href="/catalog"
            className="inline-flex h-9.5 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4.5 text-[12.5px] font-semibold text-ink transition-all hover:border-ink hover:bg-tile shadow-2xs"
          >
            <span>Explore Catalog</span>
            <Icon name="arrow" className="size-3" />
          </Link>
        </div>
      </div>

      {/* MASTER STUDIO RUNWAY STAGE */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative h-[500px] sm:h-[560px] lg:h-[600px] w-full rounded-3xl border border-ink/10 bg-gradient-to-b from-[#fafbfa] via-[#f4f5f1] to-[#eaede3] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] [perspective:1200px] overflow-hidden flex items-end justify-center select-none"
      >
        {/* Soft Ambient Rim Light & Vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.85),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_75%,rgba(152,64,128,0.08),transparent_65%)]" />

        {/* Physical Studio Floor Pedestal Ellipse */}
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 w-[80%] max-w-[760px] h-32 rounded-[100%] bg-gradient-to-t from-black/[0.04] to-transparent blur-md" />

        {/* Top-Right Angle Toggle Pill (Outer / Inner Zip) */}
        {activeShoe.zip && (
          <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-40 inline-flex items-center rounded-full border border-ink/10 bg-white/90 p-0.5 text-[11px] font-semibold shadow-2xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewAngle("outer")}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                viewAngle === "outer"
                  ? "bg-ink text-white font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Outer View
            </button>
            <button
              type="button"
              onClick={() => setViewAngle("zip")}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                viewAngle === "zip"
                  ? "bg-ink text-white font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Inner Zip
            </button>
          </div>
        )}

        {/* Navigation Arrow: Previous */}
        <button
          type="button"
          onClick={() => advanceShoe(-1)}
          aria-label="Previous style"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-40 grid size-11 place-items-center rounded-full border border-ink/10 bg-white/95 text-ink shadow-soft backdrop-blur-md transition-all hover:bg-white hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Icon name="arrow" className="size-4 rotate-180" />
        </button>

        {/* Navigation Arrow: Next */}
        <button
          type="button"
          onClick={() => advanceShoe(1)}
          aria-label="Next style"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 grid size-11 place-items-center rounded-full border border-ink/10 bg-white/95 text-ink shadow-soft backdrop-blur-md transition-all hover:bg-white hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Icon name="arrow" className="size-4" />
        </button>

        {/* 3D GROUNDED RUNWAY: Calibrated Footwear Proportions */}
        <div className="relative size-full [transform-style:preserve-3d]">
          {visibleItems.map((shoe, idx) => {
            const offset = getCircularOffset(idx, currentIndex, visibleItems.length);
            const isCenter = offset === 0;
            const absOffset = Math.abs(offset);

            // Hide distant items beyond 2 positions to prevent visual collision
            if (absOffset > 2) return null;

            const sign = Math.sign(offset);

            // Calibrated 3D Transform metrics with spacious clearance
            let tx = "0px";
            let tz = 50;
            let ry = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 30;

            if (isCenter) {
              tx = "0px";
              tz = 50;
              ry = 0;
              scale = 1;
              opacity = 1;
              zIndex = 30;
            } else if (absOffset === 1) {
              tx = `${sign} * clamp(290px, 35vw, 440px)`;
              tz = -70;
              ry = -sign * 24;
              scale = 0.72;
              opacity = 0.52;
              zIndex = 20;
            } else if (absOffset === 2) {
              tx = `${sign} * clamp(520px, 62vw, 760px)`;
              tz = -170;
              ry = -sign * 36;
              scale = 0.48;
              opacity = 0.18;
              zIndex = 10;
            }

            const currentImageSrc =
              isCenter && viewAngle === "zip" && shoe.zip
                ? shoe.zip.src
                : shoe.outer.src;

            const catConfig = CATEGORY_CONFIG[shoe.line];

            return (
              <div
                key={shoe.id}
                onClick={() => handleSelectShoe(shoe.id)}
                role="button"
                tabIndex={0}
                aria-label={`View ${shoe.name}`}
                aria-current={isCenter ? "true" : undefined}
                style={{
                  left: "50%",
                  bottom: "90px",
                  transformOrigin: "50% 100%", // Scale from sole so ground contact remains anchored
                  transform: `translate3d(calc(-50% + ${tx}), 0, ${tz}px) rotateY(${ry}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition:
                    "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s ease, filter 0.65s ease",
                }}
                className={`absolute cursor-pointer flex flex-col items-center justify-end will-change-transform ${
                  isCenter ? "pointer-events-auto" : "pointer-events-auto hover:opacity-90"
                }`}
              >
                {/* Dual Contact Ground Shadow (Crisp occlusion + soft ambient spread) */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[50%] bg-black/40 blur-[5px] transition-all duration-500 ${
                    isCenter ? "h-2.5 w-[75%] opacity-100" : "h-2 w-[60%] opacity-40"
                  }`}
                />
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-[50%] bg-black/15 blur-[14px] transition-all duration-500 ${
                    isCenter ? "h-5 w-[90%] opacity-100" : "h-3.5 w-[70%] opacity-30"
                  }`}
                />

                {/* Subtle Studio Floor Reflection */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-[75px] sm:-bottom-[90px] left-1/2 -translate-x-1/2 w-full h-[75px] sm:h-[90px] overflow-hidden -scale-y-100 blur-[0.6px] transition-opacity duration-300 ${
                    isCenter ? "opacity-15" : "opacity-5"
                  }`}
                  style={{
                    maskImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 80%)",
                    WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 80%)",
                  }}
                >
                  <Image
                    src={currentImageSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 380px, 500px"
                    className="object-contain object-bottom"
                  />
                </div>

                {/* Grounded Shoe Container: Calibrated, Crisp Professional Scale */}
                <div
                  className={`relative w-[320px] sm:w-[390px] lg:w-[440px] h-[210px] sm:h-[260px] lg:h-[290px] flex items-end justify-center transition-transform duration-300 ${
                    isCenter
                      ? "animate-[hero-float-soft_5s_ease-in-out_infinite]"
                      : "hover:scale-104"
                  }`}
                >
                  <Image
                    src={currentImageSrc}
                    alt={`Chime Long ${shoe.name}`}
                    fill
                    priority={isCenter}
                    sizes="(max-width: 640px) 380px, 500px"
                    className="object-contain object-bottom drop-shadow-[0_16px_25px_rgba(18,20,22,0.18)] transition-all duration-300"
                  />
                </div>

                {/* Prominent Shoe Name + Category Badge */}
                {!isCenter ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink/8 bg-white/90 px-3 py-1 text-[11px] font-medium shadow-2xs backdrop-blur-md">
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[8.5px] font-bold uppercase tracking-wider ${catConfig.badgeClass}`}
                    >
                      {catConfig.name}
                    </span>
                    <span className="font-semibold text-ink">{shoe.name}</span>
                  </div>
                ) : (
                  <div className="mt-3.5 inline-flex items-center gap-2.5 rounded-full border border-ink/12 bg-white/95 px-4 py-1.5 shadow-xs backdrop-blur-md">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${catConfig.badgeClass}`}
                    >
                      <span className={`size-1.5 rounded-full ${catConfig.dotClass} animate-pulse`} />
                      {catConfig.name}
                    </span>
                    <span className="font-bold text-ink text-[14px] tracking-tight">
                      {shoe.name}
                    </span>
                    <span className="text-muted text-[11.5px]">· {categoryOf(shoe)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* UNIFIED WHOLESALE CONSOLE: Specifications & Inquiries */}
      <div className="mt-5 rounded-2xl border border-ink/10 bg-white/95 p-4 sm:p-5 shadow-2xs backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Active Style Identifiers */}
          <div className="flex flex-wrap items-center gap-3 max-lg:text-center max-lg:justify-center">
            <span
              className={`rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider ${CATEGORY_CONFIG[activeShoe.line].badgeClass}`}
            >
              {CATEGORY_CONFIG[activeShoe.line].fullName}
            </span>

            <h3 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink">
              {activeShoe.name}
            </h3>

            <span className="text-[14px] text-muted">
              · {categoryOf(activeShoe)}
            </span>

            <span className="hidden sm:inline-block size-1 rounded-full bg-ink/20" />

            {/* Color Swatch */}
            <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <span
                className="size-3.5 rounded-full ring-1 ring-ink/15 shadow-2xs"
                style={{ background: activeShoe.color.hex }}
              />
              <span>{activeShoe.color.name}</span>
            </div>

            <span className="hidden sm:inline-block size-1 rounded-full bg-ink/20" />

            {/* Wholesale Terms */}
            <span className="text-[13px] font-medium text-ink-2">
              {MOQ_PAIRS} prs MOQ
            </span>
            <span className="text-[13px] text-muted hidden md:inline">
              · {activeShoe.sizes}
            </span>
            <span className="text-[13px] text-muted hidden lg:inline">
              · {activeShoe.spec}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => toggleInquiry(activeShoe.id)}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-semibold transition-all shadow-xs active:scale-95 cursor-pointer ${
                inCart
                  ? "bg-brand text-white hover:bg-brand-deep"
                  : "bg-ink text-white hover:bg-ink-2"
              }`}
            >
              <Icon name={inCart ? "check" : "plus"} className="size-3.5" />
              <span>{inCart ? "In Inquiry List" : "Add to Inquiry"}</span>
            </button>

            <button
              type="button"
              onClick={() => openQuickView(activeShoe.id)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4.5 text-[13px] font-semibold text-ink shadow-2xs transition-all hover:border-ink hover:bg-tile active:scale-95 cursor-pointer"
            >
              <span>Quick View</span>
              <Icon name="arrow" className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE SILHOUETTES FILMSTRIP */}
      <div className="mt-4 w-full">
        <div
          ref={filmstripRef}
          className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {visibleItems.map((shoe) => {
            const isActive = shoe.id === activeShoe.id;
            const catConfig = CATEGORY_CONFIG[shoe.line];

            return (
              <button
                key={shoe.id}
                type="button"
                data-shoe-id={shoe.id}
                onClick={() => handleSelectShoe(shoe.id)}
                aria-label={`Select ${shoe.name}, Category: ${catConfig.name}`}
                className={`group flex-shrink-0 snap-start flex items-center gap-2.5 rounded-xl border p-2 transition-all duration-200 text-left cursor-pointer ${
                  isActive
                    ? "border-brand bg-white shadow-soft ring-2 ring-brand/20 -translate-y-0.5"
                    : "border-ink/10 bg-white/75 hover:bg-white hover:border-ink/25 shadow-2xs"
                }`}
              >
                {/* Footwear Thumbnail */}
                <div className="relative size-12 rounded-lg bg-[#f4f5f1] overflow-hidden flex-shrink-0">
                  <Image
                    src={shoe.outer.src}
                    alt={shoe.name}
                    fill
                    sizes="48px"
                    className="object-contain p-0.5"
                  />
                </div>

                {/* Footwear Identity */}
                <div className="min-w-[105px] pr-1.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.2 text-[8.5px] font-bold uppercase tracking-wider ${catConfig.badgeClass}`}
                    >
                      {catConfig.name}
                    </span>
                    {isActive && (
                      <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                    )}
                  </div>
                  <div className="mt-0.5 font-bold text-ink text-[12.5px] group-hover:text-brand transition-colors">
                    {shoe.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STUDIO STATUS & AUTO-SLIDE BAR */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 pt-3 text-[12px]">
        {/* Active Index & Label */}
        <div className="flex items-center gap-2 font-bold text-ink">
          <span className="tabular-nums text-brand font-mono">0{currentIndex + 1}</span>
          <span className="text-muted font-normal">/</span>
          <span className="tabular-nums text-muted font-mono">0{visibleItems.length}</span>
          <span className="text-black/15">·</span>
          <span className="tracking-tight">{activeShoe.name}</span>
          <span className="text-muted font-normal text-[11.5px] hidden sm:inline">
            ({CATEGORY_CONFIG[activeShoe.line].fullName})
          </span>
        </div>

        {/* Auto-slide Progress & Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative w-28 sm:w-36 h-1 rounded-full bg-ink/10 overflow-hidden">
            <div
              key={activeShoe.id}
              className="absolute inset-y-0 left-0 bg-brand rounded-full"
              style={{
                animation: isPaused ? "none" : `spot-progress ${AUTOPLAY_MS}ms linear both`,
                width: isPaused ? "100%" : undefined,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsPaused((v) => !v)}
            aria-label={isPaused ? "Resume auto-slide" : "Pause auto-slide"}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/90 px-3 py-1 text-[11px] font-semibold text-ink shadow-2xs hover:bg-white hover:border-ink/25 transition-all cursor-pointer"
          >
            <Icon name={isPaused ? "play" : "pause"} className="size-2.5" />
            <span>{isPaused ? "Resume" : "Auto-sliding"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

