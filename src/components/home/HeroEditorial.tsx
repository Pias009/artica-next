"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { categoryOf, groupOf, inLine, LEAD, LINE_LABEL, PRIVATE_LABEL_MIN, products, stylesIn, type Product, type ProductLine } from "@/lib/products";
import { useUI } from "@/lib/store";

const LINES: ProductLine[] = ["women", "kids", "men"];

/** Which kinds make the strongest still life, best first: the tallest silhouettes lead. */
const PREFERENCE = ["Tall boots", "Snow boots", "Chelsea boots", "Lace-up boots", "Hiker boots", "Combat boots", "Ankle boots", "Sneakers"];
const rank = (p: Product) => {
  const i = PREFERENCE.indexOf(categoryOf(p));
  return i < 0 ? PREFERENCE.length : i;
};

/** Up to three pairs per line, the sharpest photo of each kind: centre, left, right. */
const TRIOS = Object.fromEntries(
  LINES.map((l) => [
    l,
    stylesIn(l)
      .map((p) => groupOf(p).reduce((a, b) => (b.outer.w > a.outer.w ? b : a)))
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 3),
  ]),
) as Record<ProductLine, Product[]>;

/** Where each pair stands on the stage: the lead in front and tall, two supporting pairs set back on either side. */
const SLOTS = [
  "left-1/2 -translate-x-1/2 bottom-[13%] h-[74%] w-[52%] z-[2]",
  "left-[3%] bottom-[16%] h-[44%] w-[38%] z-[1]",
  "right-[3%] bottom-[16%] h-[44%] w-[38%] z-[1]",
];

const WHY = [
  { value: LEAD.quote, label: "Quote turnaround" },
  { value: `${parseInt(LEAD.bulk)} days`, label: "Bulk production" },
  { value: `${PRIVATE_LABEL_MIN} pairs`, label: "Private label from" },
];

/**
 * First view, kept still and quiet: the promise and two actions on the left; on the right a campaign-style still life
 * of three pairs on a tonal stage. Underneath, the three lines as direct ways in; pointing at one restages the still
 * life with that line. No cards, no borders, no autoplay.
 */
export function HeroEditorial() {
  const [line, setLine] = useState<ProductLine>("women");
  const openQuickView = useUI((s) => s.openQuickView);
  const trio = TRIOS[line];

  return (
    <section id="hero" aria-labelledby="hero-title" className="bleed relative isolate overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7f6f3_100%)]">
      <div className="wrap px-(--shell-pad) pt-[clamp(28px,5vh,64px)] pb-[clamp(28px,4.5vh,48px)]">
        <div className="grid items-center gap-x-12 gap-y-6 lg:min-h-[min(calc(100svh-112px-150px),700px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
          {/* the promise */}
          <div className="mx-auto w-full max-w-[540px] text-center lg:mx-0 lg:text-left">
            <p className="inline-flex animate-rise-in items-center gap-2 text-[13px] font-semibold text-muted motion-reduce:animate-none">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
              FW26 wholesale collection
            </p>
            <h1
              id="hero-title"
              className="mt-5 animate-rise-in text-[clamp(38px,9.6vw,52px)] leading-[1] font-semibold tracking-[-0.045em] text-balance text-ink [animation-delay:70ms] motion-reduce:animate-none lg:text-[clamp(48px,4.3vw,68px)]"
            >
              Factory-direct footwear for North American retail.
            </h1>
            <p className="mx-auto mt-6 max-w-[26rem] animate-rise-in text-[17px] leading-[1.55] text-pretty text-ink-2 [animation-delay:140ms] motion-reduce:animate-none lg:mx-0">
              Winter boots, sneakers and sandals for retailers, distributors and private-label brands.
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
            <dl className="mx-auto mt-[clamp(32px,5vh,48px)] grid max-w-[420px] animate-rise-in grid-cols-3 gap-6 [animation-delay:280ms] motion-reduce:animate-none lg:mx-0">
              {WHY.map((w) => (
                <div key={w.label} className="flex flex-col-reverse justify-end gap-1">
                  <dt className="text-[13px] leading-snug text-muted">{w.label}</dt>
                  <dd className="text-[clamp(20px,1.8vw,24px)] font-semibold tracking-[-0.03em] text-ink tabular-nums">{w.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* the still life */}
          <div className="relative mx-auto aspect-[1.18] w-full max-w-[720px] lg:max-w-none">
            <span aria-hidden="true" className="absolute inset-x-[6%] top-[4%] bottom-[2%] rounded-full bg-[radial-gradient(closest-side,#eeebe5_0%,#f1efea_62%,rgb(241_239_234/0)_100%)]" />
            <span aria-hidden="true" className="absolute bottom-[10%] left-1/2 h-[7%] w-[78%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(40_30_18/.13),rgb(40_30_18/0))]" />
            {trio.map((p, i) => (
              <button
                key={`${line}-${p.id}`}
                type="button"
                onClick={() => openQuickView(p.id)}
                aria-label={`Chime Long ${p.name}, ${categoryOf(p)}. View details`}
                className={`group absolute animate-rise-in outline-offset-8 motion-reduce:animate-none ${SLOTS[i]}`}
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <Image
                  src={p.outer.src}
                  alt=""
                  fill
                  preload={line === "women" && i === 0}
                  sizes={i === 0 ? "(min-width: 74rem) 30vw, 52vw" : "(min-width: 74rem) 20vw, 38vw"}
                  className={`object-contain object-bottom transition-transform duration-700 ease-soft group-hover:-translate-y-1.5 ${i === 0 ? "drop-shadow-[0_24px_22px_rgb(40_30_18/.16)]" : "drop-shadow-[0_16px_14px_rgb(40_30_18/.12)]"}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* the three ways in */}
        <nav aria-label="Shop by line" className="mt-[clamp(20px,3vh,32px)] grid grid-cols-3 gap-x-4 sm:gap-x-8">
          {LINES.map((l) => {
            const on = l === line;
            const lead = TRIOS[l][0];
            return (
              <Link
                key={l}
                href={`/catalog?line=${l}`}
                onPointerEnter={() => setLine(l)}
                onFocus={() => setLine(l)}
                className="group flex items-center gap-3 py-3 max-sm:flex-col max-sm:gap-1.5 max-sm:text-center"
              >
                <span className="relative block size-12 shrink-0 sm:size-14">
                  <Image src={lead.outer.src} alt="" fill sizes="56px" className={`object-contain transition-opacity duration-300 ${on ? "opacity-100" : "opacity-55 group-hover:opacity-100"}`} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[15px] font-semibold transition-colors duration-200 sm:text-[16px] ${on ? "text-ink" : "text-ink-2 group-hover:text-ink"}`}>{LINE_LABEL[l]}</span>
                  <span className="block text-[13px] text-muted tabular-nums">{inLine(l).length} styles</span>
                </span>
                <Icon name="arrow" className="ml-auto size-4 text-ink-2 transition-transform duration-300 ease-soft group-hover:translate-x-1 max-sm:hidden" />
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
