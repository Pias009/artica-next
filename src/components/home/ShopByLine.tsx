"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { AddButton } from "../product/AddButton";
import { Badge } from "../ui/Badge";
import { QuickViewButton } from "../ui/QuickViewButton";
import { SectionHead } from "../ui/SectionHead";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { CASE_PACK, inLine, LINE_LABEL, MOQ_PAIRS, type Product, type ProductLine } from "@/lib/products";

const LINES: ProductLine[] = ["men", "women", "kids"];
const PANEL_TONE: Record<ProductLine, string> = { men: "bg-sage", women: "bg-blush", kids: "bg-sand" };

export function ShopByLine() {
  const [line, setLine] = useState<ProductLine>("men");
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const list = inLine(line);
  const sizes = list[0]?.sizes ?? "";

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-line-item]", { y: 24, autoAlpha: 0, duration: 0.6, ease: "power3.out", stagger: 0.07 });
      });
    },
    { dependencies: [line], scope: ref },
  );

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (LINES.indexOf(line) + d + LINES.length) % LINES.length;
    setLine(LINES[next]);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <section id="shop-by-line" aria-labelledby="h-line" className="mt-sec">
      <SectionHead
        id="h-line"
        title="Shop"
        muted="by line"
        right={
          <div role="tablist" aria-label="Lines" className="flex rounded-full bg-chip p-1">
            {LINES.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                id={`lt-${l}`}
                aria-selected={l === line}
                aria-controls="line-panel"
                tabIndex={l === line ? 0 : -1}
                onClick={() => setLine(l)}
                onKeyDown={onKey}
                className="h-11 rounded-full px-5 text-[13px] font-semibold text-ink-2 transition-colors aria-selected:bg-accent aria-selected:text-on-accent"
              >
                {LINE_LABEL[l]}
              </button>
            ))}
          </div>
        }
      />

      <div ref={ref} id="line-panel" role="tabpanel" aria-labelledby={`lt-${line}`} className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div data-line-item className={clsx("flex min-h-[260px] flex-col rounded-shell border border-line/60 p-[clamp(20px,2.6vw,30px)] shadow-soft md:col-span-2 lg:col-span-1 lg:h-[440px]", PANEL_TONE[line])}>
          <span className="mono-label text-[10px] text-ink/70">CATALOGUE DIVISION</span>
          <p className="type-giant mt-1">{LINE_LABEL[line]}</p>
          <p className="mt-3 text-sm font-semibold text-ink-2">
            {list.length} style{list.length > 1 ? "s" : ""} · {sizes} · 12 pairs / case
          </p>
          <p className="mt-1 text-xs text-ink-2 tabular-nums">
            Pre-pack: {CASE_PACK[line].map(([s, n]) => `${s}×${n}`).join(" ")}
          </p>
          <OpenInquiryButton className="btn mt-auto self-start border border-line/40 bg-surface/90 text-ink shadow-sm hover:bg-surface">
            {LINE_LABEL[line]} line sheet <Icon name="arrow" />
          </OpenInquiryButton>
        </div>
        {list.slice(0, 2).map((p) => (
          <LineCard key={p.id} p={p} />
        ))}
        {list.length < 2 && (
          <div data-line-item className="bg-stripes flex h-[440px] flex-col items-start justify-end gap-2 rounded-shell border border-line/60 p-6 shadow-soft">
            <span className="mono-label text-[9.5px] text-muted">BESPOKE PRODUCTION</span>
            <p className="type-section">
              Made to
              <br />
              <span className="text-muted">your spec</span>
            </p>
            <OpenInquiryButton buyerType="Private label brand" className="btn btn-dark mt-2 shadow-sm">
              Custom brief <Icon name="arrow" />
            </OpenInquiryButton>
          </div>
        )}
      </div>
    </section>
  );
}

function LineCard({ p }: { p: Product }) {
  return (
    <article data-line-item className="group bg-studio relative h-[440px] overflow-hidden rounded-shell border border-line/60 shadow-soft card-lift">
      <Badge badge={p.badge} className="absolute top-4 left-4 z-[2]" />
      <AddButton id={p.id} className="absolute top-4 right-4 z-[3] size-10 shadow-sm" />
      <span className="absolute inset-[12%_10%_30%] transition-transform duration-[900ms] ease-soft group-hover:-translate-y-2 group-hover:scale-105 group-hover:-rotate-3">
        <Image src={p.outer.src} alt={p.desc} fill sizes="(max-width: 864px) 80vw, 380px" className={clsx("object-contain drop-shadow-hero transition-opacity duration-500", p.zip && "group-hover:opacity-0")} />
        {p.zip && (
          <Image src={p.zip.src} alt="" fill sizes="(max-width: 864px) 80vw, 380px" className="object-contain opacity-0 drop-shadow-hero transition-opacity duration-500 group-hover:opacity-100" />
        )}
      </span>
      <div className="glass-card absolute inset-x-3.5 bottom-3.5 flex items-end justify-between gap-3 rounded-card px-4 py-3 shadow-soft">
        <div className="min-w-0">
          <h3 className="text-[14px] font-extrabold uppercase tracking-wide text-ink">
            <QuickViewButton id={p.id} className="text-left uppercase after:absolute after:inset-0 after:z-[1]">
              ARTICA {p.name}
            </QuickViewButton>
          </h3>
          <p className="truncate text-xs text-studio-ink-2">{p.type}</p>
        </div>
        <div className="flex-none text-right text-xs font-semibold text-ink-2">
          <b className="block text-[15px] font-extrabold text-ink tabular-nums">{MOQ_PAIRS} pr</b>
          {p.sizes}
        </div>
      </div>
    </article>
  );
}
