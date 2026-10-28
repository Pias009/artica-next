"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { iso, IsoBox, IsoQuad, KRAFT } from "../ui/Iso";
import { SectionHead } from "../ui/SectionHead";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { byId, LEAD, products } from "@/lib/products";
import { useUI } from "@/lib/store";

/* Open sample box geometry (units), projected at U px per unit. */
const U = 50;
const B = { x: 0, y: 0, z: 0, w: 4, d: 2.6, h: 1.7 };
const LID = { x: -0.08, y: -0.08, z: B.h, w: B.w + 0.16, d: B.d + 0.16, h: 0.38 };
const corners = [iso(0, 0, B.h, U), iso(B.w, 0, B.h, U), iso(B.w, B.d, B.h, U), iso(0, B.d, B.h, U), iso(B.w, B.d, 0, U), iso(0, B.d, 0, U), iso(B.w, 0, 0, U)];
const PAD = { top: 260, side: 30, bottom: 24 };
const minX = Math.min(...corners.map((c) => c[0])) - PAD.side;
const maxX = Math.max(...corners.map((c) => c[0])) + PAD.side;
const minY = Math.min(...corners.map((c) => c[1])) - PAD.top;
const maxY = Math.max(...corners.map((c) => c[1])) + PAD.bottom;
const VB = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
const pct = ([x, y]: [number, number]) => [((x - VB.x) / VB.w) * 100, ((y - VB.y) / VB.h) * 100] as const;
// Opening corners in % of the frame: back, right, front, left.
const [oB, oR, oF, oL] = [iso(0, 0, B.h, U), iso(B.w, 0, B.h, U), iso(B.w, B.d, B.h, U), iso(0, B.d, B.h, U)].map(pct);
// Everything above the opening's two front edges is visible; the rest is "inside the box".
const CLIP = `polygon(0% 0%, 100% 0%, 100% ${oR[1]}%, ${oR[0]}% ${oR[1]}%, ${oF[0]}% ${oF[1]}%, ${oL[0]}% ${oL[1]}%, 0% ${oL[1]}%)`;
const centerX = (oB[0] + oF[0]) / 2;
const centerY = (oB[1] + oF[1]) / 2;

const SAMPLE = byId.p01;

