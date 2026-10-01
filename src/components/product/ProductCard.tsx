import clsx from "clsx";
import Image from "next/image";
import { Icon } from "../Icon";
import { Badge } from "../ui/Badge";
import { QuickViewButton } from "../ui/QuickViewButton";
import { AddButton } from "./AddButton";
import { MOQ_PAIRS, type Product } from "@/lib/products";

/** Rail/grid card. The whole card opens Quick View (Enter works on the title button). */
export function ProductCard({ p, sizes = "(max-width: 864px) 72vw, 260px", className }: { p: Product; sizes?: string; className?: string }) {
  return (
    <article
      data-card
      data-flip-id={p.id}
      className={clsx(
        "group relative flex min-w-0 flex-col rounded-card border border-line/60 bg-tile p-2.5 pb-4 card-lift transition-all duration-300 ease-soft hover:border-ink/20",
        className,
      )}
    >
      <div className="relative aspect-[1/0.88] overflow-hidden rounded-ph bg-photo">
        {/* Subtle studio pedestal gradient */}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.7)_0%,transparent_70%)]" />
        
        <div className="absolute top-2.5 left-2.5 z-[2] flex items-center gap-1.5">
          <Badge badge={p.badge} />
          <span className="mono-label rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] text-muted">
            {p.id.toUpperCase()}
          </span>
        </div>

        <AddButton id={p.id} className="absolute top-2.5 right-2.5 z-[3] size-[34px] shadow-xs" />
        
        <span className="absolute inset-[11%_8%] transition-transform duration-[800ms] ease-soft group-hover:-translate-y-2 group-hover:scale-105 group-hover:-rotate-2">
          <Image
            src={p.outer.src}
            alt={p.desc}
            fill
            sizes={sizes}
            className={clsx("object-contain drop-shadow-boot transition-opacity duration-500", p.zip && "group-hover:opacity-0")}
          />
          {p.zip && (
            <Image
              src={p.zip.src}
              alt=""
              fill
              sizes={sizes}
              className="object-contain opacity-0 drop-shadow-boot transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </span>
        
        <span className="glass pointer-events-none absolute bottom-2.5 left-1/2 z-[2] -translate-x-1/2 translate-y-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold whitespace-nowrap opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          Quick inspect
        </span>
      </div>

      <div className="mx-1.5 mt-3 flex items-baseline justify-between gap-1">
        <h3 className="text-[13px] font-extrabold tracking-[.04em] uppercase text-ink">
          <QuickViewButton id={p.id} className="text-left uppercase transition-colors hover:text-accent after:absolute after:inset-0 after:z-[1] after:rounded-card">
            ARTICA {p.name}
          </QuickViewButton>
        </h3>
        <span className="mono-label text-[10px] text-muted">{p.line}</span>
      </div>

      <p className="mx-1.5 mt-0.5 text-xs text-muted truncate">{p.type}</p>

      <div className="mx-1.5 mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2.5">
        <span className="text-base font-extrabold tracking-[-.01em] tabular-nums">
          {MOQ_PAIRS}
          <small className="ml-1 text-[11px] font-semibold tracking-normal text-muted">pr MOQ</small>
        </span>
        <span className="rounded-md border border-line bg-surface/80 px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-ink-2 tabular-nums">
          {p.sizes}
        </span>
      </div>

      <p className="mx-1.5 mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <Icon name="box" className="size-[13px]" />
        12/case · {p.spec}
      </p>
    </article>
  );
}
