"use client";

import Image from "next/image";
import { useRef } from "react";
import { Icon } from "../Icon";
import { CropImage } from "../ui/CropImage";
import { QuickViewButton } from "../ui/QuickViewButton";
import { SectionHead } from "../ui/SectionHead";
import { gsap, useGSAP } from "@/lib/gsap";
import { byId, CROPS, type Crop } from "@/lib/products";

const P = byId.p04;
const crop = (id: string) => CROPS.find((c) => c.id === id)!;

const STEPS: { title: string; text: string; x: number; y: number; scale: number; crop: Crop }[] = [
  { title: "Wool herringbone collar", text: "Padded and soft where the boot meets the leg.", x: 17, y: 20, scale: 2.4, crop: crop("collar") },
  { title: "Metal hooks", text: "Fast, even lacing from toe to collar.", x: 41, y: 20, scale: 2.5, crop: crop("eyelets") },
  { title: "Stitched welt", text: "Upper stitched to the sole, then sealed.", x: 78, y: 81, scale: 2.6, crop: crop("stitching") },
  {
    title: "Rubber lug outsole",
    text: "6 mm lugs for packed snow and icy sidewalks.",
    x: 40,
    y: 92,
    scale: 2.3,
    crop: { id: "outsole", productId: "p04", label: "Rubber lug outsole", shot: P.outer, cx: 0.4, cy: 0.88, w: 0.34 },
  },
];

/** Signature moment: the stage zooms into each detail as you scroll (desktop); close-up crops on phones. */
export function UpClose() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-step]");
        gsap.set(items, { opacity: 0.45 });
        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: { trigger: "[data-zoom-panel]", start: "top top", end: `+=${STEPS.length * 85}%`, pin: true, scrub: 0.7, anticipatePin: 1 },
        });
        tl.to({}, { duration: 0.4 });
        STEPS.forEach((s, i) => {
          tl.to("[data-zoom]", { xPercent: (50 - s.x) * s.scale, yPercent: (50 - s.y) * s.scale, scale: s.scale, duration: 1 }, ">")
            .to(items[i], { opacity: 1, duration: 0.4 }, "<0.3");
          if (i > 0) tl.to(items[i - 1], { opacity: 0.45, duration: 0.4 }, "<");
          tl.to({}, { duration: 0.7 });
        });
        tl.to("[data-zoom]", { xPercent: 0, yPercent: 0, scale: 1, duration: 1 }).to(items[STEPS.length - 1], { opacity: 0.45, duration: 0.4 }, "<");
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="up-close" aria-labelledby="h-close" className="mt-sec">
      <div data-zoom-panel className="lg:flex lg:h-svh lg:min-h-[680px] lg:flex-col lg:justify-center">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <SectionHead id="h-close" title="Look closer." sub="The details buyers ask about, on the boot your customers will actually wear." className="mb-8!" />
            <ol className="hidden gap-1 lg:grid">
              {STEPS.map((s) => (
                <li key={s.title} data-step className="border-t border-line py-5">
                  <p className="text-[20px] font-semibold tracking-[-0.02em]">{s.title}</p>
                  <p className="mt-1 text-[16px] text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
            <QuickViewButton id={P.id} className="mt-6 hidden lg:inline-flex">
              <span className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold underline decoration-ink/25 underline-offset-[6px] hover:decoration-ink">
                See all Nord specs <Icon name="arrow" className="size-4" />
              </span>
            </QuickViewButton>
          </div>

          {/* desktop: one stage that zooms */}
          <div className="relative hidden aspect-[1.2/1] overflow-hidden rounded-shell bg-tile lg:block">
            <div className="absolute inset-0 grid place-items-center">
              <div data-zoom className="relative w-[78%]" style={{ aspectRatio: `${P.outer.w} / ${P.outer.h}` }}>
                <Image src={P.outer.src} alt={P.desc} fill sizes="1300px" quality={75} className="object-contain drop-shadow-boot" />
              </div>
            </div>
            <span className="absolute bottom-5 left-5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold">
              Chime Long Nord · Winter leather lace-up
            </span>
          </div>

          {/* phones and tablets: close-up crops */}
          <ul className="grid grid-cols-2 gap-4 lg:hidden">
            {STEPS.map((s) => (
              <li key={s.title}>
                <QuickViewButton id={P.id} aria-label={`${s.title}: view Nord details`} className="block w-full overflow-hidden rounded-card">
                  <CropImage crop={s.crop} aspect={4 / 5} className="aspect-[4/5]" />
                </QuickViewButton>
                <p className="mt-3 text-[16px] font-semibold leading-snug">{s.title}</p>
                <p className="mt-0.5 text-[14px] text-ink-2">{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
