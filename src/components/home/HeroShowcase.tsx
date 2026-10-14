"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { categoryOf, groupOf, inLine, LEAD, LINE_LABEL, PACK, PRIVATE_LABEL_MIN, products, stylesIn, type Product, type ProductLine } from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

const LINES: ProductLine[] = ["women", "men", "kids"];

/** One pair per category in each line, the sharpest photo of its group, so every pick reads at hero size. */
const PICKS = Object.fromEntries(
  LINES.map((l) => [l, stylesIn(l).map((p) => groupOf(p).reduce((a, b) => (b.outer.w > a.outer.w ? b : a))).slice(0, 6)]),
) as Record<ProductLine, Product[]>;

/** Why order here: the three numbers a buyer plans around (the top bar already carries MOQ, samples and shipping). */
const WHY = [
  { value: LEAD.quote, label: "Quote turnaround" },
  { value: `${parseInt(LEAD.bulk)} days`, label: "Bulk production" },
  { value: `${PRIVATE_LABEL_MIN} pairs`, label: "Private label from" },
];

/**
 * First view, product first: a short promise and one action on the left; on the right a single pair on a lit
 * floor, switchable by line and style, that opens its details or goes straight onto the inquiry list.
 * No cards, no borders: type, light and the cutouts carry it.
 */
