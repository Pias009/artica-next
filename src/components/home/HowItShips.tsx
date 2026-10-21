"use client";

import { useRef } from "react";
import { byDepth, iso, IsoBox, IsoQuad, KRAFT, viewBoxFor, WHITE_BOX, WOOD } from "../ui/Iso";
import { SectionHead } from "../ui/SectionHead";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { CASE_PACK, CASES_PER_PALLET, LEAD, PACK } from "@/lib/products";

const U = 30;
const LEAD_DAYS = LEAD.delivery.replace("d", "");

/* ---------- scene 1: one shoebox, lid drops on ---------- */
function Shoebox() {
  const base = { x: 0, y: 0, z: 0, w: 3, d: 1.8, h: 1.05 };
  const lid = { x: -0.07, y: -0.07, z: 1.05, w: 3.14, d: 1.94, h: 0.34 };
  return (
    <svg viewBox={viewBoxFor([base, { ...lid, z: lid.z + 0.6 }], U, 18)} className="w-full">
      <IsoBox {...base} u={U} {...WHITE_BOX}>
        {/* barcode label on the front */}
        <IsoQuad u={U} fill="#121416" opacity={0.75} c={[[2.1, 1.8, 0.25], [2.7, 1.8, 0.25], [2.7, 1.8, 0.7], [2.1, 1.8, 0.7]]} />
      </IsoBox>
      <g data-anim="lid">
        <IsoBox {...lid} u={U} top="#ffffff" right="#e7ebed" left="#d7dee2">
          <IsoQuad u={U} fill="#2d5d6f" opacity={0.85} c={[[0.3, 1.87, 1.12], [1.5, 1.87, 1.12], [1.5, 1.87, 1.33], [0.3, 1.87, 1.33]]} />
        </IsoBox>
      </g>
    </svg>
  );
}

/* ---------- scene 2: twelve boxes fill a case, the case closes ---------- */
function Case() {
  const boxes = [] as { x: number; y: number; z: number; w: number; d: number; h: number }[];
  for (let z = 0; z < 3; z++) for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) boxes.push({ x: x * 1.5, y: y * 0.9, z: z * 0.6, w: 1.46, d: 0.86, h: 0.56 });
  boxes.sort(byDepth);
  const carton = { x: -0.08, y: -0.08, z: 0, w: 3.12, d: 1.92, h: 1.86 };
  return (
    <svg viewBox={viewBoxFor([carton, { ...carton, z: 1 }], U, 18)} className="w-full">
      {boxes.map((b, i) => (
        <g key={i} data-anim="pair">
          <IsoBox {...b} u={U} {...WHITE_BOX} />
        </g>
      ))}
      <g data-anim="carton">
        <IsoBox {...carton} u={U} {...KRAFT}>
          {/* tape and a shipping label */}
          <IsoQuad u={U} fill="#b9966d" c={[[1.33, -0.08, 1.861], [1.71, -0.08, 1.861], [1.71, 1.84, 1.861], [1.33, 1.84, 1.861]]} />
          <IsoQuad u={U} fill="#ffffff" c={[[1.8, 1.84, 0.45], [2.85, 1.84, 0.45], [2.85, 1.84, 1.25], [1.8, 1.84, 1.25]]} />
          <IsoQuad u={U} fill="#121416" opacity={0.7} c={[[1.95, 1.84, 0.6], [2.7, 1.84, 0.6], [2.7, 1.84, 0.8], [1.95, 1.84, 0.8]]} />
        </IsoBox>
      </g>
    </svg>
  );
}

/* ---------- scene 3: cartons stack onto a pallet ---------- */
function Pallet() {
  const pallet = { x: 0, y: 0, z: 0, w: 4.2, d: 3.2, h: 0.32 };
  const cartons = [] as { x: number; y: number; z: number; w: number; d: number; h: number }[];
  const layers = CASES_PER_PALLET / 6;
  for (let z = 0; z < layers; z++) for (let x = 0; x < 2; x++) for (let y = 0; y < 3; y++) cartons.push({ x: 0.05 + x * 2.05, y: 0.05 + y * 1.03, z: 0.32 + z * 0.72, w: 2.02, d: 1.0, h: 0.7 });
  cartons.sort(byDepth);
  return (
    <svg viewBox={viewBoxFor([pallet, ...cartons], U * 0.62, 14)} className="w-full">
      <IsoBox {...pallet} u={U * 0.62} {...WOOD}>
        {[0.6, 2.0, 3.4].map((x) => (
          <IsoQuad key={x} u={U * 0.62} fill="#7d6547" opacity={0.55} c={[[x, 3.2, 0.04], [x + 0.35, 3.2, 0.04], [x + 0.35, 3.2, 0.2], [x, 3.2, 0.2]]} />
        ))}
      </IsoBox>
      {cartons.map((b, i) => (
        <g key={i} data-anim="case">
          <IsoBox {...b} u={U * 0.62} {...KRAFT} stroke="rgb(90 70 40 / .25)" />
        </g>
      ))}
    </svg>
  );
}

