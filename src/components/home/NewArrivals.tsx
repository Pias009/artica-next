"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { categoryOf, getProduct, LINE_LABEL, MOQ_PAIRS, PACK, type Product, type ProductLine } from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

/** Just in for FW26 (client placeholder list). */
const NEW_ARRIVAL_SLUGS = ["tundra", "pop", "zinnia", "lynx", "toffee", "frost", "blossom", "bluebell"];

const AUTOPLAY_MS = 4200;

type Filter = "all" | ProductLine;
const FILTERS: Filter[] = ["all", "women", "men", "kids"];

/** Computed once: the list never changes while the page is open. */
const ALL = NEW_ARRIVAL_SLUGS.map(getProduct).filter((p): p is Product => !!p);
const inFilter = (f: Filter) => (f === "all" ? ALL : ALL.filter((p) => p.line === f));

/**
 * New arrivals as expanding panels: every new style is a slim glass panel tinted in its own colour, side by side on
 * desktop and stacked on phones. One at a time a panel opens wide to show the pair large with its terms, then closes
 * as the next one opens, so the whole drop plays through in order. Click any panel to open it. Loops on its own,
 * pauses under the pointer, has a pause button (WCAG 2.2.2); under reduced motion it only moves when asked.
 */
export function NewArrivals() {
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState(ALL[0]?.id ?? "");
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();

  const openQuickView = useUI((s) => s.openQuickView);
  const toggle = useInquiry((s) => s.toggle);

  const items = inFilter(filter);
  const n = items.length;
  const index = Math.max(0, items.findIndex((x) => x.id === activeId));
  const p = items[index] ?? ALL[0];
  const inList = useInCart(p?.id ?? "");
  const still = paused || hover || reduced;

  useEffect(() => {
    if (still) return;
    const ids = inFilter(filter).map((x) => x.id);
    if (ids.length <= 1) return;
    const t = setTimeout(() => {
      if (!document.hidden) setActiveId((cur) => ids[(Math.max(0, ids.indexOf(cur)) + 1) % ids.length]);
    }, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [still, filter, activeId]);

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
            const count = inFilter(f).length;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={on}
                disabled={count === 0}
                onClick={() => {
                  setFilter(f);
                  setActiveId(inFilter(f)[0]?.id ?? "");
                }}
                className={`h-10 rounded-full px-4 text-[13.5px] font-semibold transition-colors disabled:opacity-40 ${on ? "bg-ink text-white" : "text-ink-2 hover:text-ink"}`}
              >
                {f === "all" ? "All" : LINE_LABEL[f]}
                <span className={`ml-1.5 text-[11.5px] tabular-nums ${on ? "text-white/60" : "text-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul
        aria-label="New styles"
        className="flex h-[760px] flex-col gap-2 lg:h-[clamp(540px,70vh,620px)] lg:flex-row lg:gap-3"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        {items.map((x, i) => {
          const on = x.id === p.id;
          return (
            <li
              key={x.id}
              className={`glass relative min-h-0 min-w-0 basis-0 overflow-hidden rounded-[22px] transition-[flex-grow] duration-700 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none ${on ? "grow-[9] lg:grow-[7]" : "grow"}`}
              style={{ backgroundImage: `linear-gradient(165deg, ${glow(x)}${on ? "3a" : "1e"}, transparent 72%)` }}
            >
              {/* number, and the tag once open */}
              <span
                className={`absolute z-[2] flex items-center gap-2 text-[12px] font-bold tracking-[0.16em] tabular-nums transition-colors ${on ? "top-5 left-5 text-ink sm:top-6 sm:left-7" : "top-1/2 left-4 -translate-y-1/2 text-ink/40 lg:top-5 lg:left-1/2 lg:-translate-x-1/2 lg:translate-y-0"}`}
              >
                {String(i + 1).padStart(2, "0")}
                {on && <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11.5px] font-semibold tracking-normal text-brand">New</span>}
              </span>

              {/* the pair: small in a closed panel, large in the open one */}
              <span
                className={`absolute transition-[top,right,bottom,left] duration-700 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none ${on ? "top-[12%] right-[8%] bottom-[48%] left-[8%] lg:top-[8%] lg:bottom-[33%]" : "top-1 right-3 bottom-1 left-[68%] lg:top-[30%] lg:right-[10%] lg:bottom-[42%] lg:left-[10%]"}`}
              >
                <Image
                  src={x.outer.src}
                  alt={on ? x.desc : ""}
                  fill
                  sizes="(min-width: 74rem) 40vw, 80vw"
                  className={`-scale-x-100 object-contain ${on ? "drop-shadow-[0_26px_22px_rgb(18_20_22/.22)]" : "drop-shadow-[0_6px_6px_rgb(18_20_22/.18)]"}`}
                />
              </span>

              {/* a closed panel's name: across on phones, upright on desktop */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute top-1/2 left-12 -translate-y-1/2 text-[14px] font-semibold whitespace-nowrap text-ink-2 transition-opacity duration-300 lg:top-auto lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:translate-y-0 lg:rotate-180 lg:[writing-mode:vertical-rl] ${on ? "opacity-0" : "opacity-100 delay-300"}`}
              >
                {x.name}
                <span className="ml-2 font-medium text-muted lg:mt-2 lg:ml-0">{LINE_LABEL[x.line]}</span>
              </span>

              {/* the open panel's terms */}
              <div
                inert={!on}
                aria-live={on ? "polite" : undefined}
                className={`absolute inset-x-5 bottom-5 z-[2] flex flex-wrap items-end justify-between gap-x-6 gap-y-4 transition-[opacity,translate] duration-500 sm:inset-x-7 sm:bottom-7 ${on ? "translate-y-0 opacity-100 delay-300" : "pointer-events-none translate-y-3 opacity-0"}`}
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">
                    {LINE_LABEL[x.line]} · {categoryOf(x)}
                  </p>
                  <h3 className="mt-1 font-headline text-[26px] leading-[1.05] font-semibold tracking-[-0.015em] sm:text-[clamp(28px,2.6vw,38px)]">
                    Chime Long {x.name}
                  </h3>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13.5px] text-ink-2">
                    <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: x.color.hex }} />
                    {x.color.name} · <b className="font-semibold text-ink">{MOQ_PAIRS} pairs</b> MOQ · {PACK} per case · {x.sizes}
                  </p>
                </div>
                {on && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(x.id)}
                      aria-pressed={inList}
                      className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white transition-colors sm:h-12 sm:px-6 ${inList ? "bg-brand" : "bg-ink hover:bg-brand"}`}
                    >
                      <Icon name={inList ? "check" : "plus"} className="size-4" />
                      {inList ? "On your list" : "Add to inquiry"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openQuickView(x.id)}
                      aria-label={`Quick view: Chime Long ${x.name}`}
                      className="grid size-11 place-items-center rounded-full bg-white/80 text-ink transition-colors hover:bg-white sm:size-12"
                    >
                      <Icon name="arrow" className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* a closed panel opens on click */}
              {!on && (
                <button
                  type="button"
                  onClick={() => setActiveId(x.id)}
                  aria-label={`Show Chime Long ${x.name}`}
                  className="absolute inset-0 z-[3] rounded-[22px] transition-colors hover:bg-white/30"
                />
              )}

              {/* the timer, along the open panel's foot */}
              {on && (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/5">
                  <span
                    key={`t-${x.id}-${still}`}
                    className="block h-full origin-left bg-brand"
                    style={still ? { transform: "scaleX(0)" } : { animation: `spot-progress ${AUTOPLAY_MS}ms linear both` }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-pressed={paused}
              aria-label={paused ? "Play new arrivals" : "Pause new arrivals"}
              className="glass grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink"
            >
              <Icon name={paused ? "play" : "pause"} className="size-3.5" />
            </button>
          )}
          <span className="text-[12px] font-bold tracking-[0.16em] text-muted tabular-nums">
            {String(index + 1).padStart(2, "0")} <span className="text-ink/25">/ {String(n).padStart(2, "0")}</span>
          </span>
        </div>
        <Link href="/catalog" className="group inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold">
          Shop all new <Icon name="arrow" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

/** Black pairs tint a soft mauve rather than grey. */
const glow = (p: Product) => (p.color.hex.toLowerCase() === "#1d1e19" ? "#b9a6c4" : p.color.hex);

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
