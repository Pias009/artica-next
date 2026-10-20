"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { inLine, products, type ProductLine } from "@/lib/products";
import { useUI } from "@/lib/store";

interface ShoeLane {
  id: string;
  line: ProductLine;
  number: string;
  title: string;
  src: string;
  alt: string;
  leftPercent: number; // horizontal placement % on plate
  topPercent: number; // vertical placement % on plate
  widthCqw: number; // width in container query units
  floatClass: string; // pixel floating animation class
  delayMs: number;
}

const LANES: ShoeLane[] = [
  {
    id: "p04",
    line: "men",
    number: "02",
    title: "Men",
    src: "/images/workshop-boot-men.webp",
    alt: "Men's Forest Green Leather Lace-Up Boot",
    leftPercent: 50.3,
    topPercent: 47.8,
    widthCqw: 16.5,
    floatClass: "animate-[pixel-float-up-down_5.4s_ease-in-out_infinite]",
    delayMs: 0,
  },
  {
    id: "p01",
    line: "women",
    number: "01",
    title: "Women",
    src: "/images/workshop-boot-women.webp",
    alt: "Women's Cognac Suede Ankle Boot with Zipper",
    leftPercent: 67.8,
    topPercent: 48.4,
    widthCqw: 17.2,
    floatClass: "animate-[pixel-float-down-up_4.9s_ease-in-out_infinite]",
    delayMs: 400,
  },
  {
    id: "p03",
    line: "kids",
    number: "03",
    title: "Kids",
    src: "/images/workshop-boot-kids.webp",
    alt: "Kids' Cherry Red Patent Combat Boot",
    leftPercent: 89.2,
    topPercent: 49.0,
    widthCqw: 16.0,
    floatClass: "animate-[pixel-float-up-down_5.8s_ease-in-out_infinite]",
    delayMs: 800,
  },
];

