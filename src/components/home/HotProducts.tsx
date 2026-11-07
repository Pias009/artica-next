"use client";

import { SectionText } from "../ui/SectionText";
import { chosen, DEFAULT_HOT, defaultHot, MAX_HOT } from "@/lib/merch";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AddButton } from "../product/AddButton";
import { useSeason } from "../season/SeasonContext";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { categoryOf, LINE_LABEL, MOQ_PAIRS, PACK, type Product } from "@/lib/products";
import type { SeasonId } from "@/lib/season";
import { inSeason, seasonPicks } from "@/lib/season-products";
import { useUI } from "@/lib/store";
import { offTilt, onTilt } from "@/lib/tilt";

/**
 * The season's most-reordered styles, best first (client placeholder list: the first three carry the catalogue's own
 * "Top reorder" / "Trending" tags; reorder the slugs from real sales data).
 */
const DECK_SIZE = DEFAULT_HOT.length;
/** Where a grid taller than the window pins: just under the header. */
const PIN_TOP = 96;

/**
 * The deck for a season: its in-season styles first (best first), topped up from the reorder list. Up to eight fit as
 * a still grid; past that the list splits into two layers that drift in opposite directions.
 */
function deck(season: SeasonId) {
  // the admin's deck (Products → Arrange) as set; otherwise the season's styles first, topped up from the reorder list
  const own = chosen("hot");
  const hot = defaultHot();
  const fresh = seasonPicks(season, DECK_SIZE).filter((p) => inSeason(p, season));
  const ITEMS = own?.length ? own.slice(0, MAX_HOT) : [...fresh, ...hot.filter((p) => !fresh.includes(p))].slice(0, DECK_SIZE);
  const HALF = Math.ceil(ITEMS.length / 2);
  const MOVING = HALF > 4;
  return { ITEMS, MID: (ITEMS.length - 1) / 2, HALF, MOVING, ROWS: MOVING ? [ITEMS.slice(0, HALF), ITEMS.slice(HALF)] : [] };
}

/**
 * Hot products as a deck that deals itself out. On desktop the section holds in place while the cards, stacked and
 * fanned like a hand in the middle, are dealt one by one to their places in the grid as you scroll; on phones each
 * card swings up into place as it arrives. Once dealt it is a plain grid, easy to compare and pick, and every card
 * tilts toward the pointer with a glare and the pair shifting in depth. Reduced motion shows the grid as it is.
 * With more than eight styles the grid becomes two layers, the top drifting left to right and the bottom right to
 * left, once the deal is done; a layer stops under the pointer and a button stops both (WCAG 2.2.2).
 */
