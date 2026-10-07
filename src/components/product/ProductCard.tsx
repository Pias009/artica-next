import clsx from "clsx";
import Image from "next/image";
import { Badge } from "../ui/Badge";
import { QuickViewButton } from "../ui/QuickViewButton";
import { AddButton } from "./AddButton";
import { GroupAddButton } from "./ColorChooser";
import { categoryOf, groupOf, LINE_LABEL, MOQ_PAIRS, PACK, type Product } from "@/lib/products";

const DOTS = 4;

/**
 * Catalogue card for a category (or a single style): the photo does the work. Hover swaps to the zip-side view, or to the
 * category's next style; the whole card opens Quick View (Enter on the name button).
 */
export function ProductCard({ p, sizes = "(max-width: 864px) 70vw, 300px", className }: { p: Product; sizes?: string; className?: string }) {
  const group = groupOf(p);
  // A card that stands for a whole category is named after it; a one-shoe category keeps the shoe's name.
  const many = group.length > 1;
  const alt = p.zip ?? group.find((x) => x.id !== p.id)?.outer;
  return (
    <article data-card data-flip-id={p.id} className={clsx("group relative flex min-w-0 flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-tile">
        <Badge badge={p.badge} className="absolute top-3 left-3 z-[2]" />
        {/* several colours: the + opens a colour chooser; a single style adds straight away */}
        {many ? (
          <GroupAddButton
            id={p.id}
            className="absolute right-3 bottom-3 z-[3] size-11 shadow-soft md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:data-[on=true]:opacity-100"
          />
        ) : (
          <AddButton
            id={p.id}
            className="absolute right-3 bottom-3 z-[3] size-11 shadow-soft transition-[opacity,background-color,color,scale] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:aria-pressed:opacity-100"
          />
        )}
        <span className="absolute inset-[18%_9%] transition-transform duration-700 ease-soft group-hover:scale-[1.06]">
          <Image
            src={p.outer.src}
            alt={p.desc}
            fill
            sizes={sizes}
            className={clsx("object-contain drop-shadow-boot transition-opacity duration-500", alt && "group-hover:opacity-0")}
          />
          {alt && (
            <Image
              src={alt.src}
              alt=""
              fill
              sizes={sizes}
              className="object-contain opacity-0 drop-shadow-boot transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </span>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h3 className="text-[16px] font-semibold tracking-[-0.01em]">
          <QuickViewButton id={p.id} className="text-left after:absolute after:inset-0 after:z-[1] after:rounded-card">
            {many ? categoryOf(p) : `Chime Long ${p.name}`}
          </QuickViewButton>
        </h3>
        <span className="mt-1.5 flex flex-none items-center -space-x-1" title={group.map((x) => `${x.name} (${x.color.name})`).join(", ")}>
          {group.slice(0, DOTS).map((x) => (
            <span key={x.id} className="size-3.5 rounded-full ring-2 ring-white inset-ring inset-ring-ink/15" style={{ background: x.color.hex }} />
          ))}
          {group.length > DOTS && <span className="pl-2 text-[12px] font-semibold text-muted tabular-nums">+{group.length - DOTS}</span>}
        </span>
      </div>
      <p className="mt-0.5 text-[14px] text-muted">
        {many ? (
          <>
            <span className="font-medium text-brand">{group.length} styles</span> · {p.name} and {group.length - 1} more · {LINE_LABEL[p.line]}
          </>
        ) : (
          <>
            {p.type} · {LINE_LABEL[p.line]}
          </>
        )}
      </p>
      <p className="mt-2 text-[14px] font-semibold tabular-nums">
        {MOQ_PAIRS} pairs MOQ
        <span className="font-normal text-muted">
          {" "}
          · {PACK} per case · {p.sizes}
        </span>
      </p>
    </article>
  );
}
