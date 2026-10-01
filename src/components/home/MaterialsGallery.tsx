import clsx from "clsx";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { CropImage } from "../ui/CropImage";
import { QuickViewButton } from "../ui/QuickViewButton";
import { SectionHead } from "../ui/SectionHead";
import { byId, CROPS } from "@/lib/products";

// One tall tile (the full ARTICA zip) + a 3×2 grid of details.
const ORDER = ["zip-pull", "collar", "eyelets", "lining", "stitching", "heel", "patent"];

export function MaterialsGallery() {
  const crops = ORDER.map((id) => CROPS.find((c) => c.id === id)!);
  return (
    <section id="materials" aria-labelledby="h-materials" className="mt-sec scroll-mt-6">
      <SectionHead
        id="h-materials"
        title="Materials"
        muted="up close"
        right={
          <OpenInquiryButton className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink">
            Request swatches <Icon name="arrow" />
          </OpenInquiryButton>
        }
      />
      <ul className="bleed grid grid-cols-2 gap-1.5 md:grid-cols-4">
        {crops.map((c, i) => {
          const tall = i === 0;
          const name = byId[c.productId].name;
          return (
            <li key={c.id} data-reveal className={clsx(tall && "row-span-2")}>
              <QuickViewButton
                id={c.productId}
                aria-label={`${c.label} · ${name}, view details`}
                className="group relative block size-full overflow-hidden bg-photo border border-line/40 transition-all hover:border-ink/20"
              >
                <CropImage
                  crop={c}
                  aspect={tall ? 0.4 : 0.8}
                  className={clsx("transition-transform duration-700 ease-soft group-hover:scale-108", tall ? "h-full min-h-full" : "aspect-[4/5]")}
                />
                <div className="glass absolute bottom-3 left-3 z-[2] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-ink shadow-xs">
                  <span className="mono-label text-[9px] text-accent">0{i + 1}</span>
                  <span className="text-line">•</span>
                  <span>{c.label} · {name}</span>
                </div>
                <span className="glass absolute top-3 right-3 z-[2] grid size-8 place-items-center rounded-full text-ink opacity-0 shadow-xs transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Icon name="zoom" className="size-3.5" />
                </span>
              </QuickViewButton>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
