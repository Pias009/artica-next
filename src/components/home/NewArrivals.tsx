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
  const dockRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter items by category
  const visibleItems =
    filter === "all" ? allItems : allItems.filter((p) => p.line === filter);

  // Active product
  const activeShoe =
    visibleItems.find((p) => p.id === activeId) ||
    visibleItems[0] ||
    allItems[0];

  const inCart = useInCart(activeShoe?.id ?? "");

  // Auto-scroll the dock to keep active thumbnail visible and centered
  useEffect(() => {
    if (!dockRef.current) return;
    const activeEl = dockRef.current.querySelector<HTMLElement>(
      `[data-shoe-id="${activeShoe.id}"]`,
    );
    if (activeEl) {
      const container = dockRef.current;
      const left =
        activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeShoe.id]);

  // Next / Previous cycle
  const advanceShoe = useCallback(
    (direction: 1 | -1 = 1) => {
      if (visibleItems.length <= 1) return;
      const currentIdx = visibleItems.findIndex((p) => p.id === activeShoe.id);
      const nextIdx =
        (currentIdx + direction + visibleItems.length) % visibleItems.length;
      setActiveId(visibleItems[nextIdx].id);
      setViewAngle("outer");
    },
    [visibleItems, activeShoe.id],
  );

  // Continuous auto-play loop (pauses when hovered/focused or when user manually toggles)
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

  if (!activeShoe) return null;

  const currentShot =
    viewAngle === "zip" && activeShoe.zip ? activeShoe.zip : activeShoe.outer;

  return (
    <section
      id="new"
      aria-labelledby="h-new"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="mt-[clamp(48px,6vw,84px)] scroll-mt-24 select-none relative"
    >
      {/* CENTER TOP HEADER: Eyebrow + Title + Subtitle + Category Filter Pills */}
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 px-3.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase shadow-2xs backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-brand animate-pulse" />
          <span>New Arrivals · Fresh Off Production</span>
        </div>

        <h2
          id="h-new"
          className="mt-3 font-headline text-[30px] sm:text-[38px] lg:text-[44px] font-semibold tracking-[-0.025em] text-ink"
        >
          New Arrival Silhouettes
        </h2>

        <p className="mt-2 text-[14.5px] sm:text-[15.5px] text-muted max-w-xl">
          Latest additions to the wholesale catalog. Sample any style in 10 days with pre-packed
          mixed cases ready for global retail dispatch.
        </p>

        {/* Category Filter Pills & Catalog Link */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <div
            role="tablist"
            aria-label="Filter new arrivals by line"
            className="inline-flex items-center rounded-full border border-ink/10 bg-white/90 p-1 shadow-2xs backdrop-blur-md"
          >
            {(["all", "women", "men", "kids"] as CategoryFilter[]).map((cat) => {
              const isSelected = filter === cat;
              const count =
                cat === "all"
                  ? allItems.length
                  : allItems.filter((p) => p.line === cat).length;

              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleFilterChange(cat)}
                  className={`rounded-full px-3.5 py-1 text-[12px] font-semibold capitalize transition-all duration-300 ease-soft ${
                    isSelected
                      ? "bg-ink text-white shadow-xs"
                      : "text-ink-2 hover:bg-tile hover:text-ink"
                  }`}
                >
                  {cat === "all" ? `All (${count})` : `${LINE_LABEL[cat]} (${count})`}
                </button>
              );
            })}
          </div>

          <Link
            href="/catalog"
            className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink hover:bg-tile shadow-2xs"
          >
            <span>Explore All</span>
            <Icon name="arrow" className="size-3" />
          </Link>
        </div>
      </div>

      {/* PRODUCT SHOWCASE HERO STAGE (Clean, Open, No Side Boxes, No Heavy Box BG) */}
      <div className="relative mt-8 sm:mt-10 flex flex-col items-center">
        {/* Active Shoe Pill & Optional Angle Switch */}
        <div className="z-10 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 px-3.5 py-1.5 shadow-xs backdrop-blur-md">
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand uppercase tracking-wider">
              {LINE_LABEL[activeShoe.line]}
            </span>
            <span className="size-1 rounded-full bg-ink/20" />
            <span className="text-[14px] sm:text-[15px] font-bold tracking-tight text-ink">
              {activeShoe.name}
            </span>
            <span className="text-[12px] text-muted hidden sm:inline">
              · {categoryOf(activeShoe)}
            </span>
          </div>

          {activeShoe.zip && (
            <div className="inline-flex items-center rounded-full border border-ink/10 bg-white/80 p-0.5 text-[11px] font-medium shadow-2xs">
              <button
                type="button"
                onClick={() => setViewAngle("outer")}
                className={`rounded-full px-2.5 py-1 transition-all ${
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
                className={`rounded-full px-2.5 py-1 transition-all ${
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

        {/* Showcase Image Area with Flanking Nav Arrows */}
        <div className="relative mt-4 flex w-full max-w-[720px] items-center justify-center px-4">
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={() => advanceShoe(-1)}
            aria-label="Previous style"
            className="absolute left-2 sm:left-4 z-20 grid size-10 place-items-center rounded-full border border-ink/10 bg-white/90 text-ink shadow-xs backdrop-blur-sm transition-all hover:bg-white hover:border-ink/30 hover:scale-105 active:scale-95"
          >
            <Icon name="arrow" className="size-3.5 rotate-180" />
          </button>

          {/* Center Shoe Display with Soft Floor Shadow */}
          <div className="relative flex aspect-[1.3] w-[min(84vw,480px)] items-center justify-center">
            {/* Natural Contact Shadow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[8%] left-1/2 h-[12%] w-[76%] -translate-x-1/2 rounded-[50%] bg-ink/18 blur-[14px] transition-all duration-300"
            />

            <div
              key={`${activeShoe.id}-${viewAngle}`}
              className="relative size-full animate-[hero-float-soft_5s_ease-in-out_infinite]"
            >
              <Image
                src={currentShot.src}
                alt={`Chime Long ${activeShoe.name}`}
                fill
                priority
                sizes="(max-width: 640px) 84vw, 480px"
                className="object-contain drop-shadow-[0_16px_24px_rgba(18,20,22,0.18)] transition-all duration-300"
              />
            </div>
          </div>

          {/* Next Arrow */}
          <button
            type="button"
            onClick={() => advanceShoe(1)}
            aria-label="Next style"
            className="absolute right-2 sm:right-4 z-20 grid size-10 place-items-center rounded-full border border-ink/10 bg-white/90 text-ink shadow-xs backdrop-blur-sm transition-all hover:bg-white hover:border-ink/30 hover:scale-105 active:scale-95"
          >
            <Icon name="arrow" className="size-3.5" />
          </button>
        </div>

        {/* Showcase Shoe Info & Action Bar */}
        <div className="mt-2 flex flex-col items-center gap-3">
          {/* Quick Wholesale Specs Line */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] sm:text-[13px] text-muted">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <span
                className="size-3 rounded-full ring-1 ring-ink/15 shadow-2xs"
                style={{ background: activeShoe.color.hex }}
              />
              <span>{activeShoe.color.name}</span>
            </span>
            <span>·</span>
            <span className="font-semibold text-ink">{MOQ_PAIRS} pairs MOQ</span>
            <span>·</span>
            <span>{PACK} pairs / case</span>
            <span>·</span>
            <span>{activeShoe.spec}</span>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-1 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => toggleInquiry(activeShoe.id)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12px] font-semibold transition-all shadow-xs active:scale-95 ${
                inCart
                  ? "bg-brand text-white hover:bg-brand-deep"
                  : "bg-ink text-white hover:bg-ink-2"
              }`}
            >
              <Icon name={inCart ? "check" : "plus"} className="size-3" />
              <span>{inCart ? "In Inquiry List" : "Add to Inquiry"}</span>
            </button>

            <button
              type="button"
              onClick={() => openQuickView(activeShoe.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 text-[12px] font-semibold text-ink shadow-2xs transition-all hover:border-ink hover:bg-tile active:scale-95"
            >
              <span>Quick View</span>
              <Icon name="arrow" className="size-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SHOWCASE DOCK: Clean, Flat, Interactive Product Thumbnails */}
      <div className="mt-10 pt-4 border-t border-ink/8">
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          <div className="flex items-center gap-2">
            <span className="text-ink">New Arrivals Collection</span>
            <span className="text-ink/30">·</span>
            <span>{visibleItems.length} Silhouettes</span>
          </div>

          {/* Play/Pause Autoplay Control */}
          <button
            type="button"
            onClick={() => setIsPaused((v) => !v)}
            aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold text-ink shadow-2xs hover:bg-white"
          >
            <Icon name={isPaused ? "play" : "pause"} className="size-2.5" />
            <span>{isPaused ? "Play" : "Pause"}</span>
          </button>
        </div>

        {/* Clean, Flat Product Cards Track */}
        <div
          ref={dockRef}
          tabIndex={0}
          role="region"
          aria-label="New arrivals product showcase selector"
          className="no-scrollbar flex w-full items-center justify-start lg:justify-center gap-2.5 sm:gap-3.5 overflow-x-auto scroll-smooth py-2 px-1 focus:outline-none"
        >
          {visibleItems.map((shoe) => {
            const isActive = shoe.id === activeShoe.id;

            return (
              <button
                key={shoe.id}
                type="button"
                data-shoe-id={shoe.id}
                onClick={() => handleSelectShoe(shoe.id)}
                aria-pressed={isActive}
                className={`group relative flex-none rounded-2xl transition-all duration-300 ease-soft focus:outline-none ${
                  isActive
                    ? "opacity-100 -translate-y-1"
                    : "opacity-75 hover:opacity-100 hover:-translate-y-0.5"
                }`}
                style={{
                  width: "clamp(96px, 9vw, 120px)",
                }}
              >
                {/* Clean, Flat Card */}
                <div
                  className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-2xl p-2 transition-all duration-300 ${
                    isActive
                      ? "bg-white border-2 border-brand shadow-sm ring-2 ring-brand/15"
                      : "bg-white/85 border border-ink/10 shadow-2xs hover:border-ink/25 hover:bg-white"
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="relative size-full">
                    <Image
                      src={shoe.outer.src}
                      alt={shoe.name}
                      fill
                      sizes="120px"
                      className="object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Active Progress Timer */}
                  {isActive && !isPaused && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2.5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-ink/10"
                    >
                      <span
                        key={activeShoe.id}
                        className="block h-full origin-left bg-brand"
                        style={{
                          animation: `spot-progress ${AUTOPLAY_MS}ms linear both`,
                        }}
                      />
                    </span>
                  )}
                </div>

                {/* Shoe Label */}
                <div className="mt-1.5 text-center">
                  <p
                    className={`text-[11.5px] font-bold truncate leading-tight transition-colors ${
                      isActive ? "text-brand" : "text-ink group-hover:text-ink"
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
    </section>
  );
}
