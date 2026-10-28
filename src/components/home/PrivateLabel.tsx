"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "../Icon";
import { ArrowLink } from "../ui/SectionHead";
import { byId, LEAD, PRIVATE_LABEL_MIN } from "@/lib/products";
import { useUI } from "@/lib/store";

const POINTS = ["Your logo on the zip pull, insole and box", "Choose from proven lasts and outsoles", "Tier pricing from 1,000 pairs"];
const STEPS = [
  ["Brief", "Logo, colours, target price"],
  ["Sample", `Branded pair in ${LEAD.samples.replace("d", " days")}`],
  ["Bulk", `From ${PRIVATE_LABEL_MIN} pairs per style`],
] as const;
const PLACEHOLDER = "YOUR BRAND";
const MAX = 16;

/**
 * Private label: the buyer types their brand and watches it land on the boot's tag, the woven
 * insole label and the carton. The name rides along into the inquiry as a note.
 */
export function PrivateLabel() {
  const p = byId.p05;
  const id = useId();
  const openDrawer = useUI((s) => s.openDrawer);
  const [brand, setBrand] = useState("");
  const name = brand.trim().toUpperCase() || PLACEHOLDER;
  const typed = brand.trim().length > 0;

  return (
    <section id="partner" aria-labelledby="h-partner" className="mt-sec scroll-mt-24">
      <div className="glass relative isolate grid items-center gap-6 overflow-hidden rounded-shell [--glass-bg:rgb(241_236_228/.62)] md:grid-cols-2 md:gap-10">
        {/* warm studio light behind the boot */}
        <span aria-hidden className="absolute top-1/2 right-[-10%] -z-10 size-[min(90vw,720px)] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fff_0%,rgb(255_255_255/0)_65%)] opacity-80" />

        <div className="px-[clamp(24px,5vw,72px)] pt-12 md:py-16">
          <p className="eyebrow">Private label · OEM</p>
          <h2 id="h-partner" className="type-section mt-3 max-w-[14ch]">
            Your brand <em>on our boots.</em>
          </h2>
          <p className="mt-4 max-w-[40ch] text-[17px] text-ink-2">
            Private label from {PRIVATE_LABEL_MIN} pairs per style, made on the same lines as the Chime Long range.
          </p>

          {/* try it: the name goes straight onto the product */}
          <div className="mt-8 max-w-[420px]">
            <label htmlFor={`${id}-brand`} className="text-[13px] font-semibold text-ink-2">
              Try it with your brand
            </label>
            <div className="mt-2 flex h-14 items-center gap-3 rounded-full bg-white pr-2 pl-5 shadow-soft transition-shadow focus-within:ring-2 focus-within:ring-ink">
              <Icon name="tag" className="size-4 flex-none text-brand" />
              <input
                id={`${id}-brand`}
                value={brand}
                maxLength={MAX}
                autoComplete="organization"
                spellCheck={false}
                placeholder="e.g. Northfield"
                onChange={(e) => setBrand(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:font-normal placeholder:text-muted"
              />
              <span className="text-[12px] text-muted tabular-nums" aria-hidden>
                {brand.length}/{MAX}
              </span>
            </div>
            <p aria-live="polite" className="sr-only">
              {typed ? `Preview shows ${name} on the tag, insole and carton.` : ""}
            </p>
          </div>

          <ul className="mt-7 grid gap-3">
            {POINTS.map((t) => (
              <li key={t} className="flex items-start gap-3 text-[16px]">
                <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-white text-ink">
                  <Icon name="check" className="size-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => openDrawer("Private label brand", undefined, typed ? `Private label brand name: ${brand.trim()}` : undefined, "private_label")}
            >
              {typed ? `Get pricing for ${brand.trim()}` : "Get private-label pricing"}
              <Icon name="arrow" className="size-4" />
            </button>
            <Link href="/private-label">
              <ArrowLink>How it works</ArrowLink>
            </Link>
          </div>
        </div>

        <div className="relative pb-6 md:py-10 md:pr-[clamp(24px,4vw,56px)]">
          <div data-reveal className="relative aspect-[1.1/1]" aria-hidden="true">
            <Carton name={name} className="absolute bottom-[6%] left-[4%] w-[46%] -rotate-6" />
            <span className="absolute top-[8%] right-[4%] bottom-[22%] left-[28%]">
              <Image src={p.outer.src} alt="" fill sizes="(max-width: 864px) 70vw, 460px" className="object-contain drop-shadow-hero" />
            </span>

            {/* hang tag on the zip pull */}
            <span
              key={`tag-${name}`}
              className="absolute top-[18%] right-[10%] flex max-w-[44%] -rotate-[8deg] animate-rise-in items-center gap-2 rounded-md bg-white px-3 py-2 shadow-float before:absolute before:top-1/2 before:-left-5 before:h-px before:w-5 before:bg-ink"
            >
              <span className="size-1.5 flex-none rounded-full bg-brand-red" />
              <span className="truncate text-[12px] font-bold tracking-[0.16em]">{name}</span>
            </span>

            {/* woven insole label */}
            <span
              key={`insole-${name}`}
              className="absolute top-[52%] right-[30%] max-w-[36%] rotate-[4deg] animate-rise-in rounded-sm bg-ink px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-white shadow-soft [animation-delay:80ms] [background-image:repeating-linear-gradient(90deg,rgb(255_255_255/.06)_0_1px,transparent_1px_3px)]"
            >
              <span className="block truncate">{name}</span>
            </span>
          </div>

          {/* brief → sample → bulk */}
          <ol className="relative mx-[clamp(24px,5vw,72px)] grid grid-cols-3 gap-2 rounded-card bg-white/70 p-2 backdrop-blur-sm md:mx-0">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-[10px] px-3 py-2.5 first:bg-white">
                <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                  <span className="grid size-5 place-items-center rounded-full bg-ink text-[11px] text-white tabular-nums">{i + 1}</span>
                  {title}
                </p>
                <p className="mt-1 text-[12px] leading-snug text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Carton({ name, className }: { name: string; className?: string }) {
  const bars = [
    [7, 1.2], [10, 2.4], [14, 1], [16.5, 1.8], [20, 1], [22.5, 2.6], [27, 1.2],
    [30, 1], [32.5, 2], [36, 1.2], [39, 2.6], [43, 1], [45.5, 1.6], [49, 1],
  ];
  // Long names squeeze to fit the label instead of running off it.
  const fit = name.length > 11 ? { textLength: 64, lengthAdjust: "spacingAndGlyphs" as const } : {};
  return (
    <svg viewBox="0 0 260 180" className={className} style={{ filter: "drop-shadow(0 18px 18px rgb(18 20 22 / .16))" }}>
      <path d="M20 58 L130 22 L240 58 L130 94 Z" fill="var(--color-kraft)" />
      <path d="M20 58 L130 94 L130 172 L20 136 Z" fill="var(--color-kraft-d)" />
      <path d="M130 94 L240 58 L240 136 L130 172 Z" fill="var(--color-kraft)" />
      <path d="M75 40 L185 76" stroke="#8F7049" strokeWidth="7" opacity=".4" />
      {/* brand stamped on the side wall */}
      <text
        x="75"
        y="118"
        transform="skewY(18) translate(0 -42)"
        textAnchor="middle"
        fontFamily="var(--font-inter),Arial"
        fontSize="10"
        fontWeight="800"
        fill="#6e5333"
        opacity=".55"
        letterSpacing="1"
        {...(name.length > 9 ? { textLength: 80, lengthAdjust: "spacingAndGlyphs" as const } : {})}
      >
        {name}
      </text>
      <g transform="translate(146 92) skewY(-18)">
        <rect width="78" height="46" rx="3" fill="#fff" />
        <text x="7" y="14" fontFamily="var(--font-inter),Arial" fontSize="7.5" fontWeight="700" fill="#121416" letterSpacing="0.6" {...fit}>
          {name}
        </text>
        <text x="7" y="23" fontFamily="var(--font-inter),Arial" fontSize="5.5" fontWeight="600" fill="#4B5157">
          12 PRS · US 7–13
        </text>
        <g fill="#121416">
          {bars.map(([x, w]) => (
            <rect key={x} x={x} y="28" width={w} height="12" />
          ))}
        </g>
      </g>
    </svg>
  );
}
