"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { Icon } from "../Icon";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { getProduct } from "@/lib/products";
import { useUI } from "@/lib/store";

type Group = "women" | "men" | "kids" | "street";

/**
 * The FW26 shoot. A look names its style only where we know exactly which pair is on foot (`slug`); the rest are
 * captioned by line and category and open that line in the catalogue.
 */
const LOOKS: { src: string; alt: string; group: Group; kicker: string; title: string; slug?: string; href: string; pos?: string }[] = [
  { src: "/images/models/04-women-mira-tall-suede-lookbook.jpg", alt: "Woman on a stone bench in tall taupe suede boots", group: "women", kicker: "Women · Tall boots", title: "Mira Tall", slug: "mira-tall", href: "/catalog?line=women" },
  { src: "/images/models/02-men-nord-utility-lookbook.jpg", alt: "Man in a navy coat in black leather lace-up boots on a snowy plaza", group: "men", kicker: "Men · Lace-up boots", title: "Nord", slug: "nord", href: "/catalog?line=men" },
  { src: "/images/models/09-women-toffee-chelsea-lookbook.jpg", alt: "Woman in a camel sweater wearing toffee suede chelsea boots", group: "women", kicker: "Women · Chelsea boots", title: "Toffee", slug: "toffee", href: "/catalog?line=women" },
  { src: "/images/models/05-kids-pop-pink-combat-lookbook.jpg", alt: "Child in a cream fleece jacket wearing pink lace-up boots in the snow", group: "kids", kicker: "Kids · Ankle boots", title: "Pop", slug: "pop", href: "/catalog?line=kids" },
  { src: "/images/models/03-women-mira-black-ankle-lookbook.jpg", alt: "Woman in an oatmeal coat walking in black suede ankle boots", group: "women", kicker: "Women · Ankle boots", title: "Mira", slug: "mira", href: "/catalog?line=women" },
  { src: "/images/models/10-men-urban-hiker-lookbook.jpg", alt: "Man in a charcoal overcoat walking down snowy steps in black lace-up boots", group: "men", kicker: "Men · Lace-up boots", title: "City lace-up", href: "/catalog?line=men" },
  { src: "/images/models/01-women-cream-laceup-lookbook.jpg", alt: "Woman in a cream coat wearing cream lace-up boots on a snowy street", group: "women", kicker: "Women · Lace-up boots", title: "Cream lace-up", href: "/catalog?line=women" },
  { src: "/images/models/07-banner-women-snow-onfeet.jpg", alt: "Cream shearling-collar lace-up boots walking on a snowy stone path", group: "street", kicker: "On foot · Women", title: "Shearling on snow", href: "/catalog?line=women", pos: "object-[62%_50%]" },
  { src: "/images/models/06-banner-men-street-onfeet.jpg", alt: "Black leather lace-up boots under cuffed denim on a wet city street", group: "street", kicker: "On foot · Men", title: "Leather in the slush", href: "/catalog?line=men", pos: "object-[30%_50%]" },
  { src: "/images/models/08-banner-duo-campaign-pavilion.jpg", alt: "A couple in winter coats and boots walking through a snowy pavilion", group: "street", kicker: "On foot · Campaign", title: "The FW26 pair", href: "/catalog", pos: "object-[52%_50%]" },
];

const FILTERS: { key: "all" | Group; label: string }[] = [
  { key: "all", label: "All" },
  { key: "women", label: "Women" },
  { key: "men", label: "Men" },
  { key: "kids", label: "Kids" },
  { key: "street", label: "On foot" },
];

const STEP_MS = 3800;
const shown = (f: "all" | Group) => (f === "all" ? LOOKS : LOOKS.filter((l) => l.group === f));

/**
 * The lookbook as a turning ring of photos: the look in front faces you, large; the ones either side turn away and
 * fall back into depth. It turns on its own, one look at a time (pausing under the pointer, with a pause button for
 * WCAG 2.2.2); click a side look, swipe, or use the arrows to turn it. Under the front look: its line, its name and
 * one way in. The ring rises into place as the section scrolls in; reduced motion shows it still.
 */
