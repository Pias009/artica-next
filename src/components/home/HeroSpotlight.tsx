"use client";

import { seasonCopyOf } from "@/lib/content/live";
import { merged } from "@/lib/season-copy";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { useSeason } from "../season/SeasonContext";
import { categoryOf, getProduct, inLine, LINE_LABEL, MOQ_PAIRS, PACK, type Product, type ProductLine } from "@/lib/products";
import { SEASONS, type SeasonId } from "@/lib/season";
import { lineFor, seasonPicks } from "@/lib/season-products";
import { useUI } from "@/lib/store";

export type HeroSeasonCopy = {
  eyebrowBadge: string;
  headlineLead: string;
  headlineAccent: string;
  description: string;
};

export const HERO_SEASON_COPY: Record<SeasonId, HeroSeasonCopy> = {
  winter: {
    eyebrowBadge: "Winter wholesale edit",
    headlineLead: "Winter footwear, ",
    headlineAccent: "built for −25°C.",
    description: "Insulated snow boots and hikers, factory-direct from Guangzhou.",
  },
  spring: {
    eyebrowBadge: "Spring wholesale edit",
    headlineLead: "Spring footwear, ",
    headlineAccent: "light on its feet.",
    description: "Breathable sneakers, soft flats and loafers at low MOQs.",
  },
  summer: {
    eyebrowBadge: "Summer wholesale edit",
    headlineLead: "Summer styles, ",
    headlineAccent: "made for the heat.",
    description: "Slides, sandals and slip-ons, packed by the case.",
  },
  rainy: {
    eyebrowBadge: "Monsoon wholesale edit",
    headlineLead: "Waterproof footwear, ",
    headlineAccent: "built for wet streets.",
    description: "Seam-sealed boots and sandals with deep-grip treads.",
  },
  autumn: {
    eyebrowBadge: "Autumn wholesale edit",
    headlineLead: "Autumn footwear, ",
    headlineAccent: "ready for the cold snap.",
    description: "Leather Chelsea boots, suede ankle boots and hikers.",
  },
  holiday: {
    eyebrowBadge: "Holiday wholesale edit",
    headlineLead: "Gift-ready footwear, ",
    headlineAccent: "for peak season.",
    description: "Patent boots, velvet pumps and shearling slippers, gift-boxed.",
  },
};

/** How many of the season's styles take turns in the spotlight, each with a glow tint from the season's theme. */
const SPOT_COUNT = 5;

/** The three ways in, along the bottom; each shows its line's best pair for the season. `kinds` is the fallback. */
const CARDS: { line: ProductLine; slug: string; block: string; kinds: string }[] = [
  { line: "women", slug: "maple", block: "#f6e4e6", kinds: "Ankle, chelsea and tall boots" },
  { line: "men", slug: "nord", block: "#e2eaf2", kinds: "Leather lace-up boots" },
  { line: "kids", slug: "blossom", block: "#e5efdd", kinds: "Snow boots and hikers" },
];

const AUTOPLAY_MS = 5000;
const OUT_MS = 650;

/** Swatch positions on the ring's left arc, in degrees from 3 o'clock (negative is up), so the circle picker sits on the left. */
const ANGLES = Array.from({ length: SPOT_COUNT }, (_, i) => -110 - (100 / (SPOT_COUNT - 1)) * i);
const onRing = (deg: number): CSSProperties => {
  const r = (deg * Math.PI) / 180;
  // rounded here, so the server and the browser print the same string (no hydration mismatch)
  return { left: `${(50 + 50 * Math.cos(r)).toFixed(3)}%`, top: `${(50 + 50 * Math.sin(r)).toFixed(3)}%` };
};

/**
 * First view, a spotlight on the site's white canvas: the promise on the left, one real pair large and tilted in front of a ring on the
 * right. Swatches on the ring pick the pair; each new pair renders out of a small circle while the old one slides
 * away, and a marker runs round the ring to its swatch. Autoplays, pauses on hover/focus, still under reduced motion.
 * Below, the three lines as the ways in.
 */
