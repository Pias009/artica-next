"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type CSSProperties, type PointerEvent } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { categoryOf, groupOf, inLine, LEAD, LINE_LABEL, PRIVATE_LABEL_MIN, products, stylesIn, type Product, type ProductLine } from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

const LINES: ProductLine[] = ["women", "kids", "men"];

/** One pair per category, the sharpest photo of its group. */
const SHELVES = LINES.map((line) => ({
  line,
  count: inLine(line).length,
  pairs: stylesIn(line).map((p) => groupOf(p).reduce((a, b) => (b.outer.w > a.outer.w ? b : a))),
}));

/** Height on the shelf as a share of the row: knee boots stand tallest, sandals sit low, kids a step smaller. */
function heightOf(p: Product) {
  const c = categoryOf(p);
  const kind = /Tall/.test(c) ? 1 : /boots/i.test(c) ? 0.74 : /Sneakers/.test(c) ? 0.56 : /Sandals/.test(c) ? 0.44 : 0.5;
  return kind * (p.line === "kids" ? 0.84 : p.line === "men" ? 1.04 : 1);
}

const WHY = [
  { value: LEAD.quote, label: "Quote turnaround" },
  { value: `${parseInt(LEAD.bulk)} days`, label: "Bulk production" },
  { value: `${PRIVATE_LABEL_MIN} pairs`, label: "Private label from" },
];

