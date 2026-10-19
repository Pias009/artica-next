"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "../Icon";
import { AddButton } from "../product/AddButton";
import { categoryOf, getProduct, products, type Product } from "@/lib/products";
import { useUI } from "@/lib/store";

/** The season's strongest sellers, one per kind, with how tall each stands on the shelf (a knee boot towers). */
const PICKS: { slug: string; h: number }[] = [
  { slug: "eclipse", h: 1 },
  { slug: "toffee", h: 0.62 },
  { slug: "frost", h: 0.78 },
  { slug: "maple", h: 0.7 },
  { slug: "nord", h: 0.66 },
  { slug: "blossom", h: 0.6 },
];

/**
 * The hero's working half: under the gallery photo, a quiet oak shelf of best sellers. Each pair opens Quick View; the
 * round + puts it straight on the inquiry list at MOQ, so a buyer can start an order without leaving the first screen.
 * No cards: the pairs stand on one shelf line, as in the room above.
 */
export function HeroShelf() {
  const openQuickView = useUI((s) => s.openQuickView);
  const picks = PICKS.map(({ slug, h }) => ({ p: getProduct(slug) as Product, h })).filter((x) => x.p);

  return (
    <div className="relative z-[3] bg-[linear-gradient(180deg,#f3ebe1,#f7f2eb)]">
      <div className="flex items-end gap-x-[clamp(16px,3vw,56px)] gap-y-6 px-(--shell-pad) pt-6 pb-5 max-lg:flex-col max-lg:items-stretch lg:px-[6.9cqw] lg:pt-[1.6cqw] lg:pb-[1.4cqw]">
        {/* what this row is */}
        <div className="flex shrink-0 items-end justify-between gap-4 lg:w-[15%] lg:flex-col lg:items-start lg:pb-[2.2cqw]">
          <div>
            <p className="text-[11px] font-medium tracking-[0.22em] text-[#6b5f63]">TOP REORDERS</p>
            <p className="mt-1.5 font-headline text-[19px] leading-tight font-semibold text-[#1d1a1b] lg:text-[max(17px,1.35cqw)]">Start with the best sellers.</p>
          </div>
          <Link href="/catalog" className="group inline-flex h-11 shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-brand lg:mt-1">
            View all {products.length} styles
            <Icon name="arrow" className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
          </Link>
        </div>

        {/* the shelf */}
        <ul aria-label="Best sellers" className="scrollbar-none relative flex min-w-0 flex-1 snap-x items-end gap-x-[clamp(14px,2vw,40px)] overflow-x-auto pb-1">
          {picks.map(({ p, h }) => (
            <li key={p.id} className="group relative flex w-[clamp(112px,9.6vw,172px)] shrink-0 snap-start flex-col items-center">
              <button
                type="button"
                onClick={() => openQuickView(p.id)}
                aria-label={`Chime Long ${p.name}, ${p.type}. Quick view`}
                className="relative block w-full outline-offset-4"
                style={{ height: `calc(clamp(86px, 7.6vw, 128px) * ${h})` }}
              >
                <Image
                  src={p.outer.src}
                  alt=""
                  fill
                  sizes="(min-width: 64rem) 12vw, 34vw"
                  className="object-contain object-bottom drop-shadow-[-4px_6px_6px_rgb(55_38_22/.22)] transition-transform duration-500 ease-soft group-hover:-translate-y-1.5"
                />
              </button>
              {/* oak shelf edge under each pair, running on into the gap so the row reads as one shelf */}
              <span aria-hidden="true" className="mt-1 block h-[3px] w-[calc(100%+clamp(14px,2vw,40px))] translate-x-[calc(clamp(14px,2vw,40px)/2)] bg-[linear-gradient(180deg,#e7d3b4,#cdb08a)] shadow-[0_3px_6px_rgb(90_65_35/.18)] group-last:w-full group-last:translate-x-0" />
              <div className="mt-2.5 flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-[#1d1a1b]">{p.name}</p>
                  <p className="truncate text-[12px] text-[#6b5f63]">{categoryOf(p)}</p>
                </div>
                <AddButton id={p.id} className="size-8 shrink-0 bg-[#1d1a1b]! text-white! shadow-soft aria-pressed:bg-brand!" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
