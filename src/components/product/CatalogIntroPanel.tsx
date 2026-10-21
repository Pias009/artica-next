import Image from "next/image";
import { Icon } from "../Icon";
import { getProduct, LEAD, MOQ_PAIRS, PACK, type Product } from "@/lib/products";

// one boot from each line: Nord in front, Lynx and Pop set back either side
const [LYNX, NORD, POP] = ["lynx", "nord", "pop"].map(getProduct) as Product[];

/** Right side of the catalog intro: three boots floating over the colour field, no frame. */
export function CatalogIntroPanel() {
  return (
    <div aria-hidden className="relative h-[280px] max-lg:hidden">
      {/* light pooled behind the group, and the floor they stand on */}
      <span className="absolute inset-x-[6%] top-[4%] bottom-[10%] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.9),transparent)]" />
      <span className="absolute inset-x-[14%] bottom-[7%] h-8 rounded-[50%] bg-[radial-gradient(closest-side,rgb(18_20_22/0.16),transparent)] blur-[2px]" />
      <span className="absolute bottom-[14%] left-[2%] h-[62%] w-[42%] -rotate-[5deg]">
        <Image src={LYNX.outer.src} alt="" fill sizes="260px" className="object-contain object-bottom drop-shadow-tile" />
      </span>
      <span className="absolute right-[2%] bottom-[14%] h-[52%] w-[40%] rotate-[5deg]">
        <Image src={POP.outer.src} alt="" fill sizes="260px" className="object-contain object-bottom drop-shadow-tile" />
      </span>
      <span className="absolute bottom-[9%] left-1/2 z-[1] h-[64%] w-[54%] -translate-x-1/2">
        <Image src={NORD.outer.src} alt="" fill sizes="340px" priority className="object-contain object-bottom drop-shadow-hero" />
      </span>
    </div>
  );
}

/** Wholesale terms as slim glass chips under the intro text. */
export function CatalogTerms() {
  const terms = [
    { icon: "box", text: `${MOQ_PAIRS} pairs MOQ` },
    { icon: "layers", text: `${PACK} pairs per case` },
    { icon: "sample", text: `Samples in ${LEAD.samples.replace("d", " days")}` },
    { icon: "tag", text: "Mixed size runs" },
  ] as const;
  return (
    <ul className="mt-7 flex flex-wrap gap-2">
      {terms.map((t) => (
        <li key={t.text} className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold text-ink">
          <Icon name={t.icon} className="size-4 text-brand" />
          {t.text}
        </li>
      ))}
    </ul>
  );
}