/** Shrinks a copy of the photo into the header's inquiry button, so adding from the wall feels like taking it. */
function flyToList(from: HTMLElement) {
  const target = document.querySelector<HTMLElement>("[data-inquiry-target]");
  if (!target || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = from.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, { position: "fixed", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: "0", zIndex: "80", pointerEvents: "none" });
  document.body.append(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  ghost
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.55}px,${dy * 0.55 - 60}px) scale(.55)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px,${dy}px) scale(.08)`, opacity: 0.2 },
      ],
      { duration: 720, easing: "cubic-bezier(.45,0,.2,1)" },
    )
    .finished.then(() => {
      ghost.remove();
      target.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" });
    });
}

/**
 * First view: a showroom wall. Three floating oak shelves (women, men, kids) on warm limestone, each pair under its
 * own spotlight, the wall turned slightly away like a real store wall seen from the door. Point at a pair to lift it
 * and see its name; + takes it to the inquiry list (it flies into the header); the pair itself opens Quick View.
 * A soft light follows the pointer across the wall. No cards, no borders: wood, light and the cutouts.
 */
export function ShowroomWall() {
  const root = useRef<HTMLElement>(null);

  const light = (e: PointerEvent) => {
    const el = root.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lx", `${e.clientX - r.left}px`);
    el.style.setProperty("--ly", `${e.clientY - r.top}px`);
  };

  return (
    <section
      ref={root}
      id="hero"
      aria-labelledby="hero-title"
      onPointerMove={light}
      className="bleed relative isolate overflow-hidden bg-[linear-gradient(180deg,#f4f2ed_0%,#eeebe4_70%,#e8e4dc_100%)] [--lx:70%] [--ly:30%] lg:h-[calc(100svh-112px)] lg:max-h-[980px] lg:min-h-[700px]"
    >
      {/* the light that follows the pointer */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_var(--lx)_var(--ly),rgb(255_255_255/.6),rgb(255_255_255/0)_65%)] motion-reduce:hidden" />

      <div className="wrap relative grid h-full gap-y-10 px-(--shell-pad) pt-[clamp(32px,6vh,64px)] pb-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-x-10 lg:pb-[clamp(20px,3.5vh,36px)]">
        {/* the promise, on the open wall; actions and the numbers on the floor line */}
        <div className="flex flex-col max-lg:items-center max-lg:text-center">
          <p className="inline-flex animate-rise-in items-center gap-2 text-[13px] font-semibold text-muted motion-reduce:animate-none">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
            FW26 wholesale showroom
          </p>
          <h1
            id="hero-title"
            className="mt-5 animate-rise-in text-[clamp(38px,9.6vw,50px)] leading-[1] font-semibold tracking-[-0.045em] text-balance [animation-delay:70ms] motion-reduce:animate-none lg:text-[clamp(40px,3.5vw,58px)]"
          >
            <span className="block text-ink">Pick it off the shelf.</span>
            <span className="block text-[#7b8187]">Order factory-direct.</span>
          </h1>
          <p className="mt-5 max-w-[22rem] animate-rise-in text-[16px] leading-[1.55] text-ink-2 [animation-delay:140ms] motion-reduce:animate-none">
            Every pair on the wall is in stock to order. Tap <span className="font-semibold text-ink">+</span> to add it to your inquiry list.
          </p>

          <div className="mt-8 flex animate-rise-in flex-wrap items-center gap-x-6 gap-y-2 [animation-delay:210ms] motion-reduce:animate-none max-lg:justify-center lg:mt-auto">
            <OpenInquiryButton className="btn btn-dark shadow-[0_10px_24px_-12px_rgb(18_20_22/.6)]">
              Get wholesale pricing <Icon name="arrow" className="size-4" />
            </OpenInquiryButton>
            <Link href="/catalog" className="group inline-flex h-12 items-center gap-1.5 text-[15px] font-semibold text-ink">
              All {products.length} styles
              <Icon name="arrow" className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
            </Link>
          </div>
          <dl className="mt-7 grid w-full max-w-[420px] animate-rise-in grid-cols-3 gap-5 [animation-delay:280ms] motion-reduce:animate-none">
            {WHY.map((w) => (
              <div key={w.label} className="flex flex-col-reverse gap-0.5">
                <dt className="text-[12.5px] leading-snug text-muted">{w.label}</dt>
                <dd className="text-[clamp(19px,1.7vw,24px)] font-semibold tracking-[-0.03em] text-ink tabular-nums">{w.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* the wall, turned slightly away */}
        <div className="min-w-0 lg:[perspective:1800px]">
          <div className="flex h-full flex-col justify-center gap-[clamp(8px,2.2vh,28px)] lg:origin-left lg:[transform:rotateY(-9deg)]">
            {SHELVES.map((s) => (
              <Shelf key={s.line} {...s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Shelf({ line, count, pairs }: (typeof SHELVES)[number]) {
  return (
    <div className="relative [--u:min(18.5vh,172px)] max-lg:[--u:120px]" role="group" aria-label={`${LINE_LABEL[line]}, ${count} styles`}>
      <ul className="mask-fade-x flex scrollbar-none items-end gap-[clamp(22px,2.6vw,44px)] overflow-x-auto overscroll-x-contain px-[5%] pt-12 [scroll-snap-type:x_proximity]">
        {pairs.map((p, i) => (
          <Pair key={p.id} p={p} delay={i} />
        ))}
        {/* the end of every shelf goes to the whole line */}
        <li className="shrink-0 self-end pb-2 pl-2">
          <Link href={`/catalog?line=${line}`} className="group inline-flex h-11 items-center gap-1.5 text-[13.5px] font-semibold whitespace-nowrap text-ink-2 hover:text-ink">
            All {count}
            <Icon name="arrow" className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-0.5" />
          </Link>
        </li>
      </ul>
      {/* floating oak: lit top face, front edge, soft shadow on the wall */}
      <div aria-hidden="true" className="relative h-[11px] bg-[linear-gradient(180deg,#f3e8d4_0,#f3e8d4_3px,#ddc7a4_3px,#c7aa82_100%)] shadow-[0_16px_18px_-12px_rgb(70_52_30/.4)]" />
      <p className="mt-2 pl-[5%] text-[12px] font-semibold tracking-[0.02em] text-[#6f5d42]">
        {LINE_LABEL[line]} · {count}
      </p>
    </div>
  );
}

function Pair({ p, delay }: { p: Product; delay: number }) {
  const openQuickView = useUI((s) => s.openQuickView);
  const toggle = useInquiry((s) => s.toggle);
  const on = useInCart(p.id);
  const photo = useRef<HTMLSpanElement>(null);

  return (
    <li className="group relative shrink-0 [scroll-snap-align:start]" style={{ "--h": heightOf(p) } as CSSProperties}>
      {/* its own spotlight on the wall */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-[170%] w-[180%] -translate-x-1/2 bg-[radial-gradient(50%_60%_at_50%_70%,rgb(255_250_240/.85),rgb(255_250_240/0))] opacity-70 transition-opacity duration-500 group-hover:opacity-100"
      />
      {/* name and +, shown while pointed at (always on touch) */}
      <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap opacity-0 transition-[opacity,translate] duration-300 ease-soft group-focus-within:opacity-100 group-hover:-translate-y-1 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <span className="text-[12.5px] font-semibold text-ink [@media(hover:none)]:hidden">{p.name}</span>
        <button
          type="button"
          onClick={() => {
            if (!on && photo.current) flyToList(photo.current);
            toggle(p.id);
          }}
          aria-pressed={on}
          aria-label={`${on ? "Remove" : "Add"} ${p.name} ${on ? "from" : "to"} inquiry list`}
          className={`hit-44 grid size-7 place-items-center rounded-full transition-colors duration-200 ${on ? "bg-brand text-white" : "bg-ink text-white hover:bg-accent-hover"}`}
        >
          <Icon name={on ? "check" : "plus"} className="size-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => openQuickView(p.id)}
        aria-label={`Chime Long ${p.name}, ${categoryOf(p)}, ${LINE_LABEL[p.line]}. View details`}
        className="relative block outline-offset-8"
        style={{ height: "calc(var(--u) * var(--h))", aspectRatio: `${p.outer.w} / ${p.outer.h}` }}
      >
        <span
          ref={photo}
          className="absolute inset-0 block animate-rise-in transition-transform duration-500 ease-soft group-hover:-translate-y-1.5 motion-reduce:animate-none"
          style={{ animationDelay: `${300 + delay * 60}ms` }}
        >
          <Image src={p.outer.src} alt="" fill sizes="220px" className="object-contain object-bottom drop-shadow-[0_10px_10px_rgb(40_30_18/.18)]" />
        </span>
        {/* contact shadow on the oak */}
        <span aria-hidden="true" className="absolute inset-x-[12%] -bottom-0.5 h-1.5 rounded-[50%] bg-[rgb(40_30_18/.3)] blur-[2px]" />
      </button>
    </li>
  );
}
