import clsx from "clsx";
import { describe, notable } from "@/lib/availability";
import { availabilityOf } from "@/lib/content/live";
import Image from "next/image";
import { Badge } from "../ui/Badge";
import { QuickViewLink } from "../ui/QuickViewLink";
import { AddButton } from "./AddButton";
import { GroupAddButton } from "./ColorChooser";
import { categoryOf, groupOf, LINE_LABEL, MOQ_PAIRS, PACK, type Product } from "@/lib/products";

const DOTS = 4;

/**
 * Catalogue card for a category (or a single style): the photo does the work. Hover swaps to the zip-side view, or to the
 * category's next style; the whole card opens Quick View (Enter on the name link), while its href takes crawlers and
 * new-tab clicks to the product page.
 * `variant="glass"` sets the card on a frosted pane; `single` always shows the one style, never its category.
 */
export function ProductCard({
  p,
  sizes = "(max-width: 864px) 70vw, 300px",
  className,
  variant = "plain",
  single = false,
}: {
  p: Product;
  sizes?: string;
  className?: string;
  variant?: "plain" | "glass";
  single?: boolean;
}) {
  const group = groupOf(p);
  // A card that stands for a whole category is named after it; a one-shoe category keeps the shoe's name.
  const many = !single && group.length > 1;
  const alt = p.zip ?? (single ? undefined : group.find((x) => x.id !== p.id)?.outer);
  const glass = variant === "glass";
  return (
    <article
      data-card
      data-flip-id={p.id}
      className={clsx(
        "group relative flex min-w-0 flex-col",
        glass &&
          "glass rounded-[24px] p-2 pb-4 transition-[translate,box-shadow] duration-500 ease-soft hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_30px_60px_-30px_rgb(152_64_128/0.35)]",
        className,
      )}
    >
      <div
        data-deco="card"
        className={clsx(
          "relative aspect-[4/5] overflow-hidden",
          glass ? "rounded-[18px] bg-[radial-gradient(80%_70%_at_50%_45%,rgb(255_255_255/0.95),rgb(255_255_255/0.35))]" : "rounded-card bg-tile",
        )}
      >
        <Badge badge={p.badge} className="absolute top-3 left-3 z-[2]" />
        {notable(availabilityOf(p.id)) && availabilityOf(p.id)!.status !== "order" && (
          <span
            className={clsx(
              "absolute top-3 right-3 z-[2] rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
              availabilityOf(p.id)!.status === "soldout" ? "bg-[#8a3b0a] text-white" : availabilityOf(p.id)!.status === "stock" ? "bg-[#1f6b45] text-white" : "bg-white/90 text-ink",
            )}
          >
            {describe(availabilityOf(p.id)).label}
          </span>
        )}
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

      <div className={clsx("mt-4 flex items-start justify-between gap-3", glass && "px-2")}>
        <h3 className="text-[16px] font-semibold tracking-[-0.01em]">
          <QuickViewLink
            id={p.id}
            slug={p.slug}
            aria-haspopup="dialog"
            className={clsx("text-left after:absolute after:inset-0 after:z-[1]", glass ? "after:rounded-[24px]" : "after:rounded-card")}
          >
            {many ? categoryOf(p) : `Chime Long ${p.name}`}
          </QuickViewLink>
        </h3>
        <span className="mt-1.5 flex flex-none items-center -space-x-1" title={(many ? group : [p]).map((x) => `${x.name} (${x.color.name})`).join(", ")}>
          {(many ? group : [p]).slice(0, DOTS).map((x) => (
            <span key={x.id} className="size-3.5 rounded-full ring-2 ring-white inset-ring inset-ring-ink/15" style={{ background: x.color.hex }} />
          ))}
          {many && group.length > DOTS && <span className="pl-2 text-[12px] font-semibold text-muted tabular-nums">+{group.length - DOTS}</span>}
        </span>
      </div>
      <p className={clsx("mt-0.5 text-[13.5px] text-muted", glass && "px-2")}>
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
      <p className={clsx("mt-2 text-[13.5px] font-semibold tabular-nums", glass && "px-2")}>
        {MOQ_PAIRS} pairs MOQ
        <span className="font-normal text-muted">
          {" "}
          · {PACK} per case · <span className="whitespace-nowrap">{p.sizes}</span>
        </span>
      </p>
    </article>
  );
}
