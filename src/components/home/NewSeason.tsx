import clsx from "clsx";
import Image from "next/image";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { AddButton } from "../product/AddButton";
import { Badge } from "../ui/Badge";
import { QuickViewButton } from "../ui/QuickViewButton";
import { SectionHead } from "../ui/SectionHead";
import { byId, PRIVATE_LABEL_MIN, type Product } from "@/lib/products";

const TILES: { id: string; tone: string; big?: boolean }[] = [
  { id: "p05", tone: "bg-sand", big: true },
  { id: "p03", tone: "bg-blush" },
  { id: "p02", tone: "bg-stone" },
  { id: "p01", tone: "bg-sage" },
];

/** Bento: one big hero tile, three product tiles and a private-label brief tile. */
export function NewSeason() {
  return (
    <section id="new" aria-labelledby="h-new" className="mt-sec scroll-mt-6">
      <SectionHead
        id="h-new"
        title="New"
        muted="this season"
        right={
          <OpenInquiryButton className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink">
            New arrivals sheet <Icon name="arrow" />
          </OpenInquiryButton>
        }
      />
      <div className="grid auto-rows-[minmax(240px,1fr)] gap-3.5 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[270px_270px]">
        {TILES.map((t) => (
          <BentoTile key={t.id} p={byId[t.id]} tone={t.tone} big={t.big} />
        ))}
        <div data-reveal className="relative isolate flex flex-col justify-between gap-4 overflow-hidden rounded-shell border border-line/60 bg-kraft p-6 text-ink shadow-soft card-lift">
          <div className="flex items-center justify-between">
            <Icon name="tag" className="size-7 text-ink" />
            <span className="mono-label rounded-full bg-ink/10 px-2.5 py-1 text-[9.5px] font-bold text-ink">
              WHITE-LABEL OEM
            </span>
          </div>
          <div>
            <p className="mono-label text-ink/70">Custom Development</p>
            <p className="mt-1 text-[clamp(22px,2.4vw,30px)] leading-none font-extrabold uppercase tracking-tight">Your Brand Spec</p>
            <p className="mt-2 text-sm font-semibold text-ink/80">Custom lasts, embossing & box packaging from {PRIVATE_LABEL_MIN} pairs</p>
          </div>
          <OpenInquiryButton buyerType="Private label brand" className="btn self-start bg-label text-ink shadow-sm hover:bg-white">
            Start a custom brief <Icon name="arrow" />
          </OpenInquiryButton>
        </div>
      </div>
    </section>
  );
}

function BentoTile({ p, tone, big }: { p: Product; tone: string; big?: boolean }) {
  return (
    <article
      data-reveal
      className={clsx(
        "group relative isolate overflow-hidden rounded-shell border border-line/60 card-lift transition-all",
        tone,
        big && "min-h-[420px] sm:col-span-2 lg:col-span-1 lg:row-span-2",
      )}
    >
      {big && (
        <span aria-hidden="true" className="type-giant pointer-events-none absolute top-12 left-5 z-0 text-[clamp(52px,6.2vw,92px)] text-white/50 select-none">
          {p.name}
        </span>
      )}
      <div className="absolute top-4 left-4 z-[2] flex items-center gap-1.5">
        <Badge badge={p.badge} />
        <span className="mono-label rounded-md bg-white/70 px-2 py-0.5 text-[9px] text-ink font-bold">
          {p.id.toUpperCase()}
        </span>
      </div>
      <AddButton id={p.id} className="absolute top-4 right-4 z-[3] size-10 shadow-sm" />
      <span
        className={clsx(
          "absolute z-[1] transition-transform duration-[900ms] ease-soft group-hover:scale-108 group-hover:-rotate-3",
          big ? "inset-[20%_8%_20%]" : "inset-[14%_14%_28%]",
        )}
      >
        <Image src={p.outer.src} alt={p.desc} fill sizes={big ? "(max-width: 1184px) 90vw, 440px" : "(max-width: 1184px) 45vw, 300px"} className="object-contain drop-shadow-hero" />
      </span>
      <div className="glass absolute inset-x-3.5 bottom-3.5 z-[2] rounded-2xl px-4 py-2.5 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-extrabold uppercase tracking-wide text-ink">
            <QuickViewButton id={p.id} className="text-left uppercase after:absolute after:inset-0 after:z-[1]">
              ARTICA {p.name}
            </QuickViewButton>
          </h3>
          <span className="mono-label text-[10px] text-muted">{p.line}</span>
        </div>
        <p className="mt-0.5 text-xs text-ink-2">
          {p.sizes} · {p.spec}
        </p>
      </div>
    </article>
  );
}
