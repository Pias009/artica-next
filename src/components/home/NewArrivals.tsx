import Image from "next/image";
import Link from "next/link";
import { AddButton } from "../product/AddButton";
import { Badge } from "../ui/Badge";
import { QuickViewButton } from "../ui/QuickViewButton";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { getProduct, LINE_LABEL, MOQ_PAIRS, PACK, type Product } from "@/lib/products";

/**
 * Just in for FW26 (client placeholder list): the two styles badged "New" first, then a spread of the season's fresh
 * colours and kinds across the three lines.
 */
const NEW_ARRIVALS = ["tundra", "pop", "zinnia", "lynx", "toffee", "frost", "blossom", "bluebell"];

/**
 * New arrivals: one style per card, named (not grouped by category like the range grid), so a buyer can see exactly
 * what landed this season. The photo opens Quick View; the round + puts the style on the inquiry list at MOQ.
 */
export function NewArrivals() {
  const items = NEW_ARRIVALS.map(getProduct).filter((p): p is Product => !!p);

  return (
    <section id="new" aria-labelledby="h-new" className="mt-[clamp(48px,6vw,88px)] scroll-mt-24">
      <SectionHead
        id="h-new"
        title="New arrivals"
        sub="Just landed for FW26. Sample any style in 10 days."
        right={
          <Link href="/catalog">
            <ArrowLink>Shop all new</ArrowLink>
          </Link>
        }
      />

      <ul className="scrollbar-none -mx-(--shell-pad) flex snap-x scroll-px-(--shell-pad) gap-4 overflow-x-auto px-(--shell-pad) pb-2 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible lg:grid-cols-4">
        {items.map((p, i) => (
          <li key={p.id} className="w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none">
            <article className="group relative flex h-full flex-col">
              <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-tile">
                <Badge badge="New" className="absolute top-3 left-3 z-[2]" />
                <AddButton
                  id={p.id}
                  className="absolute right-3 bottom-3 z-[3] size-11 shadow-soft transition-[opacity,background-color,color,scale] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:aria-pressed:opacity-100"
                />
                <span className="absolute inset-[16%_9%] transition-transform duration-700 ease-soft group-hover:scale-[1.06]">
                  <Image
                    src={p.outer.src}
                    alt={p.desc}
                    fill
                    sizes="(max-width: 33rem) 72vw, (max-width: 74rem) 45vw, 300px"
                    loading={i < 4 ? "eager" : "lazy"}
                    className="object-contain drop-shadow-boot"
                  />
                </span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-semibold tracking-[-0.01em]">
                  <QuickViewButton id={p.id} className="text-left after:absolute after:inset-0 after:z-[1] after:rounded-card">
                    Chime Long {p.name}
                  </QuickViewButton>
                </h3>
                <span
                  className="mt-1.5 size-3.5 flex-none rounded-full ring-2 ring-white inset-ring inset-ring-ink/15"
                  style={{ background: p.color.hex }}
                  title={p.color.name}
                />
              </div>
              <p className="mt-0.5 text-[14px] text-muted">
                {p.type} · {LINE_LABEL[p.line]}
              </p>
              <p className="mt-2 text-[14px] font-semibold tabular-nums">
                {MOQ_PAIRS} pairs MOQ
                <span className="font-normal text-muted"> · {PACK} per case</span>
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
