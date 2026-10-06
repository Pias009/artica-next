"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "../Icon";
import { categoryOf, groupOf, inLine, LEAD, LINE_LABEL, MOQ_PAIRS, PACK, stylesIn, type ProductLine } from "@/lib/products";
import { useUI } from "@/lib/store";

/** Columns the samples tile spans (2 cols, 4 from lg) after 0–3 category tiles, so the row is always full. */
const PROMO_SPAN = ["col-span-2 lg:col-span-4", "lg:col-span-3", "col-span-2", ""];

/** Mega-menu preview of one line: its terms, its categories, and the biggest ones to open straight away. */
export function LinePeek({ line }: { line: ProductLine }) {
  const openQuickView = useUI((s) => s.openQuickView);
  const shoes = inLine(line);
  const label = LINE_LABEL[line];
  // Biggest categories first: those are the ones worth a photo.
  const cats = stylesIn(line)
    .map((p) => ({ p, name: categoryOf(p), n: groupOf(p).length }))
    .sort((a, b) => b.n - a.n);

  return (
    <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:p-7">
      <div className="flex flex-col">
        <p className="text-[13px] font-semibold tracking-[0.08em] text-brand uppercase">FW26 · {label}</p>
        <p className="mt-2 text-[34px] leading-none font-semibold tracking-[-0.035em] tabular-nums">
          {shoes.length} <span className="text-ink-2">{shoes.length === 1 ? "style" : "styles"}</span>
        </p>
        {cats.length > 1 && <p className="mt-1.5 text-[13px] font-medium text-brand">in {cats.length} categories</p>}
        <p className="mt-2 text-[14px] text-muted">
          {shoes[0]?.sizes} · {PACK} pairs per case · from {MOQ_PAIRS} pairs
        </p>

        {cats.length > 1 && (
          <>
            <p className="mt-6 text-[13px] font-semibold text-ink-2">Shop by category</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <li key={c.name}>
                  <Link
                    href={`/catalog?line=${line}&q=${encodeURIComponent(c.name)}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-chip px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-ink hover:text-white"
                  >
                    {c.name}
                    <span className="text-[12px] tabular-nums opacity-60">{c.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-auto pt-7">
          <Link href={`/catalog?line=${line}`} className="btn btn-dark group/v h-11! px-5! text-[14px]!">
            View all {label.toLowerCase()}
            <Icon name="arrow" className="size-4 transition-transform duration-300 ease-soft group-hover/v:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cats.slice(0, 3).map(({ p, name, n }, i) => (
          <li key={p.id} className="animate-rise-in" style={{ animationDelay: `${60 + i * 50}ms` }}>
            <button type="button" onClick={() => openQuickView(p.id)} aria-haspopup="dialog" className="group flex h-full w-full flex-col text-left">
              <span className="relative block aspect-square overflow-hidden rounded-card bg-tile">
                <span className="absolute inset-[13%_9%] transition-transform duration-500 ease-soft group-hover:scale-[1.07] group-hover:-rotate-2">
                  <Image src={p.outer.src} alt="" fill sizes="(min-width: 1184px) 240px, 45vw" className="object-contain drop-shadow-boot" />
                </span>
                {n > 1 && (
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink-2 tabular-nums shadow-soft">
                    {n} styles
                  </span>
                )}
                <span className="absolute inset-x-2.5 bottom-2.5 flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-ink py-2 text-[12px] font-semibold text-white opacity-0 transition-[opacity,translate] duration-300 ease-soft group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  <Icon name="zoom" className="size-3.5" /> Quick view
                </span>
              </span>
              <span className="mt-2.5 block text-[15px] font-semibold">{n > 1 ? name : p.name}</span>
              <span className="block truncate text-[13px] text-muted">{n > 1 ? `${p.name} and ${n - 1} more` : p.type}</span>
            </button>
          </li>
        ))}

        {/* one wholesale nudge, stretching over whatever slots a small line leaves empty */}
        <li className={clsx("animate-rise-in [animation-delay:210ms]", PROMO_SPAN[Math.min(3, cats.length)])}>
          <Link
            href="/#samples"
            className={clsx(
              "group relative flex flex-col justify-between overflow-hidden rounded-card bg-brand p-4 text-white transition-colors hover:bg-brand-deep",
              cats.length < 3 ? "h-full min-h-[180px]" : "aspect-square",
            )}
          >
            <span aria-hidden className="absolute -top-10 -right-10 size-36 rounded-full bg-white/10 transition-transform duration-700 ease-soft group-hover:scale-125" />
            <span aria-hidden className="absolute -right-4 -bottom-16 size-40 rounded-full bg-white/5" />
            {cats.length < 3 && shoes[0] && (
              <span aria-hidden className="absolute top-[10%] right-[6%] bottom-[10%] w-[46%] -rotate-6 transition-transform duration-700 ease-soft group-hover:-rotate-3 group-hover:scale-105 max-lg:hidden">
                <Image src={shoes[0].outer.src} alt="" fill sizes="280px" className="object-contain drop-shadow-hero" />
              </span>
            )}
            <Icon name="sample" className="relative size-6" />
            <span className="relative">
              <span className="block text-[19px] leading-tight font-semibold tracking-[-0.02em]">Samples in {LEAD.samples.replace("d", " days")}</span>
              <span className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-white/80">
                Feel the {label.toLowerCase()}&rsquo;s line first
                <Icon name="arrow" className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