/* ---------- scene 4: the truck rolls in ---------- */
function Truck() {
  const u = U * 0.55;
  const trailer = { x: 0, y: 0, z: 0.5, w: 6.2, d: 2.3, h: 2.7 };
  const cab = { x: 6.3, y: 0.15, z: 0.5, w: 1.8, d: 2.0, h: 2.0 };
  const wheels = [0.9, 2.1, 5.3, 7.2].map((x) => iso(x, 2.3, 0.42, u));
  const road = [
    { x: -1, y: 2.9, z: 0, w: 1.4, d: 0.12, h: 0.001 },
    { x: 1.4, y: 2.9, z: 0, w: 1.4, d: 0.12, h: 0.001 },
    { x: 3.8, y: 2.9, z: 0, w: 1.4, d: 0.12, h: 0.001 },
    { x: 6.2, y: 2.9, z: 0, w: 1.4, d: 0.12, h: 0.001 },
    { x: 8.6, y: 2.9, z: 0, w: 1.0, d: 0.12, h: 0.001 },
  ];
  return (
    <svg viewBox={viewBoxFor([trailer, cab, ...road], u, 14)} className="w-full">
      {road.map((r, i) => (
        <IsoBox key={i} {...r} u={u} top="#c9d4da" right="#c9d4da" left="#c9d4da" stroke="none" />
      ))}
      <g data-anim="truck">
        <IsoBox {...trailer} u={u} {...WHITE_BOX}>
          <IsoQuad u={u} fill="#2d5d6f" c={[[0.4, 2.3, 1.3], [5.8, 2.3, 1.3], [5.8, 2.3, 1.55], [0.4, 2.3, 1.55]]} />
        </IsoBox>
        <IsoBox {...cab} u={u} top="#3a4046" right="#2a2f34" left="#121416">
          <IsoQuad u={u} fill="#cfe0e8" c={[[8.1, 0.45, 1.75], [8.1, 1.85, 1.75], [8.1, 1.85, 2.3], [8.1, 0.45, 2.3]]} />
        </IsoBox>
        {wheels.map(([cx, cy], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={u * 0.42} ry={u * 0.36} fill="#121416" />
        ))}
      </g>
    </svg>
  );
}

const STEPS = [
  { id: "box", n: "1 pair", title: "Shelf-ready box", text: "Every pair in its own box, labelled and ready for your stockroom.", scene: Shoebox, tone: "bg-tile" },
  { id: "case", n: `${PACK} pairs`, title: "One mixed-size case", text: "A full size run in one case, so a single case stocks a shelf.", scene: Case, tone: "bg-sand" },
  {
    id: "pallet",
    n: `${CASES_PER_PALLET} cases`,
    title: `One pallet, ${(CASES_PER_PALLET * PACK).toLocaleString("en-US")} pairs`,
    text: "Indicative pallet load; exact count confirmed on your quote.",
    scene: Pallet,
    tone: "bg-stone",
  },
  { id: "truck", n: `${LEAD_DAYS} days`, title: "Door to door", text: "DDP, FOB or EXW, shipped worldwide.", scene: Truck, tone: "bg-frost" },
];

/** How an order is packed: shoebox → case → pallet → truck, each scene building as you scroll. */
export function HowItShips() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const card = (id: string) => ref.current!.querySelector<HTMLElement>(`[data-ship="${id}"]`)!;
        const st = (id: string) => ({ trigger: card(id), start: "top 88%", end: "top 30%", scrub: 0.6 });
        const q = (id: string, a: string) => card(id).querySelectorAll(`[data-anim="${a}"]`);

        gsap.timeline({ scrollTrigger: st("box") }).from(q("box", "lid"), { y: -70, opacity: 0, ease: "power2.out", duration: 1 });

        gsap
          .timeline({ scrollTrigger: st("case") })
          .from(q("case", "pair"), { y: -40, opacity: 0, ease: "power2.out", duration: 0.4, stagger: 0.07 })
          .from(q("case", "carton"), { opacity: 0, duration: 0.35 }, ">-0.05");

        gsap.timeline({ scrollTrigger: st("pallet") }).from(q("pallet", "case"), { y: -50, opacity: 0, ease: "power2.out", duration: 0.3, stagger: 0.035 });

        gsap.timeline({ scrollTrigger: st("truck") }).from(q("truck", "truck"), { x: -90, y: -52, opacity: 0, ease: "power3.out", duration: 1 });

        gsap.from("[data-ratio]", {
          opacity: 0,
          y: 8,
          stagger: 0.05,
          duration: 0.4,
          scrollTrigger: { trigger: card("case"), start: "top 75%", end: "bottom top", toggleActions: "play reverse play reverse" },
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="packing" aria-labelledby="h-packing" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-packing"
        title="How your order is packed and shipped."
        sub="From a single pair to a full pallet at your door: wholesale quantities, packed the way your stockroom works."
      />
      <ol className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const Scene = s.scene;
          return (
            <li key={s.id} data-ship={s.id} className="flex flex-col">
              <div className={`relative grid aspect-square place-items-center overflow-hidden rounded-card px-[12%] ${s.tone}`} aria-hidden="true">
                <Scene />
                {i < STEPS.length - 1 && (
                  <span className="absolute top-1/2 -right-3 hidden size-6 -translate-y-1/2 place-items-center rounded-full bg-white shadow-soft lg:grid">
                    <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-ink stroke-2">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="mt-5 text-[32px] leading-none font-semibold tracking-[-0.03em] text-glacier tabular-nums">{s.n}</p>
              <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.01em]">{s.title}</h3>
              <p className="mt-1 text-[15px] text-ink-2">{s.text}</p>
              {s.id === "case" && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Pairs per size in one men's case">
                  {CASE_PACK.men.map(([size, n]) => (
                    <li key={size} data-ratio className="rounded-full bg-tile px-2.5 py-1 text-[12.5px] font-medium tabular-nums">
                      US {size} <span className="text-muted">×{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