export function HeroShowcase() {
  const [line, setLine] = useState<ProductLine>("women");
  const [index, setIndex] = useState(0);
  const openQuickView = useUI((s) => s.openQuickView);
  const toggle = useInquiry((s) => s.toggle);
  const picks = PICKS[line];
  const f = picks[Math.min(index, picks.length - 1)];
  const inList = useInCart(f.id);

  return (
    <section id="hero" aria-labelledby="hero-title" className="bleed relative isolate overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f6f5f2_100%)]">
      <div className="wrap grid items-center gap-x-14 gap-y-12 px-(--shell-pad) pt-[clamp(32px,6vh,72px)] pb-[clamp(40px,7vh,80px)] lg:min-h-[min(calc(100svh-112px),880px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* the promise */}
        <div className="mx-auto w-full max-w-[560px] text-center lg:mx-0 lg:text-left">
          <p className="inline-flex animate-rise-in items-center gap-2 text-[13px] font-semibold text-muted motion-reduce:animate-none">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
            FW26 wholesale collection
          </p>
          <h1
            id="hero-title"
            className="mt-5 animate-rise-in text-[clamp(40px,10.5vw,54px)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance [animation-delay:70ms] motion-reduce:animate-none lg:text-[clamp(54px,4.7vw,76px)]"
          >
            <span className="block text-ink">Winter footwear,</span>
            <span className="block text-[#7b8187]">factory-direct.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[27rem] animate-rise-in text-[17px] leading-[1.55] text-pretty text-ink-2 [animation-delay:140ms] motion-reduce:animate-none lg:mx-0">
            Boots, sneakers and sandals for North American retailers, distributors and private-label brands.
          </p>
          <div className="mt-8 flex animate-rise-in flex-wrap items-center justify-center gap-x-7 gap-y-2 [animation-delay:210ms] motion-reduce:animate-none lg:justify-start">
            <OpenInquiryButton className="btn btn-dark shadow-[0_10px_24px_-12px_rgb(18_20_22/.6)]">
              Get wholesale pricing <Icon name="arrow" className="size-4" />
            </OpenInquiryButton>
            <Link href="/catalog" className="group inline-flex h-12 items-center gap-1.5 text-[15px] font-semibold text-ink">
              Browse {products.length} styles
              <Icon name="arrow" className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
            </Link>
          </div>
          <dl className="mx-auto mt-[clamp(36px,6vh,56px)] grid max-w-[440px] animate-rise-in grid-cols-3 gap-6 [animation-delay:280ms] motion-reduce:animate-none lg:mx-0">
            {WHY.map((w) => (
              <div key={w.label} className="flex flex-col-reverse gap-1">
                <dt className="text-[13px] leading-snug text-muted">{w.label}</dt>
                <dd className="text-[clamp(20px,2vw,26px)] font-semibold tracking-[-0.03em] text-ink tabular-nums">{w.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* the product */}
        <div className="relative min-w-0">
          <div role="group" aria-label="Product line" className="flex justify-center gap-7 lg:justify-start">
            {LINES.map((l) => {
              const on = l === line;
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={on}
                  onClick={() => (setLine(l), setIndex(0))}
                  className={`relative h-11 text-[15px] font-semibold transition-colors duration-200 ${on ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  {LINE_LABEL[l]}
                  <span className="ml-1.5 text-[12.5px] font-medium text-muted tabular-nums">{inLine(l).length}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-1 h-0.5 origin-left rounded-full bg-ink transition-transform duration-300 ease-soft ${on ? "scale-x-100" : "scale-x-0"}`}
                  />
                </button>
              );
            })}
          </div>

          {/* the pair on a lit floor; it opens its details */}
          <div className="relative mx-auto mt-2 h-[clamp(260px,46vh,500px)] w-full">
            <span aria-hidden="true" className="absolute inset-[2%_6%] rounded-full bg-[radial-gradient(closest-side,#ffffff,rgb(255_255_255/0))]" />
            <span aria-hidden="true" className="absolute bottom-[7%] left-1/2 h-[8%] w-[58%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(18_20_22/.14),rgb(18_20_22/0))]" />
            <button
              key={f.id}
              type="button"
              onClick={() => openQuickView(f.id)}
              aria-label={`Chime Long ${f.name}, ${categoryOf(f)}. View details`}
              className="group absolute inset-[4%_6%_11%] animate-rise-in outline-offset-8 motion-reduce:animate-none"
            >
              <Image
                src={f.outer.src}
                alt=""
                fill
                preload={line === "women" && index === 0}
                sizes="(min-width: 74rem) 52vw, 92vw"
                className="object-contain object-bottom drop-shadow-[0_22px_20px_rgb(18_20_22/.12)] transition-transform duration-700 ease-soft group-hover:scale-[1.03]"
              />
            </button>
          </div>

          {/* what it is, and the two things a buyer does next */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 max-lg:flex-col max-lg:text-center">
            <div aria-live="polite">
              <p className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{f.name}</p>
              <p className="mt-0.5 text-[14px] text-muted">
                {categoryOf(f)} · {f.sizes} · {PACK} pairs per case
              </p>
            </div>
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => openQuickView(f.id)} className="h-11 text-[14px] font-semibold text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline">
                View details
              </button>
              <button
                type="button"
                onClick={() => toggle(f.id)}
                aria-pressed={inList}
                className="group inline-flex h-11 items-center gap-2 text-[14px] font-semibold text-ink"
              >
                <span className={`grid size-8 place-items-center rounded-full transition-colors duration-200 ${inList ? "bg-brand text-white" : "bg-ink text-white group-hover:bg-accent-hover"}`}>
                  <Icon name={inList ? "check" : "plus"} className="size-4" />
                </span>
                {inList ? "On your inquiry list" : "Add to inquiry"}
              </button>
            </div>
          </div>

          {/* every kind in the line, one tap each */}
          <ul aria-label={`${LINE_LABEL[line]} styles`} className="mt-5 flex justify-center gap-1 lg:justify-start">
            {picks.map((p, i) => {
              const on = p.id === f.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-pressed={on}
                    aria-label={`Show ${p.name}, ${categoryOf(p)}`}
                    className="group relative block h-16 w-[clamp(52px,14vw,84px)]"
                  >
                    <Image
                      src={p.outer.src}
                      alt=""
                      fill
                      sizes="84px"
                      className={`object-contain p-2 transition-[opacity,scale] duration-300 ease-soft ${on ? "opacity-100" : "opacity-40 group-hover:scale-105 group-hover:opacity-80"}`}
                    />
                    <span aria-hidden="true" className={`absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-ink transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
