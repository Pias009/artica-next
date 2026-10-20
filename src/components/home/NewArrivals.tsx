"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import {
  categoryOf,
  CASE_PACK,
  getProduct,
  LINE_LABEL,
  MOQ_CASES,
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

const AUTOPLAY_MS = 4800;

type CategoryFilter = "all" | ProductLine;

export function NewArrivals() {
  const allItems = NEW_ARRIVAL_SLUGS.map(getProduct).filter(
    (p): p is Product => !!p,
  );

  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [activeId, setActiveId] = useState<string>(allItems[0]?.id || "p05");
  const [isPaused, setIsPaused] = useState(false);
  const [viewAngle, setViewAngle] = useState<"outer" | "zip">("outer");
  const [mouseTilt, setMouseTilt] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const openQuickView = useUI((s) => s.openQuickView);
  const toggleInquiry = useInquiry((s) => s.toggle);
  const shelfRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll the shelf to keep active card in view
  useEffect(() => {
    if (!shelfRef.current) return;
    const activeEl = shelfRef.current.querySelector<HTMLElement>(
      `[data-shoe-id="${activeShoe.id}"]`,
    );
    if (activeEl) {
      const container = shelfRef.current;
      const left =
        activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeShoe.id]);

  // Next / Previous rotation
  const advanceShoe = useCallback(
    (direction: 1 | -1 = 1) => {
      if (visibleItems.length <= 1) return;
      const currentIdx = visibleItems.findIndex((p) => p.id === activeShoe.id);
      const nextIdx =
        (currentIdx + direction + visibleItems.length) % visibleItems.length;
      setActiveId(visibleItems[nextIdx].id);
      setViewAngle("outer");
    },
    [visibleItems, activeShoe.id, setActiveId, setViewAngle],
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
    setMouseTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  if (!activeShoe) return null;

  const currentShot =
    viewAngle === "zip" && activeShoe.zip ? activeShoe.zip : activeShoe.outer;

  const caseRatio = CASE_PACK[activeShoe.line] || [];

  return (
    <section
      id="new"
      aria-labelledby="h-new"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="mt-[clamp(44px,6vw,84px)] scroll-mt-24 select-none relative isolate overflow-hidden rounded-3xl border border-ink/8 bg-gradient-to-b from-[#ffffff] via-[#f7fafb] to-[#edf3f6] p-4 sm:p-7 shadow-xs"
    >
      {/* 3D Atmospheric scene lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(215,232,245,0.65),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white/80 to-transparent"
      />

      <div className="relative z-10 flex flex-col justify-between">
        {/* HEADER: Section Title, Eyebrow & Category Filters */}
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-ink/8 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase backdrop-blur-sm shadow-2xs">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              <span>FW26 New Arrivals · Fresh Off Production</span>
            </div>
            <h2
              id="h-new"
              className="mt-2 font-headline text-[26px] sm:text-[34px] font-semibold tracking-[-0.025em] text-ink"
            >
              New Season Silhouettes
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Pills */}
            <div
              role="tablist"
              aria-label="Filter new arrivals by line"
              className="inline-flex items-center rounded-full border border-ink/10 bg-white/90 p-1 shadow-xs backdrop-blur-md"
            >
              {(["all", "women", "men", "kids"] as CategoryFilter[]).map(
                (cat) => {
                  const isSelected = filter === cat;
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
                      {cat === "all"
                        ? `All (${allItems.length})`
                        : LINE_LABEL[cat]}
                    </button>
                  );
                },
              )}
            </div>

            <Link
              href="/catalog"
              className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink hover:bg-tile"
            >
              <span>Explore All</span>
              <Icon name="arrow" className="size-3" />
            </Link>
          </div>
        </div>

        {/* 3D FEATURED SHOWCASE STAGE: LEFT GLASS SPECS + CENTER 3D SHOE + RIGHT PACKING */}
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative my-4 grid flex-1 items-center gap-4 lg:grid-cols-[270px_minmax(0,1fr)_270px] xl:grid-cols-[300px_minmax(0,1fr)_300px] [perspective:1400px]"
        >
          {/* LEFT 3D GLASS PANEL: Materials & Technical Specs */}
          <div
            style={{
              transform: `perspective(1000px) rotateY(${mouseTilt.x * 0.35 + 7}deg) rotateX(${mouseTilt.y * 0.35}deg) translateZ(20px)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="group order-2 flex flex-col gap-3 max-lg:hidden lg:order-1"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/80 p-4.5 backdrop-blur-2xl ring-1 ring-cyan-300/35 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.98),_inset_1.5px_0_3px_rgba(56,189,248,0.45),_inset_-1.5px_0_3px_rgba(236,72,153,0.35),_inset_0_-1.5px_2px_rgba(147,51,234,0.3),_0_24px_50px_-12px_rgba(18,20,22,0.16),_0_0_24px_-2px_rgba(56,189,248,0.22)] transition-all duration-300 hover:shadow-[inset_0_2px_3px_rgba(255,255,255,1),_0_28px_56px_-10px_rgba(18,20,22,0.2)]">
              {/* Chromatic color reflection gradients */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 -left-12 size-44 rounded-full bg-gradient-to-br from-cyan-400/30 via-sky-300/20 to-transparent blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-12 -right-12 size-44 rounded-full bg-gradient-to-tl from-fuchsia-500/25 via-purple-400/20 to-transparent blur-2xl"
              />
              {/* Prismatic glass body tint */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65)_0%,rgba(186,230,253,0.22)_28%,rgba(244,214,249,0.18)_60%,rgba(255,255,255,0.45)_100%)]"
              />

              <div className="relative z-10 flex items-center justify-between border-b border-white/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-6.5 place-items-center rounded-full bg-white/75 text-brand shadow-xs border border-white/90 ring-1 ring-cyan-200/50">
                    <Icon name="layers" className="size-3.5" />
                  </span>
                  <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-ink">
                    New Arrival Specs
                  </span>
                </div>
                <span className="rounded-md border border-brand/25 bg-gradient-to-r from-brand-soft to-purple-100/80 px-2 py-0.5 text-[11px] font-bold text-brand shadow-2xs backdrop-blur-sm">
                  {LINE_LABEL[activeShoe.line]}
                </span>
              </div>

              {/* Specs List */}
              <div className="relative z-10 mt-3 flex flex-col gap-2">
                <div className="rounded-xl border border-white/70 bg-gradient-to-r from-white/55 via-white/40 to-sky-50/35 p-2.5 text-left backdrop-blur-md shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <Icon name="drop" className="size-3 text-cyan-600" />
                    <span>Upper & Welt</span>
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink leading-snug">
                    {activeShoe.materials.find((m) => m.label === "Upper")
                      ?.value || activeShoe.spec}
                  </p>
                </div>

                <div className="rounded-xl border border-white/70 bg-gradient-to-r from-white/55 via-white/40 to-purple-50/35 p-2.5 text-left backdrop-blur-md shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <Icon name="snow" className="size-3 text-brand" />
                    <span>Lining & Comfort</span>
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink leading-snug">
                    {activeShoe.materials.find((m) => m.label === "Lining")
                      ?.value || "Thermal insulated collar"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/70 bg-gradient-to-r from-white/55 via-white/40 to-sky-50/35 p-2.5 text-left backdrop-blur-md shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <Icon name="sole" className="size-3 text-cyan-600" />
                    <span>Outsole Lug</span>
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink leading-snug">
                    {activeShoe.materials.find((m) => m.label === "Outsole")
                      ?.value || "Anti-slip vulcanized rubber"}
                  </p>
                </div>
              </div>

              {/* Color Swatch Badge */}
              <div className="relative z-10 mt-3 flex items-center justify-between border-t border-white/60 pt-2.5 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-3.5 rounded-full ring-2 ring-white inset-ring inset-ring-ink/15 shadow-2xs"
                    style={{ background: activeShoe.color.hex }}
                  />
                  <span className="font-semibold text-ink">
                    {activeShoe.color.name}
                  </span>
                </span>
                <span className="text-[10.5px]">Fast sample dispatch</span>
              </div>
            </div>
          </div>

          {/* CENTER 3D POP-UP STAGE: Featured New Arrival with Mouse Tilt */}
          <div className="order-1 flex flex-col items-center justify-center lg:order-2">
            <div
              style={{
                transform: `rotateX(${mouseTilt.y}deg) rotateY(${mouseTilt.x}deg)`,
                transformStyle: "preserve-3d",
                transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className="relative flex w-full max-w-[540px] flex-col items-center justify-center"
            >
              {/* Pop-up Shoe Header Pill */}
              <div className="z-10 -mb-2 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 px-4 py-1.5 shadow-xs backdrop-blur-md">
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand uppercase tracking-wider">
                  New Arrival
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
              <div className="relative flex aspect-[1.3] w-[min(88vw,480px)] items-center justify-center">
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
                    alt={`${activeShoe.name} new arrival - ${activeShoe.desc}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 480px, 88vw"
                    className="object-contain drop-shadow-[0_22px_30px_rgba(18,20,22,0.2)]"
                  />
                </div>

                {/* Outer Profile vs Zip Angle Switcher */}
                {activeShoe.zip && (
                  <div className="absolute right-2 bottom-3 z-20 flex items-center gap-1 rounded-full border border-ink/10 bg-white/90 p-0.5 shadow-xs backdrop-blur-md text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewAngle("outer")}
                      className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                        viewAngle === "outer"
                          ? "bg-ink text-white"
                          : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewAngle("zip")}
                      className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                        viewAngle === "zip"
                          ? "bg-ink text-white"
                          : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      Hardware
                    </button>
                  </div>
                )}
              </div>

              {/* Center Action Bar */}
              <div className="z-10 mt-1 flex flex-wrap items-center justify-center gap-2.5">
                <span className="text-[12px] font-medium text-ink-2">
                  <b>{MOQ_PAIRS} pairs</b> MOQ ({MOQ_CASES} cs) · {PACK} pr/case
                  · {activeShoe.sizes}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleInquiry(activeShoe.id)}
                    aria-pressed={inCart}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-bold tracking-[0.04em] uppercase shadow-xs transition-all duration-200 ${
                      inCart
                        ? "bg-brand text-white"
                        : "bg-ink text-white hover:bg-ink-hover"
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Icon name="check" className="size-3" />
                        <span>In Inquiry ({MOQ_CASES} cs)</span>
                      </>
                    ) : (
                      <>
                        <Icon name="plus" className="size-3" />
                        <span>Add New Style</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openQuickView(activeShoe.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-ink/15 bg-white px-3 text-[11.5px] font-semibold text-ink transition-colors hover:border-ink hover:bg-tile"
                  >
                    <span>Full Specs</span>
                    <Icon name="arrow" className="size-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 3D GLASS PANEL: Wholesale Case Curve & Sample Dispatch */}
          <div
            style={{
              transform: `perspective(1000px) rotateY(${mouseTilt.x * 0.35 - 7}deg) rotateX(${mouseTilt.y * 0.35}deg) translateZ(20px)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="group order-3 flex flex-col gap-3 max-lg:hidden"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/80 p-4.5 backdrop-blur-2xl ring-1 ring-purple-300/35 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.98),_inset_1.5px_0_3px_rgba(236,72,153,0.35),_inset_-1.5px_0_3px_rgba(56,189,248,0.45),_inset_0_-1.5px_2px_rgba(147,51,234,0.3),_0_24px_50px_-12px_rgba(18,20,22,0.16),_0_0_24px_-2px_rgba(217,70,239,0.2)] transition-all duration-300 hover:shadow-[inset_0_2px_3px_rgba(255,255,255,1),_0_28px_56px_-10px_rgba(18,20,22,0.2)]">
              {/* Chromatic color reflection gradients */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-gradient-to-bl from-purple-400/30 via-fuchsia-300/20 to-transparent blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-gradient-to-tr from-cyan-400/25 via-teal-300/18 to-transparent blur-2xl"
              />
              {/* Prismatic glass body tint */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65)_0%,rgba(244,214,249,0.22)_28%,rgba(186,230,253,0.18)_60%,rgba(255,255,255,0.45)_100%)]"
              />

              <div className="relative z-10 flex items-center justify-between border-b border-white/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-6.5 place-items-center rounded-full bg-white/75 text-brand shadow-xs border border-white/90 ring-1 ring-purple-200/50">
                    <Icon name="box" className="size-3.5" />
                  </span>
                  <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-ink">
                    Case Pack & Terms
                  </span>
                </div>
                <span className="rounded-md border border-brand/20 bg-white/60 px-2 py-0.5 text-[11px] font-bold text-brand backdrop-blur-sm shadow-2xs">
                  {PACK} Pairs / Case
                </span>
              </div>

              {/* Case Size Ratio Bar */}
              <div className="relative z-10 mt-3">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                  <span>Pre-Packed Size Curve</span>
                  <span className="font-semibold text-ink">
                    {activeShoe.sizes}
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {caseRatio.map(([sz, qty]) => (
                    <div
                      key={sz}
                      className="flex-1 rounded-lg border border-white/70 bg-gradient-to-b from-white/60 via-white/40 to-purple-50/30 py-1.5 text-center shadow-2xs backdrop-blur-sm"
                    >
                      <p className="text-[10px] text-muted font-medium">{sz}</p>
                      <p className="text-[12px] font-bold text-ink">{qty}x</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms breakdown */}
              <div className="relative z-10 mt-3 flex flex-col gap-1.5 border-t border-white/60 pt-2.5">
                <div className="flex items-center justify-between text-[11.5px] rounded-lg px-2.5 py-1.5 bg-gradient-to-r from-white/50 via-white/35 to-sky-50/30 border border-white/60 backdrop-blur-sm">
                  <span className="text-muted">Sample Lead</span>
                  <span className="font-semibold text-ink">10 Days Dispatch</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] rounded-lg px-2.5 py-1.5 bg-gradient-to-r from-white/50 via-white/35 to-purple-50/30 border border-white/60 backdrop-blur-sm">
                  <span className="text-muted">Bulk Production</span>
                  <span className="font-semibold text-ink">45 Days</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] rounded-lg px-2.5 py-1.5 bg-gradient-to-r from-white/50 via-white/35 to-pink-50/30 border border-white/60 backdrop-blur-sm">
                  <span className="text-muted">Private Label OEM</span>
                  <span className="font-semibold text-brand">From 600 pairs</span>
                </div>
              </div>

              {/* Logistics */}
              <div className="relative z-10 mt-3 flex items-center gap-2 border-t border-white/60 pt-2.5 text-[11px] text-muted">
                <Icon name="truck" className="size-3.5 text-cyan-600" />
                <span>DDP Air & Ocean Freight to US/Canada</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM 3D U-SHAPED CAROUSEL: 8 NEW ARRIVALS WITH ANIMATED FLOWING BORDER */}
        <div className="relative z-10 mt-2 pt-1">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            <div className="flex items-center gap-2">
              <span className="text-ink">3D Arrivals Runway</span>
              <span className="text-ink/30">·</span>
              <span>{visibleItems.length} New Season Silhouettes</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => advanceShoe(-1)}
                  aria-label="Previous arrival"
                  className="grid size-6.5 place-items-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-2xs transition-all hover:bg-white hover:scale-105"
                >
                  <Icon name="arrow" className="size-2.5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => advanceShoe(1)}
                  aria-label="Next arrival"
                  className="grid size-6.5 place-items-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-2xs transition-all hover:bg-white hover:scale-105"
                >
                  <Icon name="arrow" className="size-2.5" />
                </button>
              </div>

              <span className="h-3 w-px bg-ink/15" />

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

          {/* 3D U-Shape Platform Shell */}
          <div className="relative w-full [perspective:1400px]">
            {/* U-Shaped floor runner SVG */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2 bottom-1 h-32 overflow-hidden"
            >
              <svg
                viewBox="0 0 1000 130"
                preserveAspectRatio="none"
                className="size-full opacity-85"
              >
                <defs>
                  <linearGradient id="newArrivalsUGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#984080" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="newArrivalsUFloor" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
                    <stop offset="50%" stopColor="rgba(240,247,252,0.6)" />
                    <stop offset="100%" stopColor="rgba(240,247,252,0)" />
                  </linearGradient>
                </defs>
                <path d="M 0,22 Q 500,122 1000,22 L 1000,130 L 0,130 Z" fill="url(#newArrivalsUFloor)" />
                <path d="M 0,22 Q 500,122 1000,22" fill="none" stroke="url(#newArrivalsUGrad)" strokeWidth="3.5" />
                <path d="M 0,22 Q 500,122 1000,22" fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.95" />
              </svg>
              <div className="absolute inset-x-12 bottom-3 h-12 rounded-[50%] bg-gradient-to-r from-cyan-400/25 via-brand/35 to-fuchsia-400/25 blur-xl" />
            </div>

            {/* U-Shape Track - Centered with clean, natural-sized cards */}
            <div
              ref={shelfRef}
              tabIndex={0}
              role="region"
              aria-label="3D U-Shaped new arrivals shelf"
              className="no-scrollbar flex w-full items-center justify-start lg:justify-center gap-3 sm:gap-4 overflow-x-auto scroll-smooth pt-10 pb-6 px-4 sm:px-8 focus:outline-none"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {visibleItems.map((shoe, idx) => {
                const isActive = shoe.id === activeShoe.id;
                // Center-anchored U-shape formula: runway stays centered on the track
                const centerIdx = (visibleItems.length - 1) / 2;
                const diffCenter = idx - centerIdx;
                // 3D inward rotation along the U-track
                const rotY = Math.max(-28, Math.min(28, diffCenter * 7.5));
                // Z-depth along curve
                const transZ = -Math.min(24, Math.pow(Math.abs(diffCenter), 1.25) * 4.5);
                // Centered U-Shape vertical curve: lowest in the exact center (+20px), rising symmetrically on wings (-24px)
                const transY = 20 - Math.min(48, Math.pow(Math.abs(diffCenter), 1.6) * 5.8);
                // Keep scale natural and uniform: do not blow up image to big size!
                const scale = 1;
                const zIndex = 20 - Math.round(Math.abs(diffCenter));

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
                      width: "clamp(88px, 8.2vw, 112px)",
                    }}
                    className={`group relative flex-none rounded-xl transition-all duration-300 ease-soft focus:outline-none ${
                      isActive ? "opacity-100" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* Clean Crisp Card Plinth - Natural size, no bulky rainbow border */}
                    <div
                      className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-xl p-2 transition-all duration-300 ${
                        isActive
                          ? "bg-white border-2 border-brand shadow-sm ring-2 ring-brand/15"
                          : "bg-white/90 border border-ink/10 shadow-2xs hover:border-ink/25 hover:bg-white"
                      }`}
                    >
                      {/* Shoe Image - Crisp, Clean, Natural Proportion */}
                      <div className="relative size-full">
                        <Image
                          src={shoe.outer.src}
                          alt={shoe.name}
                          fill
                          sizes="112px"
                          className="object-contain drop-shadow-xs"
                        />
                      </div>

                      {/* Active Progress Timer */}
                      {isActive && !isPaused && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-2 bottom-1 h-0.5 overflow-hidden rounded-full bg-ink/10"
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
                          isActive ? "text-brand" : "text-ink"
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