/** Samples first: the box opens and a boot rises out as you scroll; pick styles and request them. */
export function SampleRequest() {
  const [picked, setPicked] = useState<string[]>(["p04", "p01"]);
  const openDrawer = useUI((s) => s.openDrawer);
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: "[data-box]", start: "top 85%", end: "center 35%", scrub: 1.1 } })
          .fromTo("[data-lid]", { y: 0, x: 0, rotation: 0 }, { y: -150, x: 120, rotation: 16, transformOrigin: "50% 50%", ease: "power2.inOut", duration: 1 })
          .fromTo("[data-rise]", { yPercent: 78 }, { yPercent: 0, ease: "power3.out", duration: 1.2 }, 0.45)
          .fromTo("[data-tissue]", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
      });
    },
    { scope: ref },
  );

  const toggle = (id: string) => setPicked((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const request = () => {
    const names = picked.map((id) => `Chime Long ${byId[id].name}`).join(", ");
    openDrawer(undefined, undefined, `Sample request: ${names}. One pair each, mid-run size.`, "sample");
  };

  return (
    <section ref={ref} id="samples" aria-labelledby="h-samples" className="mt-sec scroll-mt-24">
      <div className="glass grid items-center gap-10 overflow-hidden rounded-shell [--glass-bg:rgb(244_232_229/.62)] lg:grid-cols-2">
        {/* the box */}
        <div data-box aria-hidden="true" className="relative mx-auto w-full max-w-[480px] px-6 pt-10 lg:pb-6">
          <div className="relative" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
            <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="absolute inset-0 size-full">
              {/* inside of the box */}
              <IsoQuad u={U} fill="#8f7049" c={[[0, 0, B.h], [B.w, 0, B.h], [B.w, B.d, B.h], [0, B.d, B.h]]} />
              <IsoQuad u={U} fill="#a3825a" c={[[0, 0, B.h], [B.w, 0, B.h], [B.w, 0, 0.35], [0, 0, 0.35]]} />
            </svg>
            {/* tissue paper and the boot, clipped so they sit inside the box */}
            <div className="absolute inset-0" style={{ clipPath: CLIP }}>
              <span
                data-tissue
                className="absolute h-[16%] w-[70%] -translate-x-1/2 rounded-[50%] bg-white/85 blur-[2px]"
                style={{ left: `${centerX}%`, top: `${centerY - 9}%` }}
              />
              <span data-rise className="absolute w-[62%] -translate-x-1/2" style={{ left: `${centerX + 2}%`, bottom: `${100 - centerY - 6}%`, aspectRatio: `${SAMPLE.outer.w} / ${SAMPLE.outer.h}` }}>
                <Image src={SAMPLE.outer.src} alt="" fill sizes="340px" className="-rotate-6 object-contain drop-shadow-boot" />
              </span>
            </div>
            <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible">
              {/* front walls drawn over the boot */}
              <IsoQuad u={U} fill={KRAFT.left} c={[[0, B.d, 0], [B.w, B.d, 0], [B.w, B.d, B.h], [0, B.d, B.h]]} />
              <IsoQuad u={U} fill={KRAFT.right} c={[[B.w, 0, 0], [B.w, B.d, 0], [B.w, B.d, B.h], [B.w, 0, B.h]]} />
              <IsoQuad u={U} fill="#ffffff" c={[[0.5, B.d, 0.45], [1.9, B.d, 0.45], [1.9, B.d, 1.15], [0.5, B.d, 1.15]]} />
              <IsoQuad u={U} fill="#2d5d6f" c={[[0.65, B.d, 0.85], [1.75, B.d, 0.85], [1.75, B.d, 1.0], [0.65, B.d, 1.0]]} />
              <IsoQuad u={U} fill="#121416" opacity={0.6} c={[[0.65, B.d, 0.58], [1.5, B.d, 0.58], [1.5, B.d, 0.72], [0.65, B.d, 0.72]]} />
              <g data-lid transform="translate(120 -150)">
                <IsoBox {...LID} u={U} {...KRAFT} stroke="rgb(90 70 40 / .25)">
                  <IsoQuad u={U} fill="#ffffff" opacity={0.9} c={[[1.5, LID.y + LID.d, LID.z + 0.06], [2.6, LID.y + LID.d, LID.z + 0.06], [2.6, LID.y + LID.d, LID.z + 0.3], [1.5, LID.y + LID.d, LID.z + 0.3]]} />
                </IsoBox>
              </g>
            </svg>
          </div>
        </div>

        {/* the request */}
        <div className="px-[clamp(24px,5vw,64px)] pb-12 lg:py-16">
          <SectionHead
            id="h-samples"
            eyebrow="Samples"
            title={
              <>
                Order <em>samples first.</em>
              </>
            }
            sub={`Check fit, leather and finish in your own hands. Samples reach you in about ${LEAD.samples.replace("d", "")} days.`}
            className="mb-8!"
          />
          <div className="flex items-baseline justify-between gap-3">
            <p id="sample-pick" className="text-[15px] font-semibold">
              Choose styles <span className="font-normal text-muted">· one pair each</span>
            </p>
            <span aria-live="polite" className="text-[13px] font-medium text-muted tabular-nums">
              {picked.length ? `${picked.length} selected` : `${products.length} styles`}
            </span>
          </div>
          {/* every style in one scrolling box, so the long range doesn't push the rest of the page down */}
          <div className="mt-3 w-full overflow-hidden rounded-card bg-white/55 ring-1 ring-ink/5">
            <div
              role="group"
              aria-labelledby="sample-pick"
              tabIndex={0}
              className="scrollbar-soft mask-fade-bottom flex max-h-[300px] flex-wrap content-start gap-2 overflow-y-auto overscroll-contain p-3 pr-2 pb-8 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink lg:max-h-[340px]"
            >
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={picked.includes(p.id)}
                  onClick={() => toggle(p.id)}
                  className="flex h-12 items-center gap-2 rounded-full bg-white pr-4 pl-1.5 text-[14px] font-medium transition-colors aria-pressed:bg-ink aria-pressed:text-white"
                >
                  <span className="relative size-9 rounded-full bg-tile">
                    <Image src={p.outer.src} alt="" fill sizes="36px" className="object-contain p-1" />
                  </span>
                  {p.name}
                  {picked.includes(p.id) && <Icon name="check" className="size-4" />}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-6 grid gap-2 text-[15px] text-ink-2">
            <li className="flex items-center gap-2.5">
              <Icon name="sample" className="size-[18px] text-glacier" /> Mid-run size by default; tell us any size in the notes
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="truck" className="size-[18px] text-glacier" /> Shipped to your office, worldwide
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="chat" className="size-[18px] text-glacier" /> Sample cost and shipping confirmed with your quote
            </li>
          </ul>
          <button type="button" onClick={request} disabled={!picked.length} className="btn btn-dark mt-8">
            Order {picked.length || ""} sample{picked.length === 1 ? "" : "s"} <Icon name="arrow" className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
