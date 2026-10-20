"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { categoryOf, getProduct, inLine, LINE_LABEL, MOQ_PAIRS, PACK, products, type Product, type ProductLine } from "@/lib/products";
import { useUI } from "@/lib/store";

/** The styles that take turns on the stage, each with the soft colour the whole hero takes on behind it. */
const SPOT: { slug: string; bg: string }[] = [
  { slug: "toffee", bg: "#f3e7da" },
  { slug: "lynx", bg: "#efe9e2" },
  { slug: "nord", bg: "#e7e9ec" },
  { slug: "frost", bg: "#f2efe9" },
  { slug: "lilac", bg: "#efe7f4" },
];

const LINES: ProductLine[] = ["women", "men", "kids"];

const AUTOPLAY_MS = 5000;
const OUT_MS = 650;

/**
 * First view as a product launch: the pair on show stands large in the centre over its own name, set huge behind it,
 * and the whole hero takes on its colour. Each new pair renders out of a small circle while the old one slides away,
 * and a rail of thumbnails along the bottom shows what is next (a thin timer line fills under the active one). The
 * promise and the one action sit top left, the pair's details top right, the three lines bottom left. Loops on its own;
 * a button pauses it; still under reduced motion.
 */
export function HeroSpotlight() {
  const openQuickView = useUI((s) => s.openQuickView);
  const spots = SPOT.map((x) => ({ ...x, p: getProduct(x.slug) as Product })).filter((x) => x.p);
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const curRef = useRef(0);

  const go = useCallback(
    (next: number) => {
      const n = (next + spots.length) % spots.length;
      if (n === curRef.current) return;
      setPrev(curRef.current);
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
      if (!document.hidden) go(curRef.current + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [cur, paused, reduced, go]);

  useEffect(() => () => clearTimeout(outTimer.current), []);

  const s = spots[cur];

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="bleed relative isolate overflow-hidden text-ink transition-[background-color] duration-700 ease-soft"
      style={{ backgroundColor: s.bg }}
    >
      {/* light from the top, and a soft floor the pair stands over */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgb(255_255_255/.7),rgb(255_255_255/0))]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,rgb(255_255_255/0),rgb(255_255_255/.55))]" />

      <div className="wrap relative grid grid-cols-[minmax(0,1fr)] px-(--shell-pad) pt-[clamp(24px,4.5vh,52px)] pb-[clamp(20px,3.5vh,36px)] lg:min-h-[min(calc(100svh-112px),820px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-8">
        {/* top left: the promise and the one action */}
        <div className="relative z-[3] lg:col-start-1 lg:row-start-1 max-lg:text-center">
          <p className="inline-flex animate-rise-in items-center gap-2.5 text-[11.5px] font-bold tracking-[0.2em] text-ink-2 uppercase motion-reduce:animate-none">
            <span aria-hidden="true" className="h-px w-6 bg-brand" />
            FW26 wholesale
          </p>
          <h1
            id="hero-title"
            className="mt-3 animate-rise-in font-headline text-[clamp(30px,7.6vw,40px)] leading-[1.05] font-semibold tracking-[-0.015em] [animation-delay:70ms] motion-reduce:animate-none lg:text-[clamp(32px,2.6vw,46px)]"
          >
            Winter footwear,
            <br />
            <em className="font-medium text-brand">factory-direct.</em>
          </h1>
          <OpenInquiryButton className="mt-5 inline-flex h-12 animate-rise-in items-center gap-2 rounded-full bg-ink px-6 text-[12.5px] font-bold tracking-[0.1em] text-white uppercase transition-[background-color,translate] duration-300 ease-soft [animation-delay:140ms] hover:-translate-y-0.5 hover:bg-brand motion-reduce:animate-none">
            Get wholesale pricing <Icon name="arrow" className="size-3.5" />
          </OpenInquiryButton>
        </div>

        {/* top right: the pair on show */}
        <div key={`info-${cur}`} aria-live="polite" className="relative z-[3] animate-rise-in text-right motion-reduce:animate-none max-lg:hidden lg:col-start-3 lg:row-start-1">
          <p className="text-[12px] font-bold tracking-[0.16em] text-muted tabular-nums">
            0{cur + 1} <span className="text-ink/25">/ 0{spots.length}</span>
          </p>
          <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Chime Long {s.p.name}</p>
          <p className="mt-0.5 text-[13.5px] text-ink-2">
            {LINE_LABEL[s.p.line]} · {categoryOf(s.p)}
          </p>
          <p className="mt-3 text-[13px] text-muted">
            <b className="font-semibold text-ink">{MOQ_PAIRS} pairs</b> MOQ · {PACK} per case · {s.p.sizes}
          </p>
          <button
            type="button"
            onClick={() => openQuickView(s.p.id)}
            className="group mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-5 text-[12px] font-bold tracking-[0.1em] uppercase backdrop-blur-md transition-colors hover:border-ink hover:bg-white"
          >
            View style <Icon name="arrow" className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* the stage: the name huge behind, the pair large in front */}
        <div className="relative min-h-[clamp(300px,40vh,420px)] lg:col-span-3 lg:col-start-1 lg:row-start-1 lg:row-end-4 lg:min-h-0">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-[58%] overflow-hidden text-center">
            <span
              key={`name-${cur}`}
              className="inline-block text-[clamp(96px,22vw,360px)] leading-[0.85] font-extrabold tracking-[-0.05em] text-white/75 uppercase [animation:word-in_800ms_cubic-bezier(.22,1,.36,1)_both] motion-reduce:animate-none"
            >
              {s.p.name}
            </span>
          </div>

          {/* the little circle the new pair renders out of */}
          {!reduced && (
            <span
              key={`pulse-${cur}`}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 size-[min(44vw,420px)] rounded-full border-2 border-brand/40 [animation:spot-pulse_800ms_cubic-bezier(.22,1,.36,1)_both]"
            />
          )}

          <div className="pointer-events-none absolute top-1/2 left-1/2 aspect-[1.35] w-[min(92%,58vh,700px)] -translate-x-1/2 -translate-y-[52%]">
            <div className="absolute inset-0 animate-[spot-float_5s_ease-in-out_infinite] motion-reduce:animate-none">
              {prev !== null && prev !== cur && (
                <Pair key={`out-${prev}`} p={spots[prev].p} className="[animation:spot-out_650ms_cubic-bezier(.4,0,.2,1)_both]" />
              )}
              <Pair key={`in-${cur}`} p={s.p} preload={cur === 0} className={reduced ? "-rotate-[8deg]" : "[animation:spot-in_900ms_cubic-bezier(.22,1,.36,1)_both]"} />
            </div>
            <span aria-hidden="true" className="absolute right-[16%] bottom-[2%] left-[16%] h-[8%] rounded-[50%] bg-ink/20 blur-[18px]" />
          </div>
        </div>

        {/* phones: the pair's name under the stage */}
        <div key={`m-${cur}`} className="relative z-[3] -mt-2 animate-rise-in text-center motion-reduce:animate-none lg:hidden">
          <p className="text-[18px] font-semibold">Chime Long {s.p.name}</p>
          <button type="button" onClick={() => openQuickView(s.p.id)} className="mt-0.5 inline-flex h-9 items-center gap-1.5 text-[13px] text-ink-2">
            {categoryOf(s.p)} · {MOQ_PAIRS} pairs MOQ <Icon name="arrow" className="size-3.5" />
          </button>
        </div>

        {/* bottom left: the three lines */}
        <nav aria-label="Shop by line" className="relative z-[3] self-end lg:col-start-1 lg:row-start-3 max-lg:order-last max-lg:mt-6">
          <p className="text-[11px] font-bold tracking-[0.18em] text-muted uppercase max-lg:text-center">Shop by line</p>
          <ul className="mt-2 flex gap-2 max-lg:justify-center lg:flex-col lg:gap-0.5">
            {LINES.map((l) => (
              <li key={l}>
                <Link
                  href={`/catalog?line=${l}`}
                  className="group inline-flex h-10 items-baseline gap-2 rounded-full text-[18px] font-semibold tracking-[-0.01em] transition-colors hover:text-brand max-lg:items-center max-lg:bg-white/60 max-lg:px-4 max-lg:text-[14px]"
                >
                  {LINE_LABEL[l]}
                  <span className="text-[12px] font-medium text-muted tabular-nums max-lg:hidden">{l === "men" ? "new" : inLine(l).length}</span>
                  <Icon name="arrow" className="size-3.5 self-center opacity-0 transition-[opacity,translate] duration-300 ease-soft group-hover:translate-x-0.5 group-hover:opacity-100 max-lg:hidden" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* bottom centre: what is on, what is next */}
        <div className="relative z-[3] flex items-end justify-center gap-2 self-end lg:col-start-2 lg:row-start-3 max-lg:mt-4">
          <ul aria-label="Styles on the stage" className="flex gap-2">
            {spots.map((x, i) => {
              const on = i === cur;
              return (
                <li key={x.slug}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-pressed={on}
                    aria-label={`Show ${x.p.name}`}
                    className={`relative block size-[clamp(52px,5vw,72px)] overflow-hidden rounded-2xl transition-[background-color,box-shadow,translate] duration-300 ease-soft ${on ? "-translate-y-1 bg-white shadow-[0_12px_24px_-12px_rgb(18_20_22/.35)]" : "bg-white/45 hover:bg-white/80"}`}
                  >
                    <span className="absolute inset-[14%] block">
                      <Image src={x.p.outer.src} alt="" fill sizes="72px" className="object-contain" />
                    </span>
                    {on && (
                      <span aria-hidden="true" className="absolute inset-x-2.5 bottom-1.5 h-[2px] overflow-hidden rounded-full bg-ink/10">
                        <span
                          key={`t-${cur}`}
                          className="block h-full origin-left bg-brand"
                          style={reduced ? { transform: "scaleX(1)" } : { animation: `spot-progress ${AUTOPLAY_MS}ms linear both`, animationPlayState: paused ? "paused" : "running" }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* the slideshow loops on its own; this stops it (WCAG 2.2.2) */}
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-pressed={paused}
              aria-label={paused ? "Play the slideshow" : "Pause the slideshow"}
              className="ml-1 grid size-11 place-items-center self-center rounded-full bg-white/60 text-ink-2 backdrop-blur-md transition-colors hover:bg-white hover:text-ink"
            >
              <Icon name={paused ? "play" : "pause"} className="size-3.5" />
            </button>
          )}
        </div>

        {/* bottom right: the range at a glance */}
        <div className="relative z-[3] self-end text-right max-lg:hidden lg:col-start-3 lg:row-start-3">
          <Link href="/catalog" className="group inline-flex h-10 items-center gap-2 text-[14px] font-semibold">
            Browse all {products.length} styles
            <Icon name="arrow" className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
          </Link>
          <p className="text-[12.5px] text-muted">Samples in 10 days · shipped worldwide</p>
        </div>
      </div>

      {/* every spotlight photo loads up front, so a switch never shows an empty stage */}
      <div aria-hidden="true" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
        {spots.map((x) => (
          <Image key={x.slug} src={x.p.outer.src} alt="" width={8} height={8} sizes="(min-width: 64rem) 50vw, 90vw" loading="eager" />
        ))}
      </div>
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

function Pair({ p, className, preload }: { p: Product; className?: string; preload?: boolean }) {
  return (
    <span className={`absolute inset-0 block origin-[52%_58%] ${className ?? ""}`}>
      <Image
        src={p.outer.src}
        alt={`Chime Long ${p.name}: ${p.desc}`}
        fill
        preload={preload}
        sizes="(min-width: 64rem) 50vw, 92vw"
        className="-scale-x-100 object-contain drop-shadow-[0_30px_30px_rgb(18_20_22/.22)]"
      />
    </span>
  );
}