export function HotProducts() {
  const openQuickView = useUI((s) => s.openQuickView);
  const season = useSeason();
  const { ITEMS, MID, HALF, MOVING, ROWS } = useMemo(() => deck(season), [season]);
  const ref = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useGSAP(
    () => {
      const el = grid.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      // desktop: hold the grid and deal the deck out across it
      mm.add(`${MOTION_OK} and (min-width: 64rem)`, () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-deal]", el);
        const metas = gsap.utils.toArray<HTMLElement>("[data-deal] [data-meta]", el);
        // offsets from each card's place to the middle of the grid (offset* ignore transforms, so refreshes stay true);
        // a right-drifting layer waits shifted half its length, so its cards sit that much further left
        const shift = (c: HTMLElement) => (c.parentElement?.dataset.reverse ? c.parentElement.offsetWidth / 2 : 0);
        const dx = (c: HTMLElement) => el.offsetWidth / 2 - (c.offsetLeft - shift(c) + c.offsetWidth / 2);
        // the deck waits in the middle of what's on screen: on a laptop the two-row grid is taller than the window, and
        // its own middle would leave the deck low and half cut off, under an empty-looking band
        const tall = () => el.offsetHeight > innerHeight - 120;
        const deckY = () => (tall() ? Math.min(el.offsetHeight, innerHeight - PIN_TOP) / 2 : el.offsetHeight / 2);
        const dy = (c: HTMLElement) => deckY() - (c.offsetTop + c.offsetHeight / 2);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: () => (tall() ? `top ${PIN_TOP}px` : "center center"),
            end: "+=125%",
            pin: ref.current?.querySelector("[data-pin]") ?? el,
            scrub: 1.1,
            invalidateOnRefresh: true,
            // the layers only start drifting once every card has landed
            onUpdate: (st) => (el.dataset.dealt = String(st.progress > 0.999)),
            onRefresh: (st) => (el.dataset.dealt = String(st.progress > 0.999)),
          },
        });
        el.dataset.dealt = "false";
        tl.fromTo(
          cards,
          {
            x: (i, c: HTMLElement) => dx(c) + (i - MID) * 16,
            y: (i, c: HTMLElement) => dy(c) + Math.abs(i - MID) * 6,
            rotate: (i) => (i - MID) * 4.5,
            scale: 0.78,
            zIndex: (i) => ITEMS.length - i,
          },
          { x: 0, y: 0, rotate: 0, scale: 1, ease: "power3.inOut", duration: 1, stagger: 0.09 },
        ).fromTo(metas, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 }, "-=0.5");
        return () => delete el.dataset.dealt;
      });

      // phones and tablets: each card swings up into place as it arrives
      mm.add(`${MOTION_OK} and (max-width: 63.99rem)`, () => {
        gsap.utils.toArray<HTMLElement>("[data-deal]", el).forEach((c, i) => {
          gsap.fromTo(
            c,
            { y: 90, rotate: i % 2 ? 7 : -7, scale: 0.88, autoAlpha: 0 },
            { y: 0, rotate: 0, scale: 1, autoAlpha: 1, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 98%", end: "top 48%", scrub: 1 } },
          );
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="hot" aria-labelledby="h-hot" className="mt-sec scroll-mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:mb-10">
        <div>
          <p className="eyebrow">Hot this season</p>
          <SectionText as="h2" part="title" id="h-hot" className="type-section mt-3">
            The styles buyers <em>reorder.</em>
          </SectionText>
          <SectionText part="sub" className="mt-3 max-w-[52ch] text-[17px] text-ink-2" />
        </div>
        <div className="flex items-center gap-4">
          {MOVING && (
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-pressed={paused}
              aria-label={paused ? "Play the hot styles" : "Pause the hot styles"}
              className="glass grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink motion-reduce:hidden"
            >
              <Icon name={paused ? "play" : "pause"} className="size-3.5" />
            </button>
          )}
          <Link href="/catalog" className="group inline-flex h-11 items-center gap-2 text-[14px] font-semibold">
            Shop the full range <Icon name="arrow" className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div data-pin>
        {MOVING ? (
          <div ref={grid} className="group/hot relative grid gap-3 sm:gap-5">
            {ROWS.map((row, r) => (
              <Layer key={r} items={row} start={r * HALF} reverse={r === 0} paused={paused} onView={openQuickView} />
            ))}
          </div>
        ) : (
          <div ref={grid} className="relative">
            <ul aria-label="Hot styles, ranked" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {ITEMS.map((p, i) => (
                <li key={p.id} data-deal className="relative will-change-transform">
                  <Card p={p} rank={i + 1} onView={() => openQuickView(p.id)} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * One drifting layer: its cards twice over in a strip that slides half its own length and starts again, so the loop
 * is seamless (the second copy is hidden from assistive tech and the tab order, and is never dealt). A right-drifting
 * layer puts the copy first and plays the slide backwards. Until the deal is done the strip holds still (and the
 * clip and edge fade are off so cards can fly in from the deck).
 */
function Layer({
  items,
  start,
  reverse,
  paused,
  onView,
}: {
  items: Product[];
  start: number;
  reverse?: boolean;
  paused: boolean;
  onView: (id: string) => void;
}) {
  const order = reverse ? [1, 0] : [0, 1];
  return (
    <div className="group/row [overflow-x:clip] [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)] group-data-[dealt=false]/hot:[mask-image:none] group-data-[dealt=false]/hot:[overflow-x:visible] scrollbar-none motion-reduce:[overflow-x:auto] motion-reduce:[mask-image:none]">
      <ul
        aria-label={`Hot styles, ranked ${start + 1} to ${start + items.length}`}
        data-reverse={reverse || undefined}
        className={`flex w-max animate-marquee group-focus-within/row:[animation-play-state:paused] group-hover/row:[animation-play-state:paused] group-data-[dealt=false]/hot:animate-none motion-reduce:animate-none ${reverse ? "[animation-direction:reverse] group-data-[dealt=false]/hot:-translate-x-1/2" : ""} ${paused ? "[animation-play-state:paused]" : ""}`}
        style={{ animationDuration: `${items.length * 7}s` }}
      >
        {order.map((c) =>
          items.map((p, i) => (
            <li
              key={`${c}-${p.id}`}
              data-deal={c === 0 ? "" : undefined}
              aria-hidden={c > 0 || undefined}
              inert={c > 0}
              className={`relative w-[clamp(200px,calc(25vw-12px),336px)] shrink-0 pr-3 will-change-transform sm:pr-5 ${c > 0 ? "motion-reduce:hidden" : ""}`}
            >
              <Card p={p} rank={start + i + 1} onView={() => onView(p.id)} />
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

function Card({ p, rank, onView }: { p: Product; rank: number; onView: () => void }) {
  const tint = glow(p);
  return (
    <article className="group relative [perspective:1100px]">
      <div
        onPointerMove={onTilt}
        onPointerLeave={offTilt}
        data-deco="card"
        className="glass relative aspect-[4/5] overflow-hidden rounded-[24px] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] group-hover:shadow-[0_34px_50px_-30px_rgb(18_20_22/.5)] group-hover:duration-150 lg:aspect-square"
        style={{ backgroundImage: `radial-gradient(80% 65% at 50% 58%, ${tint}40, ${tint}10 75%)` }}
      >
        <span className="absolute top-4 left-4 z-[1] font-headline text-[22px] leading-none font-semibold text-ink/70 tabular-nums sm:top-5 sm:left-5 sm:text-[26px]">
          {String(rank).padStart(2, "0")}
        </span>
        {p.badge && p.badge !== "New" && (
          <span className="absolute top-4 right-4 z-[1] rounded-full bg-white/85 px-2.5 py-0.5 text-[12px] font-semibold text-brand sm:top-5 sm:right-5">
            {p.badge}
          </span>
        )}
        <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] [transform:translate(calc(var(--px,0)*-16px),calc(var(--py,0)*-12px))] group-hover:duration-150">
          <Image
            src={p.outer.src}
            alt={p.desc}
            fill
            sizes="(min-width: 74rem) 300px, 46vw"
            className="-scale-x-100 object-contain p-[12%] pt-[18%] drop-shadow-[0_18px_16px_rgb(18_20_22/.22)] transition-[scale] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.07] lg:p-[14%] lg:pt-[17%]"
          />
        </span>
        {/* the glare that follows the pointer */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(45% 45% at var(--gx,50%) var(--gy,30%), rgb(255 255 255/.5), transparent 70%)" }}
        />
        {/* the whole card opens quick view; the add button sits above it */}
        <button type="button" onClick={onView} aria-label={`Quick view: Chime Long ${p.name}, number ${rank}`} className="absolute inset-0 z-[2] rounded-[24px]" />
        <AddButton id={p.id} className="absolute right-3 bottom-3 z-[3] size-10 shadow-soft ring-1 ring-ink/10 sm:right-4 sm:bottom-4 sm:size-11" />
      </div>
      <div data-meta className="px-1 pt-3.5">
        <p className="truncate text-[11.5px] font-semibold tracking-[0.12em] text-muted uppercase">
          {LINE_LABEL[p.line]} · {categoryOf(p)}
        </p>
        <h3 className="mt-1 truncate font-headline text-[19px] leading-tight font-semibold sm:text-[21px]">
          <span className="max-sm:hidden">Chime Long </span>
          {p.name}
        </h3>
        <p className="mt-1 truncate text-[13px] text-ink-2">
          <b className="font-semibold text-ink">{MOQ_PAIRS} pairs</b> MOQ<span className="max-sm:hidden"> · {PACK} per case</span>
        </p>
      </div>
    </article>
  );
}

/** Black pairs tint a soft mauve rather than grey. */
const glow = (p: Product) => (p.color.hex.toLowerCase() === "#1d1e19" ? "#b9a6c4" : p.color.hex);
