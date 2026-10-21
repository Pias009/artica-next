"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { categoryOf, getProduct, LINE_LABEL, MOQ_PAIRS, PACK, type Product, type ProductLine } from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

/** Just in for FW26 (client placeholder list). */
const NEW_ARRIVAL_SLUGS = ["tundra", "pop", "zinnia", "lynx", "toffee", "frost", "blossom", "bluebell"];

const AUTOPLAY_MS = 5000;

type Filter = "all" | ProductLine;
const FILTERS: Filter[] = ["all", "women", "men", "kids"];

/** Computed once: the list never changes while the page is open. */
const ALL = NEW_ARRIVAL_SLUGS.map(getProduct).filter((p): p is Product => !!p);
const inFilter = (f: Filter) => (f === "all" ? ALL : ALL.filter((p) => p.line === f));

/**
 * New arrivals in one glass container: the featured style large on the left, over a glow in its own colour, with its
 * terms and the two actions; every new style as a tile on the right, and a tile features it. Autoplays through the
 * list (a thin timer line, a pause button), swipes on touch, and the line filters sit in the heading row.
 */
export function NewArrivals() {
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState(ALL[0]?.id ?? "");
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();
  const touchX = useRef<number | null>(null);

  const openQuickView = useUI((s) => s.openQuickView);
  const toggle = useInquiry((s) => s.toggle);

  const items = inFilter(filter);
  const index = Math.max(0, items.findIndex((p) => p.id === activeId));
  const p = items[index] ?? ALL[0];
  const inList = useInCart(p?.id ?? "");
  const still = paused || hover || reduced;

  useEffect(() => {
    if (still) return;
    const ids = inFilter(filter).map((x) => x.id);
    if (ids.length <= 1) return;
    const t = setInterval(() => {
      if (!document.hidden) setActiveId((cur) => ids[(Math.max(0, ids.indexOf(cur)) + 1) % ids.length]);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [still, filter, activeId]);

  const step = (d: 1 | -1) => setActiveId(items[(index + d + items.length) % items.length].id);

  if (!p) return null;

  return (
    <section id="new" aria-labelledby="h-new" className="mt-sec scroll-mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 md:mb-10">
        <div>
          <p className="eyebrow">New arrivals</p>
          <h2 id="h-new" className="type-section mt-3">
            Just landed for <em>FW26.</em>
          </h2>
        </div>
        <div role="tablist" aria-label="Filter new arrivals by line" className="glass inline-flex rounded-full p-1">
          {FILTERS.map((f) => {
            const on = f === filter;
            const n = inFilter(f).length;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={on}
                disabled={n === 0}
                onClick={() => {
                  setFilter(f);
                  setActiveId(inFilter(f)[0]?.id ?? "");
                }}
                className={`h-10 rounded-full px-4 text-[13.5px] font-semibold transition-colors disabled:opacity-40 ${on ? "bg-ink text-white" : "text-ink-2 hover:text-ink"}`}
              >
                {f === "all" ? "All" : LINE_LABEL[f]}
                <span className={`ml-1.5 text-[11.5px] tabular-nums ${on ? "text-white/60" : "text-muted"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="glass overflow-hidden rounded-[28px]"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <div className="grid grid-cols-[minmax(0,1fr)] lg:h-[clamp(560px,72vh,660px)] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {/* the featured style */}
          <div
            className="relative flex min-h-[460px] flex-col lg:min-h-0"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-[background] duration-700"
              style={{ background: `radial-gradient(60% 55% at 50% 45%, ${p.color.hex}2e, transparent 72%)` }}
            />

            <div className="relative z-[2] flex items-center justify-between p-5 sm:p-7">
              <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-semibold text-brand">New</span>
              <span className="text-[12px] font-bold tracking-[0.16em] text-muted tabular-nums">
                {String(index + 1).padStart(2, "0")} <span className="text-ink/25">/ {String(items.length).padStart(2, "0")}</span>
              </span>
            </div>

            {/* the pair */}
            <div className="relative mx-auto min-h-[200px] w-[min(86%,560px)] flex-1">
              <span key={p.id} className="absolute inset-0 block animate-[slide-in-r_700ms_cubic-bezier(.22,1,.36,1)_both] motion-reduce:animate-none">
                <Image
                  src={p.outer.src}
                  alt={p.desc}
                  fill
                  sizes="(min-width: 74rem) 40vw, 86vw"
                  className="-scale-x-100 object-contain drop-shadow-[0_28px_26px_rgb(18_20_22/.2)]"
                />
              </span>
              <span aria-hidden="true" className="absolute right-[18%] bottom-[4%] left-[18%] h-[7%] rounded-[50%] bg-ink/15 blur-[16px]" />
            </div>

            {/* what it is, and what to do */}
            <div key={`d-${p.id}`} aria-live="polite" className="relative z-[2] animate-rise-in p-5 motion-reduce:animate-none sm:p-7">
              <p className="text-[12.5px] font-semibold tracking-[0.12em] text-muted uppercase">
                {LINE_LABEL[p.line]} · {categoryOf(p)}
              </p>
              <h3 className="mt-1.5 font-headline text-[30px] leading-[1.05] font-semibold tracking-[-0.015em] sm:text-[38px]">Chime Long {p.name}</h3>
              <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-full ring-2 ring-white" style={{ background: p.color.hex }} />
                  {p.color.name}
                </span>
                <span className="text-ink/20">·</span>
                <span>
                  <b className="font-semibold text-ink">{MOQ_PAIRS} pairs</b> MOQ
                </span>
                <span className="text-ink/20">·</span>
                <span>{PACK} per case</span>
                <span className="text-ink/20">·</span>
                <span>{p.sizes}</span>
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={inList}
                  className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-white transition-colors ${inList ? "bg-brand" : "bg-ink hover:bg-brand"}`}
                >
                  <Icon name={inList ? "check" : "plus"} className="size-4" />
                  {inList ? "On your inquiry list" : "Add to inquiry"}
                </button>
                <button
                  type="button"
                  onClick={() => openQuickView(p.id)}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white/70 px-6 text-[14px] font-semibold text-ink transition-colors hover:bg-white"
                >
                  Quick view <Icon name="arrow" className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* every new style */}
          <div className="flex min-h-0 flex-col border-ink/8 max-lg:border-t lg:border-l">
            <ul
              aria-label="New styles"
              className="scrollbar-none grid min-h-0 flex-1 auto-cols-[minmax(150px,42%)] grid-flow-col gap-1.5 overflow-x-auto p-3 sm:p-4 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-2 lg:grid-rows-4 lg:overflow-hidden"
            >
              {items.map((x) => {
                const on = x.id === p.id;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(x.id)}
                      aria-pressed={on}
                      aria-label={`Show Chime Long ${x.name}`}
                      className={`group flex h-full w-full flex-col rounded-2xl p-3 text-left lg:flex-row lg:items-center lg:gap-3 lg:p-2.5 transition-[background-color,box-shadow] duration-300 ${on ? "bg-white shadow-[0_12px_28px_-16px_rgb(18_20_22/.35)]" : "hover:bg-white/60"}`}
                    >
                      <span className="relative block aspect-[4/3] w-full lg:aspect-auto lg:h-full lg:w-[42%] lg:shrink-0">
                        <Image
                          src={x.outer.src}
                          alt=""
                          fill
                          sizes="(min-width: 74rem) 16vw, 40vw"
                          className={`-scale-x-100 object-contain transition-[opacity,scale] duration-500 ease-soft group-hover:scale-105 ${on ? "opacity-100" : "opacity-80"}`}
                        />
                      </span>
                      <span className="mt-2 flex min-w-0 flex-1 items-center justify-between gap-2 lg:mt-0">
                        <span className="min-w-0">
                          <b className="block truncate text-[14px] font-semibold">{x.name}</b>
                          <span className="block truncate text-[12px] text-muted">
                            {LINE_LABEL[x.line]} · {categoryOf(x)}
                          </span>
                        </span>
                        <span className={`size-2 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-transparent"}`} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* the timer, and the way to the rest */}
            <div className="flex items-center gap-3 border-t border-ink/8 px-5 py-3.5 sm:px-6">
              <span aria-hidden="true" className="h-[2px] flex-1 overflow-hidden rounded-full bg-ink/10">
                <span
                  key={`t-${p.id}-${still}`}
                  className="block h-full origin-left bg-brand"
                  style={still ? { transform: "scaleX(0)" } : { animation: `spot-progress ${AUTOPLAY_MS}ms linear both` }}
                />
              </span>
              {!reduced && (
                <button
                  type="button"
                  onClick={() => setPaused((v) => !v)}
                  aria-pressed={paused}
                  aria-label={paused ? "Play new arrivals" : "Pause new arrivals"}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white/70 text-ink-2 transition-colors hover:bg-white hover:text-ink"
                >
                  <Icon name={paused ? "play" : "pause"} className="size-3" />
                </button>
              )}
              <Link href="/catalog" className="group inline-flex h-9 shrink-0 items-center gap-1.5 text-[13.5px] font-semibold">
                Shop all <Icon name="arrow" className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
