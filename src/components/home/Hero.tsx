"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { categoryOf, collapse, groupOf, LINE_LABEL, products, type Product, type ProductLine } from "@/lib/products";
import { useUI } from "@/lib/store";

/**
 * Optical size on the shelf, as a share of the shelf's shoe height: a knee boot stands tallest, a sandal sits low.
 * Sizing by height (not width) keeps the lineup even, the way a merchandiser would set it.
 */
function heightOf(p: Product) {
  const c = categoryOf(p);
  const kind = /Tall/.test(c) ? 1.18 : /boots/i.test(c) ? 0.92 : /Sneakers/.test(c) ? 0.66 : /Sandals/.test(c) ? 0.5 : 0.56;
  return kind * (p.line === "kids" ? 0.84 : p.line === "men" ? 1.04 : 1);
}
const TALLEST = 1.18;

/** One pair of every kind of shoe in the range (its sharpest photo); the lines take turns so neighbours differ. */
const LINEUP: Product[] = (() => {
  const leads = collapse(products).map((p) => groupOf(p).reduce((a, b) => (b.outer.w > a.outer.w ? b : a)));
  const byLine = (l: ProductLine) => leads.filter((p) => p.line === l);
  const women = byLine("women");
  const others = [...byLine("kids"), ...byLine("men")];
  const out: Product[] = [];
  while (women.length || others.length) {
    if (women.length) out.push(women.shift()!);
    if (women.length) out.push(women.shift()!);
    if (others.length) out.push(others.shift()!);
  }
  return out;
})();
/** Distinct styles in the range, for the eyebrow. */
const STYLE_COUNT = collapse(products).length;
/** Seconds each pair takes to cover one spacing on the shelf, so the drift stays slow and even. */
const PACE = 4.6;
/** Clear space kept between the text column and the tallest pair on the shelf beneath it. */
const AIR = 24;
/** Where the V bottoms out, as a share of the width: the right arm is the last third. */
const VERTEX = 2 / 3;

type Geo = {
  w: number;
  h: number;
  /** shoe height unit, px */
  unit: number;
  /** the shelf line: start (off-frame left), the low point, end (off-frame right) */
  pts: [number, number][];
  /** pairs riding the shelf at once */
  n: number;
  /** desktop: where the text block sits (centred over the V's low point), relative to the hero */
  text: { left: number; top: number; cx: number; cy: number } | null;
};

/**
 * First view: the range rides a V-shaped shelf, down a long left arm to a low point two-thirds across and up a short
 * right arm, on the oak edge of a warm stone counter. Any pair opens its details. The headline and the one action sit
 * centred in the cup of the V under a warm light; the V is solved around them so no pair ever rises into the text.
 */
