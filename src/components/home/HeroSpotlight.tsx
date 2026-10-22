"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { useSeason } from "../season/SeasonContext";
import { categoryOf, getProduct, inLine, LINE_LABEL, MOQ_PAIRS, PACK, type Product, type ProductLine } from "@/lib/products";
import { SEASONS } from "@/lib/season";
import { lineFor, seasonPicks } from "@/lib/season-products";
import { useUI } from "@/lib/store";

/** How many of the season's styles take turns in the spotlight, each with a glow tint from the season's theme. */
const SPOT_COUNT = 5;

/** The three ways in, along the bottom; each shows its line's best pair for the season. `kinds` is the fallback. */
const CARDS: { line: ProductLine; slug: string; block: string; kinds: string }[] = [
  { line: "women", slug: "maple", block: "#f6e4e6", kinds: "Ankle, chelsea and tall boots" },
  { line: "men", slug: "nord", block: "#e2eaf2", kinds: "Leather lace-up boots" },
  { line: "kids", slug: "blossom", block: "#e5efdd", kinds: "Snow boots and hikers" },
];

const LINKS = [
  { href: "/shipping", label: "Shipping" },
  { href: "/private-label", label: "Private label" },
  { href: "/faq", label: "FAQ" },
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

      {/* side links, set vertically like a magazine spine */}
      <nav aria-label="Buying information" className="absolute top-1/2 left-[clamp(10px,1.6vw,28px)] z-[3] -translate-y-1/2 max-lg:hidden">
        <ul className="flex flex-col items-center gap-7">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group relative block py-2 text-[12px] font-semibold tracking-[0.16em] text-muted uppercase transition-all duration-300 [writing-mode:vertical-rl] rotate-180 hover:text-ink hover:-translate-x-0.5"
              >
                <span className="relative z-[1]">{l.label}</span>
                <span
                  aria-hidden="true"
                  className="absolute right-0 bottom-0 top-0 w-0.5 bg-brand scale-y-0 transition-transform duration-300 origin-bottom group-hover:scale-y-100"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="wrap relative grid grid-cols-[minmax(0,1fr)] gap-y-4 px-(--shell-pad) pt-[clamp(20px,4vh,60px)] lg:min-h-[min(calc(100svh-112px-140px),700px)] lg:grid-cols-[minmax(0,5.2fr)_minmax(0,6.8fr)] lg:gap-y-6 lg:pl-[clamp(48px,6vw,104px)]">
        {/* the promise */}
        <div className="relative z-[2] self-center max-lg:text-center lg:-translate-y-10">
          <p data-hero-in="eyebrow" className="eyebrow">
            <Icon name={theme.icon} className="size-4! text-season" />
            {theme.edit} · wholesale
          </p>
          <h1
            id="hero-title"
            className="mt-4 font-headline text-[clamp(38px,9.4vw,46px)] leading-[1.04] font-semibold tracking-[-0.02em] text-balance text-ink lg:text-[clamp(44px,4.4vw,74px)]"
          >
            Factory-direct footwear, <em className="font-medium text-brand">for shelves worldwide.</em>
          </h1>
          <p data-hero-in="copy" className="mt-5 max-w-[26rem] text-[15.5px] leading-[1.6] text-ink-2 max-lg:mx-auto lg:text-[16.5px]">
            Boots, sneakers and sandals from our Guangzhou factory, for retailers and distributors in every market.
          </p>
          <div data-hero-in="cta" className="mt-8 flex flex-wrap items-center gap-3 max-lg:justify-center">
            <OpenInquiryButton className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[14px] font-semibold text-white shadow-[0_14px_30px_-14px_rgb(18_20_22/.6)] transition-[background-color,translate] duration-300 ease-soft hover:-translate-y-0.5 hover:bg-brand">
              Get wholesale pricing <Icon name="arrow" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </OpenInquiryButton>
            <a href="#hot" className="glass inline-flex h-12 items-center rounded-full px-6 text-[14px] font-semibold text-ink transition-[translate] duration-300 ease-soft hover:-translate-y-0.5">
              See what&rsquo;s hot
            </a>
          </div>
          {/* what asking costs: nothing. Said once, plainly, beside the first ask */}
          <p data-hero-in="copy" className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted max-lg:justify-center">
            <Icon name="check" className="size-3.5 text-brand" /> Free quote, no payment
            <span aria-hidden="true" className="text-ink/20">·</span> Reply within 24 hours
            <span aria-hidden="true" className="text-ink/20">·</span> From {MOQ_PAIRS} pairs per style
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
            <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/80 px-3.5 py-1.5 shadow-[0_12px_28px_-8px_rgb(18_20_22/.12),0_0_0_1px_rgb(18_20_22/.04),inset_0_1px_1px_rgb(255_255_255/.9)] backdrop-blur-xl animate-[hero-float-soft_4.8s_ease-in-out_infinite] motion-reduce:animate-none">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-brand/60 opacity-75 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
              <span className="text-[12px] font-bold tracking-[0.06em] text-ink uppercase">
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
                          ? "scale-115 border-brand shadow-[0_0_0_4px_rgb(152_64_128/.25),0_16px_32px_-4px_rgb(152_64_128/.35)]"
                          : "border-white shadow-soft hover:scale-115 hover:border-ink/40 hover:shadow-float"
                      }`}
                      style={{
                        background: x.tint,
                        boxShadow: on
                          ? `0 0 0 4px ${x.tint}55, 0 0 22px ${x.tint}88, 0 14px 28px -4px rgba(0,0,0,0.3)`
                          : undefined,
                      }}
                    >
                      {on && (
                        <>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-2 rounded-full border border-brand/40 animate-ping opacity-60 motion-reduce:hidden"
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-1 rounded-full border border-white/60 animate-pulse opacity-75"
                          />
                        </>
                      )}
                      <span className="relative block size-[84%] transition-transform duration-300 group-hover:scale-110">
                        <Image src={x.p.outer.src} alt="" fill sizes="48px" className="-scale-x-100 object-contain drop-shadow-[0_2px_4px_rgb(0_0_0/.2)]" />
                      </span>
                      {/* Name tooltip */}
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-ink/90 backdrop-blur-md px-2 py-0.5 text-[12px] font-semibold text-white whitespace-nowrap opacity-0 shadow-soft transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1">
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
              className="group grid size-10 place-items-center rounded-full border border-ink/10 bg-white/80 text-ink shadow-[0_8px_20px_-6px_rgb(18_20_22/.12)] backdrop-blur-xl transition-all duration-300 hover:border-brand hover:text-brand hover:scale-110 hover:bg-white active:scale-95"
            >
              <Icon name="arrow" className="size-3.5 rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5" />
            </button>

            <div
              key={`info-${cur}`}
              className="relative flex items-center gap-3.5 overflow-hidden rounded-full border border-white/85 bg-white/85 px-4 py-2 shadow-[0_16px_36px_-10px_rgb(18_20_22/.16),0_0_0_1px_rgb(18_20_22/.05),inset_0_1px_1px_rgb(255_255_255/.9)] backdrop-blur-xl animate-rise-in motion-reduce:animate-none"
              aria-live="polite"
            >
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold tracking-[0.16em] text-muted uppercase">0{cur + 1}/0{spots.length}</span>
                  <span className="size-1 rounded-full bg-ink/20" />
                  <span className="text-[15px] font-extrabold tracking-[-0.01em] text-ink uppercase animate-rise-in">{s.p.name}</span>
                </div>
                <span className="text-[11.5px] text-muted whitespace-nowrap">
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
                        ? "w-6 bg-brand shadow-[0_0_8px_rgb(152_64_128/.6)]"
                        : "w-1.5 bg-ink/20 hover:bg-ink/40 hover:scale-125"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => openQuickView(s.p.id)}
                className="group/btn pointer-events-auto relative overflow-hidden inline-flex h-7 items-center gap-1 rounded-full bg-brand px-3 text-[12px] font-bold tracking-[0.08em] text-white uppercase shadow-[0_6px_14px_-5px_rgb(152_64_128/.6)] transition-all hover:bg-brand-deep hover:scale-105 active:scale-95"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[button-sheen_4s_ease-in-out_infinite] motion-reduce:hidden"
                />
                <span className="relative z-[1] flex items-center gap-1">
                  <span>View</span>
                  <Icon name="arrow" className="size-2.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => go(cur + 1)}
              aria-label="Next style"
              className="group grid size-10 place-items-center rounded-full bg-ink text-white shadow-[0_8px_20px_-6px_rgb(18_20_22/.25)] transition-all duration-300 hover:bg-accent-hover hover:scale-110 active:scale-95"
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
      <nav aria-label="Shop by line" className="wrap relative z-[2] px-(--shell-pad) pt-8 pb-[clamp(20px,4vh,40px)] lg:pl-[clamp(48px,6vw,104px)]">
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
                    <span className="mt-0.5 truncate text-[12.5px] text-muted">{c.kinds}</span>
                    <span className="mt-2 flex items-center justify-between text-[12.5px] font-semibold">
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

