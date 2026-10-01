"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { SectionHead } from "../ui/SectionHead";
import { byId } from "@/lib/products";
import { useUI } from "@/lib/store";

type Cat = "shelf" | "unboxing" | "in-use";
type SceneKey = "shelf" | "snow" | "concrete" | "kraft" | "window" | "sage" | "blush";

/*
 * Placeholder slots until the client supplies real, permissioned partner photos.
 * Each slot is a product cutout on a coloured scene; no store names or quotes are invented.
 */
const SLOTS: { productId: string; scene: SceneKey; cat: Cat; tall: boolean }[] = [
  { productId: "p04", scene: "shelf", cat: "shelf", tall: true },
  { productId: "p01", scene: "kraft", cat: "unboxing", tall: false },
  { productId: "p03", scene: "blush", cat: "in-use", tall: true },
  { productId: "p05", scene: "concrete", cat: "in-use", tall: false },
  { productId: "p02", scene: "window", cat: "shelf", tall: true },
  { productId: "p04", scene: "snow", cat: "in-use", tall: false },
  { productId: "p01", scene: "sage", cat: "shelf", tall: true },
  { productId: "p05", scene: "kraft", cat: "unboxing", tall: false },
  { productId: "p03", scene: "window", cat: "shelf", tall: true },
  { productId: "p02", scene: "concrete", cat: "in-use", tall: false },
  { productId: "p04", scene: "kraft", cat: "unboxing", tall: true },
  { productId: "p03", scene: "snow", cat: "in-use", tall: false },
];

const SCENES: Record<SceneKey, CSSProperties> = {
  shelf: { background: "linear-gradient(180deg,#EFE9DC 0 72%,#B99F7C 72% 76%,#E5DCCB 76%)" },
  snow: { background: "radial-gradient(circle,#fff 0 1.5px,transparent 2px) 0 0/26px 26px,linear-gradient(180deg,#EDF1F2,#D3DCE0)" },
  concrete: { background: "linear-gradient(160deg,#DCDBD6,#BDBCB5)" },
  kraft: { background: "linear-gradient(160deg,#D8BC96,#B99870)" },
  window: {
    background:
      "linear-gradient(90deg,transparent 49.4%,rgb(255 255 255/.8) 49.4% 50.6%,transparent 50.6%),linear-gradient(180deg,transparent 44%,rgb(255 255 255/.8) 44% 45.5%,transparent 45.5%),linear-gradient(180deg,#F1F3EF,#D9E0D9)",
  },
  sage: { background: "#D5D8C6" },
  blush: { background: "#EEDAD5" },
};

const FILTERS: { id: "all" | Cat; label: string }[] = [
  { id: "all", label: "All" },
  { id: "shelf", label: "Shelf" },
  { id: "unboxing", label: "Unboxing" },
  { id: "in-use", label: "In use" },
];

const pad = (n: number) => String(n).padStart(2, "0");

export function StoreWall() {
  const [filter, setFilter] = useState<"all" | Cat>("all");
  const numbered = SLOTS.map((s, i) => ({ ...s, n: i + 1 }));
  const shown = numbered.filter((s) => filter === "all" || s.cat === filter);
  const rows = filter === "all" ? [shown.slice(0, 6), shown.slice(6)] : [shown, [...shown].reverse()];

  return (
    <section id="stores" aria-labelledby="h-stores" className="mt-sec scroll-mt-6">
      <SectionHead
        id="h-stores"
        title="Seen"
        muted="in stores"
        right={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Photo type">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className="h-11 rounded-full bg-chip px-4 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-chip-hover aria-pressed:bg-accent aria-pressed:text-on-accent"
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="bleed mask-fade-x grid gap-2">
        {rows.map((row, r) => (
          <MarqueeRow key={`${filter}-${r}`} slots={row} reverse={r === 1} duration={r === 0 ? 70 : 80} withCta={r === 0} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Partner photos shared with permission. Placeholder slots shown until photos are supplied.</p>
    </section>
  );
}

type Slot = (typeof SLOTS)[number] & { n: number };

function MarqueeRow({ slots, reverse, duration, withCta }: { slots: Slot[]; reverse: boolean; duration: number; withCta: boolean }) {
  const open = useUI((s) => s.openQuickView);
  // Repeat short (filtered) rows so one copy is wider than the screen, then double it for a seamless loop.
  const base: Slot[] = [];
  while (slots.length && base.length < 7) base.push(...slots);

  const copy = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} inert={hidden} className="flex flex-none gap-2 pr-2">
      {base.map((s, i) => {
        const p = byId[s.productId];
        return (
          <li key={`${s.n}-${i}`} className={clsx("h-[240px] flex-none md:h-[280px]", s.tall ? "aspect-[4/5]" : "aspect-square")}>
            <button
              type="button"
              onClick={() => open(p.id)}
              aria-label={`Photo slot ${pad(s.n)}, @store · City, ARTICA ${p.name}: view details`}
              className="group relative block size-full overflow-hidden rounded-card border border-line/50 card-lift transition-all"
              style={SCENES[s.scene]}
            >
              <span className="absolute inset-[16%_10%_26%] transition-transform duration-700 ease-soft group-hover:scale-108 group-hover:-rotate-3">
                <Image src={p.outer.src} alt="" fill sizes="240px" className="object-contain drop-shadow-boot" />
              </span>
              <span className="glass mono-label absolute top-3 left-3 rounded-full px-2.5 py-1 text-[9px] text-ink shadow-xs">
                SLOT {pad(s.n)} {"//"} {s.cat.toUpperCase()}
              </span>
              <span className="glass absolute inset-x-3 bottom-3 rounded-xl p-2.5 text-left text-ink shadow-xs">
                <span className="block text-[12px] font-bold">Stockist Showcase · City</span>
                <span className="block text-[11px] font-semibold text-ink-2">ARTICA {p.name}</span>
              </span>
            </button>
          </li>
        );
      })}
      {withCta && (
        <li className="aspect-[4/5] h-[240px] flex-none md:h-[280px]">
          <OpenInquiryButton className="flex size-full flex-col justify-between rounded-card border border-line/40 bg-accent p-6 text-left text-on-accent shadow-soft transition-all hover:bg-accent-hover card-lift">
            <div className="grid size-11 place-items-center rounded-xl bg-white/10 text-on-accent">
              <Icon name="camera" className="size-6" />
            </div>
            <span>
              <span className="mono-label text-[10px] text-on-accent/70 block mb-1">PARTNER UPLOADS</span>
              <span className="block text-[20px] leading-tight font-extrabold uppercase">Feature your storefront</span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-kraft">
                Submit high-res photo <Icon name="arrow" className="size-3.5" />
              </span>
            </span>
          </OpenInquiryButton>
        </li>
      )}
    </ul>
  );

  return (
    <div className="group/row no-scrollbar overflow-hidden motion-reduce:overflow-x-auto">
      <div
        className="motion-pause flex w-max group-hover/row:[animation-play-state:paused] group-focus-within/row:[animation-play-state:paused]"
        style={{ animation: `marquee ${duration}s linear infinite${reverse ? " reverse" : ""}` }}
      >
        {copy(false)}
        {copy(true)}
      </div>
    </div>
  );
}
