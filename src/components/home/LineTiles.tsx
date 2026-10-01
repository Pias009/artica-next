"use client";

import clsx from "clsx";
import Image from "next/image";
import { Icon } from "../Icon";
import { img, type Filter } from "@/lib/products";
import { useUI } from "@/lib/store";

const TILES: {
  title: string;
  text: string;
  stats: string[];
  filter?: Filter;
  cta: string;
  image: string;
  alt: string;
  imgClass?: string;
  logoTag?: boolean;
}[] = [
  {
    title: "Women",
    text: "Suede ankle and knee-high boots.",
    stats: ["US 5–10", "MOQ 300"],
    filter: "women",
    cta: "View line",
    image: img("p02-women-tall-suede-outer-view"),
    alt: "Black suede knee-high boot with block heel",
    imgClass: "right-[10%] w-[34%]",
  },
  {
    title: "Men",
    text: "Leather lace-ups and zip boots.",
    stats: ["US 7–13", "MOQ 300"],
    filter: "men",
    cta: "View line",
    image: img("p04-men-leather-winter-lace-up-outer-view"),
    alt: "Black leather winter lace-up boot with wool collar",
  },
  {
    title: "Kids",
    text: "Bright patent lace-ups, easy zip.",
    stats: ["Youth 11–4", "MOQ 300"],
    filter: "kids",
    cta: "View line",
    image: img("p03-pink-patent-lace-up-outer-view"),
    alt: "Pink patent lace-up boot with black laces",
  },
  {
    title: "Private label",
    text: "Your logo on pull, insole, box.",
    stats: ["From 600 pairs"],
    cta: "See options",
    image: img("p05-leather-shearling-zip-boot-outer-view"),
    alt: "Black leather shearling-lined zip boot",
    logoTag: true,
  },
];

/** 2×2 line tiles. A line tile filters the Top reorders rail and scrolls back up to it. */
export function LineTiles() {
  const setRailFilter = useUI((s) => s.setRailFilter);

  const go = (filter?: Filter) => {
    if (filter) setRailFilter(filter);
    document.getElementById(filter ? "styles" : "partner")?.scrollIntoView({ block: "start" });
  };

  return (
    <section id="lines" aria-label="Product lines" className="mt-sec grid scroll-mt-6 gap-3.5 md:grid-cols-2">
      {TILES.map((t, i) => (
        <article
          key={t.title}
          data-reveal
          className="group bg-studio-side relative isolate flex min-h-[190px] overflow-hidden rounded-card border border-line/60 text-ink shadow-xs card-lift sm:min-h-[210px]"
        >
          <span className="absolute -top-[30%] -right-[6%] z-0 aspect-square w-[62%] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/.7),transparent)]" />
          <div className="relative z-[2] flex max-w-[58%] flex-col gap-2 p-[22px] sm:max-w-[48%] sm:px-7 sm:py-[24px]">
            <div className="flex items-center gap-2">
              <span className="mono-label text-[9px] text-muted">
                {t.filter ? `LINE 0${i + 1}` : "OEM SERVICE"}
              </span>
            </div>
            <h3 className="text-2xl font-extrabold tracking-[-.02em] whitespace-nowrap uppercase text-ink">{t.title}</h3>
            <p className="max-w-[24ch] text-[13px] text-studio-ink-2">{t.text}</p>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {t.stats.map((s) => (
                <span key={s} className="rounded-md border border-line/50 bg-white/70 px-2 py-0.5 text-[11px] font-bold text-ink">
                  {s}
                </span>
              ))}
            </span>
            <button
              type="button"
              onClick={() => go(t.filter)}
              className="mt-auto inline-flex min-h-9 items-center gap-2 self-start pt-2 text-[12.5px] font-bold text-ink hover:text-accent after:absolute after:inset-0 after:z-[1] after:rounded-card"
            >
              {t.cta}
              <Icon name="arrow" className="transition-transform duration-300 ease-soft group-hover:translate-x-1" />
            </button>
          </div>
          {t.logoTag && (
            <span className="absolute top-[22%] right-[30%] z-[3] -rotate-8 rounded-md bg-label px-2.5 py-1.5 text-[10px] font-extrabold tracking-[.16em] text-ink shadow-[0_6px_16px_rgb(29_30_25/.16)] before:absolute before:top-1/2 before:-left-[7px] before:h-px before:w-2 before:bg-ink">
              YOUR LOGO
            </span>
          )}
          <span
            className={clsx(
              "absolute right-[4%] bottom-[8%] z-[1] h-[84%] transition-transform duration-[900ms] ease-soft group-hover:-translate-y-2 group-hover:-rotate-3",
              t.imgClass ?? "w-[48%] sm:w-[52%]",
            )}
          >
            <Image src={t.image} alt={t.alt} fill sizes="(max-width: 864px) 50vw, 340px" className="object-contain object-right-bottom drop-shadow-tile" />
          </span>
        </article>
      ))}
    </section>
  );
}