export function HeroSpotlight() {
  const openQuickView = useUI((s) => s.openQuickView);
  const season = useSeason();
  const theme = SEASONS[season];
  // the season's words, with the admin's edits (Seasons) over them
  const copy = merged(HERO_SEASON_COPY[season] ?? HERO_SEASON_COPY.winter, seasonCopyOf(season)?.hero);
  // the season's best styles, one per kind, so the spotlight opens on what this visitor's customers buy now
  const spots = useMemo(() => seasonPicks(season, SPOT_COUNT).map((p, i) => ({ p, slug: p.slug, tint: theme.tints[i % theme.tints.length] })), [season, theme]);
  const cards = useMemo(
    () =>
      CARDS.map((c) => {
        const best = lineFor(c.line, season);
        return { ...c, p: best.p ?? (getProduct(c.slug) as Product), kinds: best.kinds ?? c.kinds };
      }),
    [season],
  );
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [moved, setMoved] = useState(false); // false until the first change: the opening pair is shown, not flown in
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const curRef = useRef(0);
  const go = useCallback(
    (next: number) => {
      const n = (next + spots.length) % spots.length;
      if (n === curRef.current) return;
      setPrev(curRef.current);
      setMoved(true);
      curRef.current = n;
      setCur(n);
      clearTimeout(outTimer.current);
      outTimer.current = setTimeout(() => setPrev(null), OUT_MS);
    },
    [spots.length],
  );

  useEffect(() => {
    if (paused || reduced) return;
    const t = setInterval(() => {
      if (!document.hidden) go(cur + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [cur, paused, reduced, go]);

  useEffect(() => () => clearTimeout(outTimer.current), []);

  const s = spots[cur];

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: nx, y: ny });
  };

  const handleStagePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
    setPaused(false);
  };

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="bleed bg-hero relative isolate overflow-hidden text-ink"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Dynamic atmospheric color wash that smoothly breathes and transitions with active shoe tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[28%] -right-[6%] size-[min(680px,78vw)] -translate-y-1/2 rounded-full blur-[100px] transition-all duration-1000 ease-out animate-[ambient-pulse-slow_8s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{
          background: `radial-gradient(circle, ${s.tint}40 0%, ${s.tint}14 45%, transparent 70%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[16%] left-[4%] size-[min(480px,52vw)] rounded-full blur-[90px] bg-brand/6 transition-all duration-1000 ease-out animate-[ambient-pulse-slow_11s_ease-in-out_infinite_reverse] motion-reduce:animate-none"
      />

      {/* Subtle season thematic graphic watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 right-[5%] z-[1] size-[clamp(260px,32vw,480px)] opacity-15 text-season transition-opacity duration-700 max-sm:hidden"
      >
        {season === "winter" && (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" className="size-full">
            <line x1="50" y1="6" x2="50" y2="94" />
            <line x1="12" y1="28" x2="88" y2="72" />
            <line x1="12" y1="72" x2="88" y2="28" />
            <circle cx="50" cy="50" r="14" strokeDasharray="3 4" strokeWidth="1" />
            <path d="M40 22 L50 32 L60 22" />
            <path d="M40 78 L50 68 L60 78" />
            <circle cx="50" cy="50" r="2.5" fill="currentColor" />
          </svg>
        )}
        {season === "spring" && (
          <svg viewBox="0 0 100 100" fill="currentColor" className="size-full">
            <path d="M50 15 C60 30 75 40 68 58 C60 72 40 72 32 58 C25 40 40 30 50 15 Z" opacity="0.6" />
            <circle cx="68" cy="40" r="6" opacity="0.35" />
            <circle cx="32" cy="40" r="5" opacity="0.35" />
          </svg>
        )}
        {season === "summer" && (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" className="size-full">
            <circle cx="50" cy="50" r="24" strokeDasharray="4 6" />
            <circle cx="50" cy="50" r="42" strokeWidth="0.8" opacity="0.5" />
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="50" y1="12" x2="50" y2="3" transform={`rotate(${i * 45} 50 50)`} />
            ))}
          </svg>
        )}
        {season === "rainy" && (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" className="size-full">
            <line x1="30" y1="20" x2="20" y2="50" strokeDasharray="6 10" />
            <line x1="60" y1="15" x2="50" y2="45" strokeDasharray="6 12" />
            <line x1="80" y1="35" x2="70" y2="65" strokeDasharray="6 10" />
            <circle cx="45" cy="75" r="15" strokeDasharray="3 5" opacity="0.5" />
          </svg>
        )}
        {season === "autumn" && (
          <svg viewBox="0 0 100 100" fill="currentColor" className="size-full">
            <path d="M50 8 L56 30 L72 20 L66 40 L88 44 L72 56 L84 72 L62 68 L52 90 L48 90 L50 68 L28 72 L40 56 L24 44 L46 40 L40 20 L56 30 Z" opacity="0.5" />
            <line x1="50" y1="20" x2="50" y2="95" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
        {season === "holiday" && (
          <svg viewBox="0 0 100 100" fill="currentColor" className="size-full">
            <path d="M50 0 L54 36 L90 26 L64 50 L90 74 L54 64 L50 100 L46 64 L10 74 L36 50 L10 26 L46 36 Z" opacity="0.5" />
          </svg>
        )}
      </div>

      <div className="wrap relative grid grid-cols-[minmax(0,1fr)] gap-y-4 px-(--shell-pad) pt-[clamp(20px,4vh,60px)] lg:min-h-[min(calc(100svh-112px-140px),700px)] lg:grid-cols-[minmax(0,5.2fr)_minmax(0,6.8fr)] lg:gap-y-6">
        {/* the promise */}
        <div className="relative z-[2] self-center max-lg:text-center lg:-translate-y-10">
          <p data-hero-in="eyebrow" className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-ink-2 shadow-soft">
            <Icon name={theme.icon} className="size-4! text-season" />
            {copy.eyebrowBadge}
          </p>
          <h1
            id="hero-title"
            className="mt-5 max-w-[14ch] font-headline text-[clamp(38px,9.4vw,46px)] leading-[1.04] font-semibold tracking-[-0.02em] text-balance text-ink max-lg:mx-auto lg:text-[clamp(44px,4.6vw,72px)]"
          >
            {copy.headlineLead}
            <em className="font-medium text-brand">{copy.headlineAccent}</em>
          </h1>
          <p data-hero-in="copy" className="mt-5 max-w-[26rem] text-[16px] leading-[1.6] text-ink-2 max-lg:mx-auto lg:text-[18px]">
            {copy.description}
          </p>
          <div data-hero-in="cta" className="mt-9 flex flex-wrap items-center gap-3 max-lg:justify-center">
            <OpenInquiryButton className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgb(18_20_22/.6)] transition-[background-color,translate] duration-300 ease-soft hover:-translate-y-0.5 hover:bg-brand">
              Get wholesale pricing <Icon name="arrow" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </OpenInquiryButton>
            <a href="#styles" className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-[box-shadow] duration-300 ease-soft hover:ring-ink/40">
              Browse the range
            </a>
          </div>
          <p data-hero-in="copy" className="mt-4 text-[13px] text-muted">
            From {MOQ_PAIRS} pairs per style · {PACK}-pair cases
          </p>
        </div>

        {/* the stage with spatial mouse tilt */}
        <div
          className="relative min-h-[clamp(320px,56vh,620px)] max-lg:min-h-[380px]"
          onPointerMove={handleStagePointerMove}
          onPointerLeave={handleStagePointerLeave}
        >
          {/* Dynamic floating live status capsule with decoupled mouse parallax + ambient float */}
          <div
            className="pointer-events-none absolute top-[8%] right-[4%] z-[3] transition-transform duration-200 ease-out max-sm:hidden"
            style={{
              transform: reduced
                ? undefined
                : `translate(${(tilt.x * -10).toFixed(1)}px, ${(tilt.y * -10).toFixed(1)}px)`,
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/80 px-3.5 py-1.5 shadow-[0_12px_28px_-8px_rgb(18_20_22/.12),0_0_0_1px_rgb(18_20_22/.04),inset_0_1px_1px_rgb(255_255_255/.9)] backdrop-blur-sm animate-[hero-float-soft_4.8s_ease-in-out_infinite] motion-reduce:animate-none">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-brand/60 opacity-75 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
              <span className="text-[13px] font-bold text-ink">
                {theme.edit} · in production now
              </span>
            </div>
          </div>

          {/* the ring: grand orbit circle showing only the left half arc, with completely transparent/unfilled interior */}
          <div className="absolute top-[44%] aspect-square w-[min(82%,58vh,520px)] -translate-y-1/2 lg:right-[clamp(16px,2.5vw,52px)] lg:left-auto max-lg:right-1/2 max-lg:w-[min(74%,310px)] max-lg:translate-x-1/2 lg:translate-x-0">
            {/* SVG half-circle arc: animated flowing dashes along the circular orbit */}
            <svg
              viewBox="0 0 1000 1000"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full text-ink/30"
            >
              <defs>
                <linearGradient id="halfRingGrad" x1="0" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="10%" stopColor="currentColor" stopOpacity="0.85" />
                  <stop offset="90%" stopColor="currentColor" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="halfRingGlow" x1="0" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="25%" stopColor="#984080" stopOpacity="0.3" />
                  <stop offset="75%" stopColor="#984080" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Outer soft ambient arc track */}
              <path
                d="M 500 2 A 498 498 0 0 0 500 998"
                stroke="url(#halfRingGlow)"
                strokeWidth="5"
                strokeLinecap="round"
                className="opacity-35"
              />
              {/* Dynamic streaming dash arc */}
              <path
                d="M 500 2 A 498 498 0 0 0 500 998"
                stroke="url(#halfRingGrad)"
                strokeWidth="2.2"
                strokeDasharray="6 8"
                strokeLinecap="round"
                className="animate-[ring-dash-flow_3.2s_linear_infinite] motion-reduce:animate-none"
              />
            </svg>

            <ul aria-label="Styles in the spotlight" className="absolute inset-0 z-[2]">
              {spots.map((x, i) => {
                const on = i === cur;
                return (
                  <li
                    key={x.slug}
                    className="absolute -translate-1/2 transition-transform duration-500 animate-[swatch-idle-float_4.2s_ease-in-out_infinite] motion-reduce:animate-none"
                    style={{
                      ...onRing(ANGLES[i]),
                      animationDelay: `${i * 0.35}s`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-pressed={on}
                      aria-label={`Show ${x.p.name}`}
                      className={`group relative grid size-11 place-items-center rounded-full border-2 transition-all duration-300 lg:size-12 ${
                        on
                          ? "scale-115 border-brand shadow-float"
                          : "border-white shadow-soft hover:scale-115 hover:border-ink/40 hover:shadow-float"
                      }`}
                      style={{
                        background: x.tint,
                      }}
                    >
                      <span className="relative block size-[84%] transition-transform duration-300 group-hover:scale-110">
                        <Image src={x.p.outer.src} alt="" fill sizes="48px" className="-scale-x-100 object-contain drop-shadow-[0_2px_4px_rgb(0_0_0/.2)]" />
                      </span>
                      {/* Name tooltip */}
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-ink px-2 py-0.5 text-[13px] font-semibold text-white whitespace-nowrap opacity-0 shadow-soft transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1">
                        {x.p.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* the pair: 3D levitation with continuous ambient floating and interactive mouse tilt */}
          <div
            className="pointer-events-none absolute top-[44%] aspect-[1.35] w-[min(70%,50vh,490px)] -translate-y-1/2 lg:right-0 lg:left-auto lg:translate-x-2 max-lg:right-1/2 max-lg:w-[min(66%,310px)] max-lg:translate-x-[68%]"
            style={{ perspective: "1200px" }}
          >
            <div
              className="size-full transition-transform ease-out"
              style={{
                transform: reduced
                  ? undefined
                  : `rotateX(${(-tilt.y * 12).toFixed(2)}deg) rotateY(${(tilt.x * 14).toFixed(2)}deg) translateZ(12px)`,
                transitionDuration: tilt.x === 0 && tilt.y === 0 ? "600ms" : "150ms",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Continuous weightless levitation container */}
              <div className="size-full animate-[hero-shoe-levitate_5.5s_ease-in-out_infinite] motion-reduce:animate-none">
                {prev !== null && prev !== cur && (
                  <Pair key={`out-${prev}`} p={spots[prev].p} className="[animation:spot-out_650ms_cubic-bezier(.4,0,.2,1)_both]" />
                )}
                <Pair
                  key={`in-${cur}`}
                  p={s.p}
                  preload={cur === 0}
                  shadowOffset={tilt}
                  // the first pair is on screen from the first paint (it is the page's largest paint); later pairs fly in
                  className={reduced || !moved ? "rotate-[6deg]" : "[animation:spot-in_900ms_cubic-bezier(.22,1,.36,1)_both]"}
                />
              </div>
            </div>
          </div>

          {/* what is on show, and the controls */}
          <div className="absolute bottom-1 z-[3] flex items-center gap-2.5 lg:right-2 max-lg:right-1/2 max-lg:translate-x-1/2 animate-[hero-float-counter_5.8s_ease-in-out_infinite] motion-reduce:animate-none">
            <button
              type="button"
              onClick={() => go(cur - 1)}
              aria-label="Previous style"
              className="group grid size-11 place-items-center rounded-full border border-ink/10 bg-white text-ink shadow-soft transition-colors duration-300 hover:border-ink/40"
            >
              <Icon name="arrow" className="size-3.5 rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5" />
            </button>

            <div
              key={`info-${cur}`}
              className="relative flex items-center gap-3.5 overflow-hidden rounded-full border border-white/85 bg-white/85 px-4 py-2 shadow-[0_16px_36px_-10px_rgb(18_20_22/.16),0_0_0_1px_rgb(18_20_22/.05),inset_0_1px_1px_rgb(255_255_255/.9)] backdrop-blur-sm animate-rise-in motion-reduce:animate-none"
              aria-live="polite"
            >
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-muted">0{cur + 1}/0{spots.length}</span>
                  <span className="size-1 rounded-full bg-ink/20" />
                  <span className="text-[16px] font-semibold text-ink animate-rise-in">{s.p.name}</span>
                </div>
                <span className="text-[13px] text-muted whitespace-nowrap">
                  {LINE_LABEL[s.p.line]} · {categoryOf(s.p)} · <strong className="font-semibold text-ink-2">{MOQ_PAIRS} pairs</strong>
                </span>
              </div>

              {/* 5-Indicator Progress Track with glowing active pill */}
              <div className="flex items-center gap-1.5 px-0.5" aria-hidden="true">
                {spots.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Jump to style ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-400 ${
                      i === cur
                        ? "w-6 bg-brand"
                        : "w-1.5 bg-ink/20 hover:bg-ink/40 hover:scale-125"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => openQuickView(s.p.id)}
                className="group/btn hit-44 pointer-events-auto relative inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand"
              >
                <span className="relative z-[1] flex items-center gap-1">
                  <span>View</span>
                  <Icon name="arrow" className="size-3 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => go(cur + 1)}
              aria-label="Next style"
              className="group grid size-11 place-items-center rounded-full bg-ink text-white shadow-soft transition-colors duration-300 hover:bg-accent-hover"
            >
              <Icon name="arrow" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* every spotlight photo loads up front, so a switch never shows an empty stage */}
      <div aria-hidden="true" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
        {spots.map((x) => (
          <Image key={x.slug} src={x.p.outer.src} alt="" width={8} height={8} sizes="(min-width: 64rem) 50vw, 90vw" loading="eager" />
        ))}
      </div>

      {/* the three ways in with 3D depth and micro-interactions */}
      <nav aria-label="Shop by line" className="wrap relative z-[2] px-(--shell-pad) pt-8 pb-[clamp(20px,4vh,40px)]">
        <ul className="scrollbar-none flex snap-x gap-4 overflow-x-auto lg:grid lg:grid-cols-3 lg:gap-6">
          {cards.map((c, idx) => {
            const p = c.p;
            return (
              <li
                key={c.line}
                className="w-[min(82vw,340px)] shrink-0 snap-start lg:w-auto animate-rise-in motion-reduce:animate-none"
                style={{ animationDelay: `${320 + idx * 70}ms` }}
              >
                <Link
                  href={`/catalog?line=${c.line}`}
                  data-deco="card"
                  className="group relative flex h-[116px] overflow-hidden rounded-2xl border border-ink/[0.05] bg-tile text-ink shadow-[0_12px_32px_-20px_rgb(18_20_22/.25)] transition-all duration-400 ease-soft hover:-translate-y-2 hover:shadow-[0_24px_48px_-16px_rgb(18_20_22/.32),0_0_0_1px_rgb(152_64_128/.15)] hover:border-brand/25"
                >
                  <span className="relative block w-[42%] shrink-0 overflow-hidden" style={{ background: c.block }}>
                    {/* Subtle light sheen on hover */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/25 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
                    />
                    <span className="absolute inset-[10%_6%] block transition-transform duration-500 ease-soft group-hover:scale-115 group-hover:-rotate-4 group-hover:-translate-y-1">
                      <Image
                        src={p.outer.src}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-contain drop-shadow-[0_8px_10px_rgb(0_0_0/.25)] transition-all duration-500 group-hover:drop-shadow-[0_16px_22px_rgb(0_0_0/.38)]"
                      />
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col justify-center px-4">
                    <span className="font-headline text-[20px] leading-tight font-semibold transition-colors duration-200 group-hover:text-brand">{LINE_LABEL[c.line]}</span>
                    <span className="mt-0.5 truncate text-[13px] text-muted">{c.kinds}</span>
                    <span className="mt-2 flex items-center justify-between text-[13px] font-semibold">
                      <span>
                        {inLine(c.line).length} styles · {PACK}/case
                      </span>
                      <span className="inline-flex items-center gap-1 text-brand">
                        Shop <Icon name="arrow" className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-1.5" />
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}

/** Live prefers-reduced-motion (false on the server, so the first paint is the animated one). */
const REDUCE = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = matchMedia(REDUCE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => matchMedia(REDUCE).matches,
    () => false,
  );
}

function Pair({
  p,
  className,
  preload,
  shadowOffset,
}: {
  p: Product;
  className?: string;
  preload?: boolean;
  shadowOffset?: { x: number; y: number };
}) {
  return (
    <span className={`absolute inset-0 block origin-[52%_58%] ${className ?? ""}`}>
      {/* soft floor shadow with synchronized levitation breathing and mouse offset */}
      <span
        aria-hidden="true"
        className="absolute right-[14%] bottom-[6%] left-[10%] h-[9%] transition-transform duration-200 ease-out"
        style={
          shadowOffset
            ? {
                transform: `translate(${(-shadowOffset.x * 14).toFixed(1)}px, ${(-shadowOffset.y * 8).toFixed(1)}px)`,
              }
            : undefined
        }
      >
        <span className="block size-full rounded-[50%] bg-black/22 blur-[18px] animate-[hero-shadow-breathe_5.5s_ease-in-out_infinite] motion-reduce:animate-none" />
      </span>
      <Image
        src={p.outer.src}
        alt={`Chime Long ${p.name}: ${p.desc}`}
        fill
        preload={preload}
        sizes="(min-width: 64rem) 50vw, 90vw"
        className="-scale-x-100 object-contain drop-shadow-[0_26px_26px_rgb(18_20_22/.22)] will-change-transform"
      />
    </span>
  );
}

