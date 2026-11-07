"use client";

import { Txt } from "../ui/Txt";
import { SectionText } from "../ui/SectionText";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { MOQ_PAIRS, PACK } from "@/lib/products";

/** The terms a retailer asks first, straight from the catalogue's own numbers. */
const POINTS = [
  { icon: "box", title: `From ${MOQ_PAIRS} pairs per style`, body: `${PACK} to a case, sizes mixed your way` },
  { icon: "sample", title: "Samples in 10 days", body: "Fit and finish in your hands first" },
  { icon: "truck", title: "Door-to-door, worldwide", body: "DDP, FOB or EXW" },
] as const;

type Look = { src: string; alt: string; label: string; href: string; tall: boolean; pos?: string };

/** Two columns of the FW26 shoot; they drift past each other in opposite directions as the section scrolls. */
const COLUMNS: Look[][] = [
  [
    { src: "/images/models/04-women-mira-tall-suede-lookbook.jpg", alt: "Woman on a stone bench in tall taupe suede boots", label: "Women · Tall boots", href: "/catalog?line=women", tall: true },
    { src: "/images/models/07-banner-women-snow-onfeet.jpg", alt: "Cream shearling-collar lace-up boots walking on a snowy stone path", label: "Women · Lace-up boots", href: "/catalog?line=women", tall: false, pos: "object-[62%_60%]" },
    { src: "/images/models/03-women-mira-black-ankle-lookbook.jpg", alt: "Woman in an oatmeal coat walking in black suede ankle boots", label: "Women · Ankle boots", href: "/catalog?line=women", tall: true },
  ],
  [
    { src: "/images/models/10-men-urban-hiker-lookbook.jpg", alt: "Man in a charcoal overcoat walking down snowy steps in black lace-up boots", label: "Men · Lace-up boots", href: "/catalog?line=men", tall: true },
    { src: "/images/models/09-women-toffee-chelsea-lookbook.jpg", alt: "Woman in a camel sweater wearing toffee suede chelsea boots", label: "Women · Chelsea boots", href: "/catalog?line=women", tall: true },
    { src: "/images/models/06-banner-men-street-onfeet.jpg", alt: "Black leather lace-up boots under cuffed denim on a wet city street", label: "Men · On foot", href: "/catalog?line=men", tall: false, pos: "object-[30%_60%]" },
  ],
];

/**
 * Worn in the city: the range on foot, for the buyer picturing it in their own windows. A fixed-height glass panel:
 * the heading and the terms on the left; on the right two columns of the FW26 shoot that drift past each other, one
 * rising and one falling, for as long as the section is on screen (tied to the scroll, so it runs backwards on the
 * way up). The heading arrives with the page's other headings (HomeReveal). Reduced motion shows the columns still.
 */
export function RetailMerchandisingBanner() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const box = ref.current?.querySelector<HTMLElement>("[data-looks]");
        const [up, down] = gsap.utils.toArray<HTMLElement>("[data-col]");
        if (!box || !up || !down) return;
        const travel = (col: HTMLElement) => Math.max(0, col.scrollHeight - box.clientHeight);
        const st = { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 1.2, invalidateOnRefresh: true };
        gsap.fromTo(up, { y: 0 }, { y: () => -travel(up), ease: "none", scrollTrigger: st });
        gsap.fromTo(down, { y: () => -travel(down) }, { y: 0, ease: "none", scrollTrigger: st });
        gsap.from("[data-point]", {
          x: -30,
          autoAlpha: 0,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-points]", start: "top 92%", end: "top 60%", scrub: 1.2 },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="worn" aria-labelledby="h-merchandising" className="mt-sec scroll-mt-24">
      <div className="glass grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-shell [--glass-bg:rgb(244_238_232/.6)] lg:h-[clamp(560px,78vh,680px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
          <Txt as="p" k="eyebrow" label="Small label above" className="eyebrow">Worn in the city</Txt>
          <SectionText as="h2" part="title" id="h-merchandising" className="type-section mt-3 max-w-[15ch]">
            Made to stop <em>foot traffic.</em>
          </SectionText>
          <SectionText part="sub" className="mt-4 max-w-[36ch] text-[16px] leading-relaxed text-ink-2">
            Real looks on real streets, to picture every pair in your windows.
          </SectionText>

          <ul data-points className="mt-7 max-w-[420px] divide-y divide-ink/8 border-y border-ink/8">
            {POINTS.map((pt, i) => (
              <li key={pt.title} data-point className="flex items-center gap-3.5 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-brand shadow-[0_6px_14px_-8px_rgb(18_20_22/.35)]">
                  <Icon name={pt.icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <Txt as="b" k={`point${i + 1}.name`} label={`Point ${i + 1}: title`} className="block text-[14.5px] font-semibold">{pt.title}</Txt>
                  <Txt k={`point${i + 1}.text`} label={`Point ${i + 1}: text`} className="block text-[13px] text-muted">{pt.body}</Txt>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <OpenInquiryButton
              buyerType="Retailer"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition-colors hover:bg-brand"
            >
              <Txt k="button" label="Button 1">Get wholesale pricing</Txt> <Icon name="arrow" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </OpenInquiryButton>
            <Link href="/catalog" className="inline-flex h-12 items-center rounded-full bg-white/70 px-6 text-[14px] font-semibold text-ink transition-colors hover:bg-white">
              <Txt k="button2" label="Button 2">Shop all styles</Txt>
            </Link>
          </div>
        </div>

        {/* the looks: two columns drifting past each other */}
        <div
          data-looks
          aria-label="FW26 looks"
          role="group"
          className="relative grid h-[min(130vw,560px)] grid-cols-2 gap-3 overflow-hidden px-3 sm:gap-4 sm:px-4 lg:h-full lg:pr-4 lg:pl-0"
        >
          {COLUMNS.map((col, c) => (
            <ul key={c} data-col className={`flex flex-col gap-3 will-change-transform sm:gap-4 ${c ? "pt-10" : ""}`}>
              {col.map((l) => (
                <li key={l.src}>
                  <Link href={l.href} className={`group relative block overflow-hidden rounded-[20px] bg-photo ${l.tall ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
                    <Image
                      src={l.src}
                      alt={l.alt}
                      fill
                      sizes="(min-width: 64rem) 340px, 46vw"
                      className={`object-cover ${l.pos ?? "object-[50%_30%]"} transition-transform duration-[1.2s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.06]`}
                    />
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                    <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-white">
                      <span className="truncate text-[12px] font-semibold tracking-[0.12em] uppercase sm:text-[11.5px]">
                        {/* phones keep just the category ("Tall boots"); the line shows from sm up */}
                        <span className="max-sm:hidden">{l.label.split(" · ")[0]} · </span>
                        {l.label.split(" · ")[1]}
                      </span>
                      <Icon name="arrow" className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,translate] duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