export function Hero() {
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [geo, setGeo] = useState<Geo | null>(null);
  /** which style each slot on the shelf shows; a slot moves on to a new style each time it leaves the frame */
  const [slots, setSlots] = useState<number[]>([]);
  const openQuickView = useUI((s) => s.openQuickView);
  const root = useRef<HTMLElement>(null);
  const column = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    const col = column.current;
    if (!el || !col) return;
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const fit = () => {
      const r = el.getBoundingClientRect();
      const c = col.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      const desktop = matchMedia("(min-width: 54rem)").matches;
      const unit = desktop ? Math.min(innerWidth * 0.105, innerHeight * 0.18, 180) : Math.min(innerWidth * 0.27, 170);
      const xV = w * VERTEX;
      const yV = Math.min(h * 0.9, h - 40);

      // the text block: on desktop it sits in the cup of the V, centred over the low point, inside the page frame
      let box: { l: number; r: number; b: number };
      let text: Geo["text"] = null;
      if (desktop) {
        const pad = Math.min(48, Math.max(16, innerWidth * 0.032));
        const inL = Math.max(0, (w - 1440) / 2) + pad;
        const inR = w - inL;
        const top = Math.max(48, h * 0.11);
        const left = Math.min(Math.max(xV - c.width / 2, inL), inR - c.width);
        text = { left, top, cx: left + c.width / 2, cy: top + c.height / 2 };
        box = { l: left, r: left + c.width, b: top + c.height };
      } else {
        box = { l: c.left - r.left, r: c.right - r.left, b: c.bottom - r.top };
      }

      // the shelf line may not come higher than this anywhere under the text (pairs stand on it)
      const floor = box.b + AIR + unit * TALLEST;
      let yL = h * (desktop ? 0.42 : 0.6);
      let yR = h * (desktop ? 0.6 : 0.74);
      if (desktop) {
        // the arms rise away from the low point, so they come closest to the text at the column's edges
        const xl = box.l - unit * 0.55;
        if (xl > 0 && xl < xV) {
          const t = xl / xV;
          yL = Math.max(yL, (floor - yV * t) / (1 - t));
        }
        const xr = box.r + unit * 0.55;
        if (xr > xV) {
          const t = Math.min(1, (xr - xV) / (w - xV));
          yR = Math.max(yR, yV - (yV - floor) / t);
        }
      } else {
        yL = Math.max(yL, floor);
        yR = Math.max(yR, floor);
      }
      yL = Math.min(yL, yV - 24);
      yR = Math.min(yR, yV - 24); // keep it a V

      // extend both arms off-frame so pairs enter and leave out of sight
      const ext = w * 0.18;
      const sL = (yV - yL) / xV;
      const sR = (yR - yV) / (w - xV);
      const pts: [number, number][] = [
        [-ext, yL - sL * ext],
        [xV, yV],
        [w + ext, yR + sR * ext],
      ];
      const len = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) + Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      const n = Math.max(4, Math.min(LINEUP.length, Math.round(len / (unit * 1.45))));
      setGeo({ w, h, unit, pts, n, text });
      setSlots((s) => (s.length === n ? s : Array.from({ length: n }, (_, i) => i)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    ro.observe(col); // web fonts landing change the column's size
    return () => ro.disconnect();
  }, []);

  const path = geo ? `M${geo.pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}` : "";
  const dur = geo ? geo.n * PACE : 0;
  const paused = stopped || held;
  const next = (slot: number) => setSlots((s) => s.map((v, i) => (i === slot ? (v + s.length) % LINEUP.length : v)));

  return (
    <section
      ref={root}
      id="hero"
      aria-labelledby="hero-title"
      className="bleed relative isolate h-[calc(100svh-112px)] max-h-[1080px] min-h-[720px] overflow-hidden bg-[linear-gradient(180deg,#f8f7f4_0%,#f2f0eb_60%,#ece9e3_100%)]"
    >
      {/* soft studio light from above: depth without a spotlight blob */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(70%_90%_at_60%_0%,rgb(255_255_255/.95),rgb(255_255_255/0))]" />

      {/* the V: oak edge on a stone counter that fills everything below it */}
      {geo && (
        <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="hero-stone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ebe6dd" />
              <stop offset="1" stopColor="#e0d9cd" />
            </linearGradient>
            <linearGradient id="hero-oak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d8c3a2" />
              <stop offset="1" stopColor="#c4a882" />
            </linearGradient>
          </defs>
          {/* counter body */}
          <polygon points={`${geo.pts.map(([x, y]) => `${x},${y + 20}`).join(" ")} ${geo.w * 1.2},${geo.h + 40} ${-geo.w * 0.2},${geo.h + 40}`} fill="url(#hero-stone)" />
          {/* shadow under the edge, oak edge, lit top face */}
          <polyline points={geo.pts.map(([x, y]) => `${x},${y + 23}`).join(" ")} fill="none" stroke="rgb(70 52 30 / .1)" strokeWidth="8" strokeLinejoin="round" />
          <polyline points={geo.pts.map(([x, y]) => `${x},${y + 13}`).join(" ")} fill="none" stroke="url(#hero-oak)" strokeWidth="12" strokeLinejoin="round" />
          <polyline points={geo.pts.map(([x, y]) => `${x},${y + 3.5}`).join(" ")} fill="none" stroke="#fbf8f2" strokeWidth="7" strokeLinejoin="round" />
        </svg>
      )}

      {/* a faint white haze in the cup of the V keeps the text clean over the shelf */}
      {geo?.text && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-[min(900px,62vw)] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/.7),rgb(255_255_255/0))]"
          style={{ left: geo.text.cx, top: geo.text.cy }}
        />
      )}

      {/* the pairs ride the shelf line left to right; each slot takes the next style every time it leaves the frame */}
      {geo && (
        <div className="mask-fade-x absolute inset-0 z-[1]">
          {slots.map((pi, slot) => {
            const p = LINEUP[pi];
            const h = geo.unit * heightOf(p);
            const at = `${(((slot + 0.5) / geo.n) * 100).toFixed(2)}%`;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => openQuickView(p.id)}
                onMouseEnter={() => (setHover(slot), setHeld(true))}
                onMouseLeave={() => (setHover(null), setHeld(false))}
                onFocus={() => setHeld(true)}
                onBlur={() => setHeld(false)}
                onAnimationIteration={() => next(slot)}
                aria-label={`Chime Long ${p.name}, ${p.type}, ${LINE_LABEL[p.line]}. View details`}
                className="group absolute top-0 left-0 block outline-offset-8"
                style={{
                  height: h,
                  aspectRatio: `${p.outer.w} / ${p.outer.h}`,
                  offsetPath: `path('${path}')`,
                  offsetRotate: "0deg",
                  offsetAnchor: "50% 100%",
                  ...(reduced
                    ? { offsetDistance: at }
                    : { animation: `ride ${dur}s linear ${(-(slot / geo.n) * dur).toFixed(2)}s infinite`, animationPlayState: paused ? "paused" : "running" }),
                }}
              >
                <Image
                  src={p.outer.src}
                  alt=""
                  fill
                  sizes="(max-width: 864px) 50vw, 300px"
                  className="object-contain object-bottom drop-shadow-[0_16px_12px_rgb(40_30_18/.2)] transition-[translate] duration-500 ease-soft group-hover:-translate-y-2 group-focus-visible:-translate-y-2"
                />
                {/* contact shadow on the edge */}
                <span aria-hidden="true" className="absolute inset-x-[10%] -bottom-1 h-2 rounded-[50%] bg-[rgb(40_30_18/.3)] blur-[3px]" />
                {/* name tag while pointed at */}
                <span
                  className={`pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-[2] -translate-x-1/2 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap shadow-soft transition-[opacity,translate] duration-300 ease-soft group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${hover === slot ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
                >
                  Chime Long {p.name} <span className="font-medium text-muted">· {categoryOf(p)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* eyebrow, headline, one line of who it's for, two actions; centred in the cup of the V on desktop, above it on phones */}
      <div
        className="relative z-[2] px-(--shell-pad) pt-[clamp(24px,4vh,56px)] md:absolute md:top-[11%] md:right-[8%] md:p-0"
        style={geo?.text ? { left: geo.text.left, top: geo.text.top, right: "auto" } : undefined}
      >
        <div ref={column} className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center md:w-fit md:max-w-none">
          <p className="inline-flex animate-rise-in items-center gap-2 rounded-full bg-white/85 py-1.5 pr-3.5 pl-2.5 text-[13px] font-semibold text-ink-2 shadow-soft ring-1 ring-ink/5 motion-reduce:animate-none">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
            FW26 wholesale range · {STYLE_COUNT} styles
          </p>
          {/* grotesk display in ink; the last word picks up a serif italic in the logo's purple */}
          <h1
            id="hero-title"
            className="mt-5 animate-rise-in text-[clamp(36px,9.4vw,48px)] leading-[1] font-semibold tracking-[-0.04em] text-balance text-ink [animation-delay:80ms] motion-reduce:animate-none md:mt-6 md:text-[clamp(40px,min(4vw,7.2vh),70px)] md:leading-[0.98]"
          >
            <span className="md:block md:whitespace-nowrap">Factory-direct footwear </span>
            <span className="md:block md:whitespace-nowrap">
              for North American{" "}
              <em className="pr-[0.04em] font-display font-normal tracking-[-0.025em] text-brand">shelves.</em>
            </span>
          </h1>
          <p className="mt-4 max-w-[30rem] animate-rise-in text-[15px] leading-[1.55] text-pretty text-ink-2 [animation-delay:160ms] motion-reduce:animate-none md:mt-5 md:text-[17px]">
            Winter boots, sneakers and sandals for retailers, distributors and private-label brands across the US and Canada.
          </p>
          <div className="mt-6 flex animate-rise-in flex-wrap justify-center gap-3 [animation-delay:240ms] motion-reduce:animate-none md:mt-7">
            <OpenInquiryButton className="btn btn-dark shadow-[0_10px_24px_-12px_rgb(18_20_22/.6)]">
              Get wholesale pricing <Icon name="arrow" className="size-4" />
            </OpenInquiryButton>
            <a href="#styles" className="btn btn-line bg-white/80 max-sm:hidden">
              Browse the range
            </a>
          </div>
        </div>
      </div>

      {/* pause the drift (WCAG 2.2.2), on the page grid */}
      <div className="absolute inset-x-0 bottom-[clamp(10px,2.2vh,22px)] z-[3] motion-reduce:hidden">
        <div className="wrap px-(--shell-pad)">
          <button
            type="button"
            onClick={() => setStopped((v) => !v)}
            aria-pressed={stopped}
            aria-label={stopped ? "Play the shelf" : "Pause the shelf"}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white/85 pr-3.5 pl-1.5 text-[13px] font-semibold text-ink-2 shadow-soft backdrop-blur-sm transition-colors hover:text-ink"
          >
            <span className="grid size-6 place-items-center rounded-full bg-ink text-white">
              <Icon name={stopped ? "play" : "pause"} className="size-3" />
            </span>
            {stopped ? "Play" : "Pause"}
          </button>
        </div>
      </div>
    </section>
  );
}