export function LookbookFittingBanner() {
  const [filter, setFilter] = useState<"all" | Group>("all");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();
  const openQuickView = useUI((s) => s.openQuickView);
  const ref = useRef<HTMLElement>(null);
  const downX = useRef<number | null>(null);
  const swiped = useRef(false); // a swipe ends in a click on whatever is under it; that click must not count

  const looks = shown(filter);
  const n = looks.length;
  const cur = looks[index % n];
  const product = cur.slug ? getProduct(cur.slug) : undefined;
  const still = paused || hover || reduced;
  const go = (d: number) => setIndex((i) => (((i + d) % n) + n) % n);

  useEffect(() => {
    if (still || n < 2) return;
    const t = setTimeout(() => !document.hidden && setIndex((i) => (i + 1) % n), STEP_MS);
    return () => clearTimeout(t);
  }, [still, index, n]);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-ring]", {
          y: 90,
          rotateX: 18,
          scale: 0.86,
          autoAlpha: 0,
          transformPerspective: 1600,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-ring]", start: "top 95%", end: "top 40%", scrub: 1.2 },
        });
      });
    },
    { scope: ref },
  );

  const onDown = (e: PointerEvent) => (downX.current = e.clientX);
  const onUp = (e: PointerEvent) => {
    if (downX.current === null) return;
    const dx = e.clientX - downX.current;
    downX.current = null;
    swiped.current = Math.abs(dx) > 40;
    if (swiped.current) go(dx < 0 ? 1 : -1);
  };

  return (
    <section ref={ref} id="lookbook" aria-labelledby="h-lookbook-fit" className="mt-sec scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 md:mb-8">
        <div>
          <p className="eyebrow">Lookbook FW26</p>
          <h2 id="h-lookbook-fit" className="type-section mt-3">
            See it <em>on foot.</em>
          </h2>
        </div>
        <div role="tablist" aria-label="Filter looks" className="glass inline-flex max-w-full overflow-x-auto rounded-full p-1 scrollbar-none">
          {FILTERS.map((f) => {
            const on = f.key === filter;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setFilter(f.key);
                  setIndex(0);
                }}
                className={`h-10 shrink-0 rounded-full px-4 text-[13.5px] font-semibold transition-colors ${on ? "bg-ink text-white" : "text-ink-2 hover:text-ink"}`}
              >
                {f.label}
                <span className={`ml-1.5 text-[11.5px] tabular-nums ${on ? "text-white/60" : "text-muted"}`}>{shown(f.key).length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* the ring */}
      <div
        data-ring
        className="relative [overflow-x:clip] [perspective:1600px]"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <ul
          aria-label="Looks"
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => (downX.current = null)}
          className="relative mx-auto h-[calc(var(--cw)*4/3)] touch-pan-y select-none [transform-style:preserve-3d] [--cw:min(66vw,330px)] sm:[--cw:340px] lg:[--cw:380px]"
        >
          {looks.map((l, i) => {
            let d = i - index;
            if (d > n / 2) d -= n;
            if (d < -n / 2) d += n;
            const a = Math.abs(d);
            const front = d === 0;
            return (
              <li
                key={l.src}
                aria-hidden={!front || undefined}
                className="absolute top-0 left-1/2 aspect-[3/4] w-(--cw) transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] will-change-transform motion-reduce:transition-none"
                style={{
                  transform: `translateX(calc(-50% + ${d} * var(--cw) * 0.62)) translateZ(${-a * 170}px) rotateY(${d * -26}deg)`,
                  opacity: a > 2.5 ? 0 : 1,
                  zIndex: 20 - a,
                  pointerEvents: a > 2.5 ? "none" : undefined,
                }}
              >
                <button
                  type="button"
                  tabIndex={front ? 0 : -1}
                  onClick={() => {
                    if (swiped.current) return void (swiped.current = false);
                    if (!front) go(d);
                    else if (product) openQuickView(product.id);
                  }}
                  aria-label={front ? `${l.title}: ${product ? "view details" : l.kicker}` : `Show ${l.title}`}
                  className="group relative block size-full overflow-hidden rounded-[26px] bg-photo shadow-[0_40px_60px_-34px_rgb(18_20_22/.55)]"
                >
                  <Image
                    src={l.src}
                    alt={front ? l.alt : ""}
                    fill
                    sizes="(min-width: 64rem) 380px, 66vw"
                    draggable={false}
                    className={`object-cover ${l.pos ?? "object-[50%_30%]"} transition-transform duration-[1.4s] ease-[cubic-bezier(.22,1,.36,1)] ${front ? "scale-100 group-hover:scale-[1.05]" : "scale-[1.08]"}`}
                  />
                  {/* side looks sit back in shade */}
                  <span aria-hidden="true" className="absolute inset-0 bg-ink transition-opacity duration-700" style={{ opacity: Math.min(0.5, a * 0.2) }} />
                  {/* a sheen across the front look */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgb(255_255_255/.22)_50%,transparent_65%)] transition-opacity duration-700 ${front ? "opacity-100" : "opacity-0"}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
        {/* the shadow the front look casts */}
        <span aria-hidden="true" className="pointer-events-none mx-auto -mt-3 block h-6 w-[min(56vw,300px)] rounded-[50%] bg-ink/20 blur-[18px]" />
      </div>

      {/* the front look: line, name, one way in, and the controls */}
      <div className="mx-auto mt-4 flex max-w-[640px] items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous look"
          className="glass grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-white"
        >
          <Icon name="arrow" className="size-4 rotate-180" />
        </button>

        <div key={`${filter}-${cur.src}`} aria-live="polite" className="min-w-0 animate-rise-in text-center motion-reduce:animate-none">
          <p className="text-[11.5px] font-semibold tracking-[0.14em] text-muted uppercase">{cur.kicker}</p>
          <p className="mt-1 truncate font-headline text-[24px] leading-tight font-semibold sm:text-[28px]">
            {product ? `Chime Long ${product.name}` : cur.title}
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-3 text-[13.5px]">
            {product && <span className="text-ink-2">{product.sizes}</span>}
            {product ? (
              <button type="button" onClick={() => openQuickView(product.id)} className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-deep">
                View style <Icon name="arrow" className="size-3.5" />
              </button>
            ) : (
              <Link href={cur.href} className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-deep">
                Shop the line <Icon name="arrow" className="size-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-pressed={paused}
              aria-label={paused ? "Play the lookbook" : "Pause the lookbook"}
              className="glass grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-white hover:text-ink max-sm:hidden"
            >
              <Icon name={paused ? "play" : "pause"} className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next look"
            className="glass grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-white"
          >
            <Icon name="arrow" className="size-4" />
          </button>
        </div>
      </div>

      {/* where the ring is, and how long until it turns */}
      <div aria-hidden="true" className="mx-auto mt-5 flex max-w-[640px] justify-center gap-1.5">
        {looks.map((l, i) => (
          <span key={l.src} className={`relative h-1 overflow-hidden rounded-full bg-ink/12 transition-[width] duration-500 ${i === index ? "w-10" : "w-3"}`}>
            {i === index && (
              <span
                key={`${filter}-${index}-${still}`}
                className="absolute inset-0 origin-left bg-brand"
                style={still ? undefined : { animation: `spot-progress ${STEP_MS}ms linear both` }}
              />
            )}
          </span>
        ))}
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
