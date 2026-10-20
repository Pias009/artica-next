"use client";

import Image from "next/image";
import { useRef } from "react";
import { SectionHead } from "../ui/SectionHead";
import { gsap, useGSAP } from "@/lib/gsap";
import { byId } from "@/lib/products";

const STEPS = [
  { time: "24 hours", title: "Quote and line sheet", text: "Send your list; tier pricing comes back within a day." },
  { time: "10 days", title: "Samples", text: "Approve fit and finish before you commit to bulk." },
  { time: "45 days", title: "Production", text: "Every batch inspected, with a photo report." },
  { time: "20 days", title: "Door delivery", text: "DDP, FOB or EXW, shipped worldwide." },
];

const WALKER = byId.p03;

/** A small boot walks the order line as you scroll, lighting each step it reaches. */
export function OrderJourney() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 864px) and (prefers-reduced-motion: no-preference)",
          narrow: "(max-width: 863px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { wide } = ctx.conditions as { wide: boolean };
          const track = ref.current!.querySelector<HTMLElement>("[data-track]")!;
          const walker = ref.current!.querySelector<HTMLElement>("[data-walker]")!;
          const steps = gsap.utils.toArray<HTMLElement>("[data-jstep]");
          gsap.set(steps, { opacity: 0.35 });

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: track, start: "top 75%", end: "bottom 45%", scrub: 0.6, invalidateOnRefresh: true },
          });
          tl.to(
            walker,
            wide ? { x: () => track.clientWidth - walker.offsetWidth, duration: 1 } : { y: () => track.clientHeight - walker.offsetHeight, duration: 1 },
            0,
          )
            .from("[data-progress]", wide ? { scaleX: 0, duration: 1 } : { scaleY: 0, duration: 1 }, 0)
            // a little rocking step, like walking
            .to("[data-walker-img]", { rotation: 6, duration: 0.125, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0);
          steps.forEach((s, i) => tl.to(s, { opacity: 1, duration: 0.08 }, Math.max(0, i / (steps.length - 1) - 0.06)));
        },
      );
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="journey" aria-labelledby="h-journey" className="mt-sec">
      <div className="rounded-shell bg-frost px-[clamp(20px,4vw,64px)] py-[clamp(48px,6vw,88px)]">
        <SectionHead id="h-journey" title="From inquiry to your shelf in about 11 weeks." sub="One contact handles your order from quote to delivery." />

        <div className="relative grid gap-0 md:block">
          {/* track: horizontal on wide screens, vertical on phones */}
          <div
            data-track
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-[22px] w-14 md:relative md:left-0 md:mb-10 md:h-20 md:w-full"
          >
            <span className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-white md:top-auto md:right-0 md:bottom-2 md:left-0 md:h-0.5 md:w-full md:translate-x-0">
              <span data-progress className="block size-full origin-top rounded-full bg-glacier md:origin-left" />
            </span>
            <span data-walker className="absolute top-0 left-0 block h-16 w-14 md:h-[72px] md:w-[92px]">
              <span data-walker-img className="absolute inset-0 origin-bottom">
                <Image src={WALKER.outer.src} alt="" fill sizes="92px" className="object-contain drop-shadow-boot" />
              </span>
            </span>
          </div>

          <ol className="grid gap-10 pl-24 md:grid-cols-4 md:gap-8 md:pl-0">
            {STEPS.map((s) => (
              <li key={s.title} data-jstep>
                <p className="text-[clamp(30px,3vw,44px)] leading-none font-semibold tracking-[-0.03em] text-glacier tabular-nums">{s.time}</p>
                <p className="mt-3 text-[18px] font-semibold tracking-[-0.01em]">{s.title}</p>
                <p className="mt-1 max-w-[30ch] text-[15px] text-ink-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
