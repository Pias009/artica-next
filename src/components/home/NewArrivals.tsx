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

const AUTOPLAY_MS = 4500;

type CategoryFilter = "all" | ProductLine;

/** Category display configuration tailored for wholesale buyers */
export const CATEGORY_CONFIG: Record<
  ProductLine,
  {
    name: string;
    fullName: string;
    badgeClass: string;
    dotClass: string;
    tagClass: string;
  }
> = {
  men: {
    name: "Men",
    fullName: "Men's Collection",
    badgeClass: "bg-slate-900 text-white border-slate-700",
    dotClass: "bg-sky-400",
    tagClass: "bg-slate-100 text-slate-800 border-slate-200",
  },
  women: {
    name: "Women",
    fullName: "Women's Collection",
    badgeClass: "bg-[#7c2d58] text-white border-[#672248]",
    dotClass: "bg-pink-300",
    tagClass: "bg-pink-50 text-[#7c2d58] border-pink-200",
  },
  kids: {
    name: "Children",
    fullName: "Children's Collection",
    badgeClass: "bg-[#b45309] text-white border-[#92400e]",
    dotClass: "bg-amber-300",
    tagClass: "bg-amber-50 text-[#92400e] border-amber-200",
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
  const railContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Smooth scroll active item into view in bottom rail
  useEffect(() => {
    if (!railContainerRef.current) return;
    const activeEl = railContainerRef.current.querySelector(
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
      className="my-[clamp(60px,8vw,110px)] scroll-mt-20 select-none relative overflow-x-clip"
    >
      {/* CENTERED HEADER: Grand Headline + Category Filter Pills */}
      <div className="flex flex-col items-center text-center pb-6 sm:pb-9">
        <div className="inline-flex items-center gap-2.5">
          <h2
            id="h-new"
            className="font-headline text-[30px] sm:text-[40px] lg:text-[48px] font-semibold tracking-[-0.03em] text-ink"
          >
            New Arrival Silhouettes
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-brand animate-pulse" />
            {visibleItems.length} Styles
          </span>
        </div>

        {/* Centered Category Filter Pills: All Styles · Men · Women · Children (Kids) */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <div
            role="tablist"
            aria-label="Filter new arrivals by category"
            className="inline-flex items-center rounded-full border border-ink/10 bg-white/95 p-1.5 shadow-2xs backdrop-blur-md"
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
                  className={`rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                    isSelected
                      ? "bg-ink text-white shadow-xs"
                      : "text-ink-2 hover:bg-tile hover:text-ink"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          <Link
            href="/catalog"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-5 text-[13px] font-semibold text-ink transition-colors hover:border-ink hover:bg-tile shadow-2xs"
          >
            <span>Explore Catalog</span>
            <Icon name="arrow" className="size-3" />
          </Link>
        </div>
      </div>

      {/* TALL & GRAND GROUNDED 3D STUDIO STAGE */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative mt-2 h-[560px] sm:h-[640px] md:h-[700px] lg:h-[760px] xl:h-[800px] w-full rounded-3xl border border-ink/8 bg-gradient-to-b from-[#fefefe] via-[#f7f8f4] to-[#edf0e7] shadow-[0_24px_70px_-25px_rgba(0,0,0,0.14),inset_0_1px_2px_rgba(255,255,255,0.9)] [perspective:1300px] overflow-hidden flex items-end justify-center select-none"
      >
        {/* Studio Floor Horizon Gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[200px] bg-gradient-to-t from-black/[0.06] via-black/[0.02] to-transparent" />

        {/* Ambient Center Spotlight Radial Glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_72%,rgba(152,64,128,0.10),transparent_68%)]" />

        {/* Top Soft Studio Rim Light */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.8),transparent_70%)]" />

        {/* Previous Flanking Arrow */}
        <button
          type="button"
          onClick={() => advanceShoe(-1)}
          aria-label="Previous style"
          className="absolute left-4 sm:left-7 top-1/2 -translate-y-1/2 z-40 grid size-12 place-items-center rounded-full border border-ink/10 bg-white/95 text-ink shadow-soft backdrop-blur-md transition-all hover:bg-white hover:scale-110 active:scale-95"
        >
          <Icon name="arrow" className="size-4 rotate-180" />
        </button>

        {/* Next Flanking Arrow */}
        <button
          type="button"
          onClick={() => advanceShoe(1)}
          aria-label="Next style"
          className="absolute right-4 sm:right-7 top-1/2 -translate-y-1/2 z-40 grid size-12 place-items-center rounded-full border border-ink/10 bg-white/95 text-ink shadow-soft backdrop-blur-md transition-all hover:bg-white hover:scale-110 active:scale-95"
        >
          <Icon name="arrow" className="size-4" />
        </button>

        {/* 3D GROUNDED RUNWAY: All shoe soles aligned to the same baseline floor */}
        <div className="relative size-full [transform-style:preserve-3d]">
          {visibleItems.map((shoe, idx) => {
            const offset = getCircularOffset(idx, currentIndex, visibleItems.length);
            const isCenter = offset === 0;
            const absOffset = Math.abs(offset);

            // Hide items further than 3 positions away
            if (absOffset > 3) return null;

            const sign = Math.sign(offset);

            // Responsive 3D transform metrics grounded on floor (bottom-aligned)
            let tx = "0px";
            let tz = 60;
            let ry = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 30;

            if (isCenter) {
              tx = "0px";
              tz = 60;
              ry = 0;
              scale = 1;
              opacity = 1;
              zIndex = 30;
            } else if (absOffset === 1) {
              tx = `${sign} * clamp(230px, 30vw, 400px)`;
              tz = -50;
              ry = -sign * 22;
              scale = 0.8;
              opacity = 0.75;
              zIndex = 20;
            } else if (absOffset === 2) {
              tx = `${sign} * clamp(420px, 52vw, 710px)`;
              tz = -150;
              ry = -sign * 34;
              scale = 0.58;
              opacity = 0.42;
              zIndex = 10;
            } else if (absOffset === 3) {
              tx = `${sign} * clamp(580px, 72vw, 960px)`;
              tz = -250;
              ry = -sign * 44;
              scale = 0.4;
              opacity = 0.16;
              zIndex = 5;
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
                  bottom: "96px",
                  transformOrigin: "50% 100%", // Scale from the sole up so all shoes remain planted on floor!
                  transform: `translate3d(calc(-50% + ${tx}), 0, ${tz}px) rotateY(${ry}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition:
                    "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s ease, filter 0.65s ease",
                }}
                className={`absolute cursor-pointer flex flex-col items-center justify-end will-change-transform ${
                  isCenter ? "pointer-events-auto" : "pointer-events-auto hover:opacity-95"
                }`}
              >
                {/* Ground Contact Floor Shadow (scales naturally with shoe) */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-[50%] bg-ink/25 blur-[14px] transition-all duration-500 ${
                    isCenter ? "h-6 w-[88%] opacity-100" : "h-4 w-[70%] opacity-45"
                  }`}
                />

                {/* Studio Floor Mirror Reflection */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-[105px] sm:-bottom-[125px] left-1/2 -translate-x-1/2 w-full h-[105px] sm:h-[125px] overflow-hidden -scale-y-100 blur-[0.6px] transition-opacity duration-300 ${
                    isCenter ? "opacity-20" : "opacity-7"
                  }`}
                  style={{
                    maskImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 85%)",
                    WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 85%)",
                  }}
                >
                  <Image
                    src={currentImageSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 90vw, 700px"
                    className="object-contain object-bottom"
                  />
                </div>

                {/* Grounded Shoe Container (tall, prominent, high presence) */}
                <div
                  className={`relative h-[310px] sm:h-[380px] md:h-[430px] lg:h-[480px] xl:h-[510px] aspect-[1.38] flex items-end justify-center transition-transform duration-300 ${
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
                    sizes="(max-width: 640px) 90vw, 700px"
                    className="object-contain object-bottom drop-shadow-[0_20px_35px_rgba(18,20,22,0.22)] transition-all duration-300"
                  />
                </div>

                {/* PROMINENT SHOE NAME + CATEGORY (Men, Women, Children) BADGE */}
                {!isCenter && absOffset <= 2 ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/95 border border-ink/10 px-3.5 py-1.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-brand/40 hover:shadow-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${catConfig.badgeClass}`}
                    >
                      {catConfig.name}
                    </span>
                    <span className="font-bold text-ink text-[12px]">{shoe.name}</span>
                    <span className="text-muted text-[11px] hidden sm:inline">
                      · {categoryOf(shoe)}
                    </span>
                  </div>
                ) : isCenter ? (
                  <div className="mt-3 inline-flex items-center gap-2.5 rounded-full bg-white/95 border border-ink/15 px-4 py-1.5 text-[12px] shadow-sm backdrop-blur-md">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${catConfig.badgeClass}`}
                    >
                      <span className={`size-1.5 rounded-full ${catConfig.dotClass} animate-pulse`} />
                      {catConfig.fullName}
                    </span>
                    <span className="font-bold text-ink text-[14px] tracking-tight">
                      {shoe.name}
                    </span>
                    <span className="text-muted text-[12px]">· {categoryOf(shoe)}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE PRODUCT INFO & ACTIONS */}
      <div className="mt-5 sm:mt-7 flex flex-col items-center gap-3.5">
        {/* Active Shoe Detailed Spec Capsule */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-[13px]">
          <div className="inline-flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 rounded-2xl sm:rounded-full border border-ink/10 bg-white/95 px-5 py-2 shadow-2xs backdrop-blur-md">
            {/* Category tag: Men, Women, Children */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${CATEGORY_CONFIG[activeShoe.line].badgeClass}`}
            >
              Category: {CATEGORY_CONFIG[activeShoe.line].name}
            </span>
            <span className="size-1 rounded-full bg-ink/20 hidden sm:inline" />
            <span className="text-[16px] sm:text-[17px] font-bold tracking-tight text-ink">
              {activeShoe.name}
            </span>
            <span className="text-muted hidden sm:inline">
              · {categoryOf(activeShoe)}
            </span>
            <span className="size-1 rounded-full bg-ink/20 hidden sm:inline" />
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <span
                className="size-3.5 rounded-full ring-1 ring-ink/15 shadow-2xs"
                style={{ background: activeShoe.color.hex }}
              />
              <span>{activeShoe.color.name}</span>
            </span>
            <span className="text-muted">· {MOQ_PAIRS} pairs MOQ</span>
            <span className="text-muted hidden md:inline">· {activeShoe.spec}</span>
          </div>

          {activeShoe.zip && (
            <div className="inline-flex items-center rounded-full border border-ink/10 bg-white/90 p-0.5 text-[11.5px] font-medium shadow-2xs">
              <button
                type="button"
                onClick={() => setViewAngle("outer")}
                className={`rounded-full px-3 py-1 transition-all ${
                  viewAngle === "outer"
                    ? "bg-ink text-white font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                Outer
              </button>
              <button
                type="button"
                onClick={() => setViewAngle("zip")}
                className={`rounded-full px-3 py-1 transition-all ${
                  viewAngle === "zip"
                    ? "bg-ink text-white font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                Inner Zip
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleInquiry(activeShoe.id)}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-semibold transition-all shadow-xs active:scale-95 ${
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
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4.5 text-[13px] font-semibold text-ink shadow-2xs transition-all hover:border-ink hover:bg-tile active:scale-95"
          >
            <span>Quick View</span>
            <Icon name="arrow" className="size-3" />
          </button>
        </div>
      </div>

      {/* ALL SILHOUETTES QUICK SELECTOR DOCK: Displays Shoe Name & Category (Men, Women, Children) for all styles */}
      <div className="mt-7 w-full">
        <div className="flex items-center justify-between pb-2.5 px-1 text-[12px]">
          <div className="flex items-center gap-2 font-bold text-ink">
            <span className="text-brand font-mono text-[11px] tracking-wider uppercase">
              Silhouette Selector
            </span>
            <span className="text-black/15">·</span>
            <span className="text-muted font-normal text-[11.5px]">
              Click any style to bring to 3D center stage
            </span>
          </div>
          <span className="text-[11px] text-muted font-medium">
            {visibleItems.length} {visibleItems.length === 1 ? "Style" : "Styles"}
          </span>
        </div>

        <div
          ref={railContainerRef}
          className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
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
                className={`group flex-shrink-0 snap-start flex items-center gap-3 rounded-2xl border p-2 sm:p-2.5 transition-all duration-300 text-left cursor-pointer ${
                  isActive
                    ? "border-brand bg-white shadow-soft ring-2 ring-brand/20 -translate-y-0.5"
                    : "border-ink/10 bg-white/80 hover:bg-white hover:border-ink/30 shadow-2xs hover:shadow-xs"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative size-13 sm:size-15 rounded-xl bg-[#f4f5f1] overflow-hidden flex-shrink-0">
                  <Image
                    src={shoe.outer.src}
                    alt={shoe.name}
                    fill
                    sizes="60px"
                    className="object-contain p-1"
                  />
                </div>

                {/* Info: Category (Men, Women, Children) & Shoe Name */}
                <div className="min-w-[125px] sm:min-w-[145px] pr-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${catConfig.badgeClass}`}
                    >
                      {catConfig.name}
                    </span>
                    {isActive && (
                      <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                    )}
                  </div>
                  <div className="mt-1 font-bold text-ink text-[13px] sm:text-[14px] group-hover:text-brand transition-colors">
                    {shoe.name}
                  </div>
                  <div className="text-muted text-[11px] truncate">
                    {categoryOf(shoe)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SLEEK STUDIO PAGINATION & AUTO-SLIDE BAR */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 pt-3">
        {/* Active Shoe Name & Counter */}
        <div className="flex items-center gap-2 text-[12px] font-bold text-ink">
          <span className="tabular-nums text-brand font-mono">0{currentIndex + 1}</span>
          <span className="text-muted font-normal">/</span>
          <span className="tabular-nums text-muted font-mono">0{visibleItems.length}</span>
          <span className="text-black/15">·</span>
          <span className="tracking-tight">{activeShoe.name}</span>
          <span className="text-muted font-normal text-[11px] hidden sm:inline">
            ({CATEGORY_CONFIG[activeShoe.line].fullName})
          </span>
        </div>

        {/* Interactive Pagination Indicators with Auto-slide Progress */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Product navigation">
          {visibleItems.map((shoe, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={shoe.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to ${shoe.name}`}
                onClick={() => handleSelectShoe(shoe.id)}
                className={`group relative h-2 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                  isActive ? "w-8 bg-brand/20" : "w-2 bg-ink/15 hover:bg-ink/35"
                }`}
              >
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full bg-brand origin-left"
                    style={{
                      animation: isPaused ? "none" : `spot-progress ${AUTOPLAY_MS}ms linear both`,
                      width: isPaused ? "100%" : undefined,
                    }}
                  />
                )}
                {/* Tooltip on hover */}
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink/90 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
                  {shoe.name} · {CATEGORY_CONFIG[shoe.line].name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Auto-slide Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPaused((v) => !v)}
            aria-label={isPaused ? "Resume auto-slide" : "Pause auto-slide"}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/90 px-3.5 py-1 text-[11px] font-semibold text-ink shadow-2xs hover:bg-white hover:border-ink/25 transition-all cursor-pointer"
          >
            <Icon name={isPaused ? "play" : "pause"} className="size-2.5" />
            <span>{isPaused ? "Resume Auto-slide" : "Auto-sliding"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