export function FactoryWorkshop() {
  const openQuickView = useUI((s) => s.openQuickView);
  const [hoveredLane, setHoveredLane] = useState<string | null>(null);
  const [mouseParallax, setMouseParallax] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setMouseParallax({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseParallax({ x: 0, y: 0 });
    setHoveredLane(null);
  };

  return (
    <section
      id="factory-workshop"
      aria-labelledby="h-factory-workshop"
      className="bleed relative isolate mt-[clamp(44px,6vw,84px)] overflow-hidden bg-[#bec6b8] select-none"
    >
      {/* DESKTOP FLAT-LAY WORKSHOP (Container Query Pixel Placement) */}
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="@container relative mx-auto hidden w-full max-w-[1920px] lg:block aspect-[2752/1371]"
      >
        {/* Background Clean Plate: Kraft boxes, 3 color bands & authentic craft props */}
        <Image
          src="/images/workshop-plate-clean.webp"
          alt="Artica factory flat-lay workshop table"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center pointer-events-none"
        />

        {/* Dynamic ambient lighting vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10"
        />

        {/* LEFT EDITORIAL COPY */}
        <div className="absolute top-[11.2%] left-[4.8%] z-20 max-w-[42cqw]">
          <p className="animate-rise-in text-[11px] font-bold tracking-[0.24em] text-ink-2 uppercase motion-reduce:animate-none md:text-[max(10px,0.86cqw)]">
            FW26 WHOLESALE COLLECTION
          </p>

          <h2
            id="h-factory-workshop"
            className="mt-3.5 animate-rise-in font-headline text-[clamp(32px,3.75cqw,56px)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink [animation-delay:80ms] motion-reduce:animate-none"
          >
            Made in our factory.
            <br />
            Sent to your{" "}
            <em className="font-serif italic font-normal text-[#672c54]">
              shelves.
            </em>
          </h2>

          <div className="mt-5 flex animate-rise-in flex-wrap items-center gap-x-5 gap-y-3 [animation-delay:160ms] motion-reduce:animate-none">
            <OpenInquiryButton className="inline-flex h-11.5 items-center gap-2 rounded-full bg-[#672c54] px-6 text-[13px] font-bold tracking-[0.04em] text-white shadow-[0_10px_24px_-8px_rgba(103,44,84,0.7)] transition-all duration-300 hover:bg-[#522041] hover:scale-104 active:scale-96 md:h-[max(40px,3.1cqw)] md:px-[max(18px,1.55cqw)] md:text-[max(12px,0.98cqw)]">
              <span>Get wholesale pricing</span>
              <Icon name="arrow" className="size-3.5" />
            </OpenInquiryButton>

            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 text-[14px] font-bold text-ink underline underline-offset-4 decoration-ink/35 hover:decoration-[#672c54] hover:text-[#672c54] transition-colors md:text-[max(13px,1.02cqw)]"
            >
              <span>Browse {products.length} styles</span>
              <Icon name="arrow" className="size-3" />
            </Link>
          </div>

          <p className="mt-4 animate-rise-in text-[12.5px] font-medium text-ink-2 [animation-delay:220ms] motion-reduce:animate-none md:text-[max(11px,0.88cqw)]">
            From 300 pairs per style · Samples in 10 days · Door-to-door worldwide
          </p>
        </div>

        {/* BOTTOM LEFT BOXES LAYER: Slide from Out to In */}
        <div
          className="pointer-events-auto absolute bottom-0 left-0 z-10 w-[38.2cqw] aspect-[1050/836] animate-[box-slide-in_1.1s_cubic-bezier(0.16,1,0.3,1)_both]"
          style={{
            transform: `translate3d(${mouseParallax.x * -0.4}px, ${mouseParallax.y * -0.4}px, 0)`,
            transition: "transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1)",
          }}
        >
          <div className="relative size-full animate-[box-breathe_7s_ease-in-out_infinite]">
            <Image
              src="/images/workshop-boxes-overlay.webp"
              alt="Artica wholesale kraft master cases and luxury plum unboxing packaging"
              fill
              sizes="38vw"
              className="object-contain object-bottom-left transition-transform duration-500 hover:scale-102"
            />
          </div>
        </div>

        {/* RIGHT 3-LAYER FLOATING SHOE RUNWAYS */}
        {LANES.map((lane) => {
          const isHovered = hoveredLane === lane.id;
          const count = inLine(lane.line).length;

          return (
            <div
              key={lane.id}
              className="absolute z-20"
              style={{
                left: `${lane.leftPercent}%`,
                top: `${lane.topPercent}%`,
                transform: "translate(-50%, -50%)",
                width: `${lane.widthCqw}cqw`,
              }}
            >
              {/* Floating Boot Container with Parallax & Sub-pixel Micro-Motion */}
              <div
                className={`group relative flex flex-col items-center cursor-pointer ${lane.floatClass}`}
                style={{
                  transform: `translate3d(${mouseParallax.x * 0.6}px, ${mouseParallax.y * 0.6}px, 0)`,
                  transition: "transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)",
                }}
                onMouseEnter={() => setHoveredLane(lane.id)}
                onMouseLeave={() => setHoveredLane(null)}
                onClick={() => openQuickView(lane.id)}
                role="button"
                tabIndex={0}
                aria-label={`View ${lane.title} collection: ${lane.alt}`}
              >
                {/* Floating Boot Cutout */}
                <div
                  className="relative aspect-[470/600] w-full transition-all duration-400 ease-soft group-hover:scale-108 group-hover:-translate-y-2 group-hover:drop-shadow-[0_28px_24px_rgba(18,20,22,0.35)]"
                >
                  <Image
                    src={lane.src}
                    alt={lane.alt}
                    fill
                    sizes="20vw"
                    className="object-contain drop-shadow-[0_16px_16px_rgba(18,20,22,0.22)]"
                  />
                </div>

                {/* Category Spec Ticket Card */}
                <Link
                  href={`/catalog?line=${lane.line}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/95 px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-md ${
                    isHovered ? "ring-2 ring-[#672c54]/30 scale-104" : ""
                  }`}
                >
                  <span className="text-[11px] font-bold tracking-wider text-muted uppercase">
                    {lane.number}
                  </span>
                  <span className="h-3 w-px bg-black/15" />
                  <span className="text-[12.5px] font-bold text-ink">
                    {lane.title}
                  </span>
                  <span className="text-[11.5px] font-medium text-muted">
                    · {count} styles
                  </span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE / TABLET RESPONSIVE FALLBACK */}
      <div className="relative px-4 py-8 lg:hidden">
        {/* Copy */}
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-bold tracking-[0.2em] text-ink-2 uppercase">
            FW26 WHOLESALE COLLECTION
          </p>
          <h2 className="mt-2.5 font-headline text-[30px] sm:text-[38px] leading-[1.08] font-semibold text-ink">
            Made in our factory.
            <br />
            Sent to your{" "}
            <em className="font-serif italic font-normal text-[#672c54]">
              shelves.
            </em>
          </h2>

          <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <OpenInquiryButton className="inline-flex h-11 items-center gap-2 rounded-full bg-[#672c54] px-5 text-[12.5px] font-bold text-white shadow-md">
              <span>Get wholesale pricing</span>
              <Icon name="arrow" className="size-3.5" />
            </OpenInquiryButton>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink underline"
            >
              <span>Browse {products.length} styles</span>
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-ink-2">
            From 300 pairs per style · Samples in 10 days · Door-to-door worldwide
          </p>
        </div>

        {/* 3 Color Lanes Stacked / Horizontal on Mobile */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LANES.map((lane) => {
            const count = inLine(lane.line).length;
            const bgClass =
              lane.line === "men"
                ? "bg-[#bccbb8]"
                : lane.line === "women"
                ? "bg-[#f3cdc5]"
                : "bg-[#bed3e5]";

            return (
              <div
                key={lane.id}
                onClick={() => openQuickView(lane.id)}
                className={`relative flex flex-col items-center justify-between rounded-2xl p-5 ${bgClass} shadow-xs cursor-pointer`}
              >
                <div className="relative aspect-square w-44 animate-[pixel-float-up-down_4.8s_ease-in-out_infinite]">
                  <Image
                    src={lane.src}
                    alt={lane.alt}
                    fill
                    sizes="200px"
                    className="object-contain drop-shadow-md"
                  />
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1 shadow-xs text-[12px]">
                  <span className="font-bold text-muted">{lane.number}</span>
                  <span className="h-3 w-px bg-black/15" />
                  <span className="font-bold text-ink">{lane.title}</span>
                  <span className="text-muted">· {count} styles</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
