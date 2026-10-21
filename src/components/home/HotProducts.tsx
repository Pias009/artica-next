"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { AddButton } from "../product/AddButton";
import { categoryOf, getProduct, LINE_LABEL, MOQ_PAIRS, PACK, type Product } from "@/lib/products";
import { useUI } from "@/lib/store";

/**
 * The season's most-reordered styles, best first (client placeholder list: the first three carry the catalogue's own
 * "Top reorder" / "Trending" tags; reorder the slugs from real sales data).
 */
const HOT = ["nord", "mira", "mira-tall", "ember", "maple", "cedar", "raven", "sable"];
const ITEMS = HOT.map(getProduct).filter((p): p is Product => !!p);

const STEP_MS = 3800;
const OUT_MS = 600;

/**
 * Hot products as a ranked list beside one large image: the whole top eight on the right, the style at the top of the
 * moment large on the left over its own rank. The list steps down on its own, and every change rises: the old pair
 * lifts away and the next comes up from below. A thin timer line runs under the active row; it pauses under the
 * pointer and has a pause button (WCAG 2.2.2); under reduced motion it only moves when asked.
 */
export function HotProducts() {
  const n = ITEMS.length;
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();
  const openQuickView = useUI((s) => s.openQuickView);
  const curRef = useRef(0);
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const still = paused || hover || reduced;

  const go = (i: number) => {
    const next = ((i % n) + n) % n;
    if (next === curRef.current) return;
    setPrev(curRef.current);
    curRef.current = next;
    setCur(next);
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => setPrev(null), OUT_MS);
  };

  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => !document.hidden && go(curRef.current + 1), STEP_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, cur]);

  useEffect(() => () => clearTimeout(outTimer.current), []);

  const p = ITEMS[cur];

  return (
    <section id="hot" aria-labelledby="h-hot" className="mt-sec scroll-mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:mb-10">
        <div>
          <p className="eyebrow">Hot this season</p>
          <h2 id="h-hot" className="type-section mt-3">
            The styles buyers <em>reorder.</em>
          </h2>
        </div>
        <Link href="/catalog" className="group inline-flex h-11 items-center gap-2 text-[14px] font-semibold">
          Shop the full range <Icon name="arrow" className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      <div
        className="glass overflow-hidden rounded-[32px]"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <div className="grid grid-cols-[minmax(0,1fr)] lg:h-[clamp(560px,70vh,640px)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* the style at the top, large */}
          <div className="relative flex min-h-[440px] flex-col overflow-hidden lg:min-h-0">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-[background] duration-700"
              style={{ background: `radial-gradient(55% 55% at 50% 50%, ${glow(p)}38, transparent 72%)` }}
            />

            {/* the rank, oversized behind the pair */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[4%] overflow-hidden text-center">
              <span
                key={`r-${cur}`}
                className="inline-block font-headline text-[clamp(160px,22vw,300px)] leading-none font-semibold text-ink/[0.05] tabular-nums [animation:rise-up-in_700ms_cubic-bezier(.22,1,.36,1)_both] motion-reduce:animate-none"
              >
                {String(cur + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="relative z-[2] flex items-center justify-between p-5 sm:p-7">
              {p.badge && p.badge !== "New" ? (
                <span className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-semibold text-brand">{p.badge}</span>
              ) : (
                <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-semibold text-ink-2">Hot this season</span>
              )}
              {!reduced && (
                <button
                  type="button"
                  onClick={() => setPaused((v) => !v)}
                  aria-pressed={paused}
                  aria-label={paused ? "Play the hot styles" : "Pause the hot styles"}
                  className="grid size-10 place-items-center rounded-full bg-white/70 text-ink-2 transition-colors hover:bg-white hover:text-ink"
                >
                  <Icon name={paused ? "play" : "pause"} className="size-3.5" />
                </button>
              )}
            </div>

            {/* the pair: the last one lifts away, the next rises from below */}
            <div className="relative mx-auto min-h-[220px] w-[min(88%,600px)] flex-1">
              {prev !== null && prev !== cur && <Pair key={`out-${prev}`} p={ITEMS[prev]} className="[animation:rise-up-out_600ms_cubic-bezier(.4,0,.2,1)_both]" />}
              <Pair key={`in-${cur}`} p={p} className="[animation:rise-up-in_800ms_cubic-bezier(.22,1,.36,1)_both] motion-reduce:animate-none" />
              <span aria-hidden="true" className="absolute right-[18%] bottom-[3%] left-[18%] h-[7%] rounded-[50%] bg-ink/15 blur-[16px]" />
            </div>

            {/* what it is, and what to do */}
            <div className="relative z-[2] flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7">
              <div key={`d-${cur}`} aria-live="polite" className="min-w-0 [animation:rise-up-in_700ms_cubic-bezier(.22,1,.36,1)_both] motion-reduce:animate-none">
                <p className="text-[12.5px] font-semibold tracking-[0.12em] text-muted uppercase">
                  {LINE_LABEL[p.line]} · {categoryOf(p)}
                </p>
                <h3 className="mt-1 font-headline text-[30px] leading-[1.05] font-semibold tracking-[-0.015em] sm:text-[36px]">Chime Long {p.name}</h3>
                <p className="mt-1.5 text-[14px] text-ink-2">
                  <b className="font-semibold text-ink">{MOQ_PAIRS} pairs</b> MOQ · {PACK} per case · {p.sizes}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openQuickView(p.id)}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition-colors hover:bg-brand"
                >
                  View style <Icon name="arrow" className="size-4" />
                </button>
                <AddButton id={p.id} className="size-12 shrink-0 shadow-soft ring-1 ring-ink/10" />
              </div>
            </div>
          </div>

          {/* the whole top eight */}
          <ol aria-label="Hot styles, ranked" className="flex flex-col border-ink/8 p-2 max-lg:border-t sm:p-3 lg:border-l">
            {ITEMS.map((x, i) => {
              const on = i === cur;
              return (
                <li key={x.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-pressed={on}
                    aria-label={`Show Chime Long ${x.name}, number ${i + 1}`}
                    className={`relative flex h-full min-h-[60px] w-full items-center gap-4 overflow-hidden rounded-2xl px-4 text-left transition-[background-color,box-shadow] duration-300 ${on ? "bg-white shadow-[0_10px_26px_-16px_rgb(18_20_22/.35)]" : "hover:bg-white/55"}`}
                  >
                    <span className={`w-7 shrink-0 font-headline text-[22px] font-semibold tabular-nums transition-colors ${on ? "text-brand" : "text-ink/25"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className={`block truncate text-[15px] font-semibold transition-colors ${on ? "text-ink" : "text-ink-2"}`}>{x.name}</b>
                      <span className="block truncate text-[12.5px] text-muted">
                        {LINE_LABEL[x.line]} · {categoryOf(x)}
                      </span>
                    </span>
                    {x.badge && x.badge !== "New" && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand max-sm:hidden">{x.badge}</span>}
                    <Icon name="arrow" className={`size-4 shrink-0 transition-[opacity,translate] duration-300 ${on ? "translate-x-0 text-brand opacity-100" : "-translate-x-1 opacity-0"}`} />
                    {/* the timer under the active row */}
                    {on && (
                      <span aria-hidden="true" className="absolute inset-x-4 bottom-1.5 h-[2px] overflow-hidden rounded-full bg-ink/8">
                        <span
                          key={`t-${cur}-${still}`}
                          className="block h-full origin-left bg-brand"
                          style={still ? { transform: "scaleX(0)" } : { animation: `spot-progress ${STEP_MS}ms linear both` }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Black pairs glow a soft mauve rather than grey. */
const glow = (p: Product) => (p.color.hex.toLowerCase() === "#1d1e19" ? "#b9a6c4" : p.color.hex);

function Pair({ p, className }: { p: Product; className?: string }) {
  return (
    <span className={`absolute inset-0 block ${className ?? ""}`}>
      <Image src={p.outer.src} alt={p.desc} fill sizes="(min-width: 74rem) 44vw, 88vw" className="-scale-x-100 object-contain drop-shadow-[0_28px_26px_rgb(18_20_22/.22)]" />
    </span>
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
