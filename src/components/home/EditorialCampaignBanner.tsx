"use client";

import Image from "next/image";
import { useRef } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { getProduct, type Product } from "@/lib/products";
import { useUI } from "@/lib/store";

/** The two pairs on foot in the campaign shot: his Nord, her Mira Tall. */
const WORN = ["nord", "mira-tall"].map(getProduct).filter((p): p is Product => !!p);

/**
 * The FW26 campaign, one photograph wide. As the section scrolls in, the shot opens out of a smaller window to the
 * full banner while the picture settles from a close crop, then keeps drifting gently as you scroll on; both follow
 * the scroll, so scrolling back closes it again. The heading sits on the photo (it arrives with the page's other
 * headings), and the two pairs being worn float on it as glass chips that open their quick view.
 */
export function EditorialCampaignBanner() {
  const openQuickView = useUI((s) => s.openQuickView);
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const frame = "[data-campaign]";
        gsap
          .timeline({ scrollTrigger: { trigger: frame, start: "top bottom", end: "top 12%", scrub: 1.2 } })
          // the frame grows to full size (a transform: the GPU moves it without repainting the photo)
          .fromTo(frame, { scale: 0.8 }, { scale: 1, ease: "power2.out" }, 0)
          .fromTo("[data-campaign-img]", { scale: 1.28 }, { scale: 1.06, ease: "power2.out" }, 0)
          .from("[data-chip]", { y: 40, autoAlpha: 0, stagger: 0.15, ease: "power3.out" }, 0.45);
        gsap.fromTo(
          "[data-campaign-drift]",
          { yPercent: 0 },
          { yPercent: 6, ease: "none", scrollTrigger: { trigger: frame, start: "top 12%", end: "bottom top", scrub: 1.2 } },
        );
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="campaign" aria-labelledby="h-campaign" className="mt-sec scroll-mt-24">
      <div data-campaign className="relative isolate h-[min(165vw,680px)] overflow-hidden rounded-shell bg-photo sm:h-[clamp(520px,78vh,760px)]">
        <span data-campaign-drift className="absolute -inset-y-[6%] inset-x-0 block">
          <Image
            data-campaign-img
            src="/images/models/08-banner-duo-campaign-pavilion.jpg"
            alt="A couple walking through a snowy mountain pavilion, he in black leather lace-up boots, she in tall suede boots"
            fill
            sizes="(min-width: 80rem) 1280px, 100vw"
            className="object-cover object-[44%_50%]"
          />
        </span>
        {/* shade so the copy reads: from the bottom, and from the left on wide screens */}
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgb(12_13_14/.78),rgb(12_13_14/.2)_45%,transparent_70%)] sm:bg-[linear-gradient(0deg,rgb(12_13_14/.7),transparent_55%),linear-gradient(90deg,rgb(12_13_14/.45),transparent_55%)]" />

        <div className="absolute inset-x-5 bottom-5 flex flex-col gap-6 sm:inset-x-8 sm:bottom-8 lg:inset-x-12 lg:bottom-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[560px] text-white">
            <p className="eyebrow text-white/80! before:bg-white/60!">FW26 campaign</p>
            <h2 id="h-campaign" className="type-section mt-3 text-white! [&_em]:text-[#f2c9ea]!">
              Built for sub-zero. <em>Styled for the shelf.</em>
            </h2>
            <OpenInquiryButton
              buyerType="Retailer"
              className="group mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-ink transition-colors hover:bg-brand hover:text-white"
            >
              Get wholesale pricing <Icon name="arrow" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </OpenInquiryButton>
          </div>

          {/* the pairs in the shot */}
          <ul aria-label="Worn in this shot" className="flex flex-wrap gap-2.5">
            {WORN.map((p) => (
              <li key={p.id} data-chip>
                <button
                  type="button"
                  onClick={() => openQuickView(p.id)}
                  aria-label={`Chime Long ${p.name}: view details`}
                  className="group flex items-center gap-3 rounded-full bg-white/15 py-1.5 pr-4 pl-1.5 text-left text-white ring-1 ring-white/35 backdrop-blur-xl transition-colors hover:bg-white/25"
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-white/90">
                    <Image src={p.outer.src} alt="" fill sizes="48px" className="-scale-x-100 object-contain p-1.5" />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[14px] leading-tight font-semibold">{p.name}</b>
                    <span className="block text-[12px] text-white/75">{p.sizes}</span>
                  </span>
                  <Icon name="arrow" className="ml-1 size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
