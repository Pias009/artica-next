"use client";

import clsx from "clsx";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { byDepth, iso, IsoBox, IsoQuad, KRAFT, viewBoxFor, WHITE_BOX, WOOD } from "../ui/Iso";
import { SectionHead } from "../ui/SectionHead";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { CASES_PER_PALLET, LEAD, MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN, STEP_CASES, TIERS } from "@/lib/products";
import type { BuyerType } from "@/lib/store";

type Box = { x: number; y: number; z: number; w: number; d: number; h: number };
const U = 26;
const days = (s: string) => s.replace("d", " days");
const fmt = (n: number) => n.toLocaleString("en-US");
const TIER = TIERS[2].pairs;

/* ---------- text printed on a carton's front face (the +y plane), in isometric units ---------- */
function FaceText({ x, y, z, size, weight = 700, children }: { x: number; y: number; z: number; size: number; weight?: number; children: ReactNode }) {
  const [px, py] = iso(x, y, z, U);
  return (
    <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) skewY(30)`}>
      <text fontFamily="var(--font-inter), Arial" fontSize={size} fontWeight={weight} fill="#121416" letterSpacing={size * 0.08}>
        {children}
      </text>
    </g>
  );
}

function Carton({ b, label }: { b: Box; label?: string }) {
  return (
    <g data-drop>
      <IsoBox {...b} u={U} {...KRAFT} stroke="rgb(90 70 40 / .25)">
        <IsoQuad u={U} fill="#b9966d" c={[[b.x + b.w / 2 - 0.14, b.y, b.z + b.h + 0.002], [b.x + b.w / 2 + 0.14, b.y, b.z + b.h + 0.002], [b.x + b.w / 2 + 0.14, b.y + b.d, b.z + b.h + 0.002], [b.x + b.w / 2 - 0.14, b.y + b.d, b.z + b.h + 0.002]]} />
        {label && (
          <>
            <IsoQuad u={U} fill="#ffffff" c={[[b.x + 0.25, b.y + b.d, b.z + 0.2], [b.x + 1.45, b.y + b.d, b.z + 0.2], [b.x + 1.45, b.y + b.d, b.z + 0.75], [b.x + 0.25, b.y + b.d, b.z + 0.75]]} />
            <FaceText x={b.x + 0.35} y={b.y + b.d} z={b.z + 0.42} size={7.5}>
              {label}
            </FaceText>
          </>
        )}
      </IsoBox>
    </g>
  );
}

function Scene({ boxes, children }: { boxes: Box[]; children: ReactNode }) {
  return (
    <svg viewBox={viewBoxFor(boxes, U, 14)} className="size-full min-h-[240px]" aria-hidden="true">
      {children}
    </svg>
  );
}

/* Independent store: one small mixed stack. */
function StoreScene() {
  const c = (x: number, y: number, z: number): Box => ({ x, y, z, w: 2.2, d: 1.5, h: 1.05 });
  const boxes = [c(0, 0, 0), c(2.3, 0, 0), c(0, 1.6, 0), c(2.3, 1.6, 0), c(1.15, 0.8, 1.05)];
  const shoe: Box = { x: 4.9, y: 2.1, z: 0, w: 1.3, d: 0.8, h: 0.5 };
  return (
    <Scene boxes={[...boxes, shoe]}>
      {[...boxes].sort(byDepth).map((b, i) => (
        <Carton key={i} b={b} label={i === 4 ? "YOUR STORE" : undefined} />
      ))}
      <g data-drop>
        <IsoBox {...shoe} u={U} {...WHITE_BOX} />
      </g>
    </Scene>
  );
}

/* Chain: volume across several styles, one stack per style. */
function ChainScene() {
  const stacks = [0, 1, 2].flatMap((s) => [0, 1].map((z) => ({ s, b: { x: s * 2.8, y: s * -0.4 + 1.2, z: z * 1.05, w: 2.3, d: 1.5, h: 1.05 } })));
  return (
    <Scene boxes={stacks.map((x) => x.b)}>
      {[...stacks]
        .sort((a, c) => byDepth(a.b, c.b))
        .map(({ s, b }, i) => (
          <Carton key={i} b={b} label={b.z > 0 ? `STYLE ${"ABC"[s]}` : undefined} />
        ))}
    </Scene>
  );
}

/* Distributor: full pallets, ready for the truck. */
function DistributorScene() {
  const pallets = [0, 1, 2].map((i) => ({ x: i * 4.0, y: 0, z: 0, w: 3.7, d: 2.6, h: 0.3 }));
  const cartons = pallets.flatMap((p) =>
    [0, 1, 2].flatMap((z) => [0, 1].flatMap((x) => [0, 1].map((y) => ({ x: p.x + 0.05 + x * 1.82, y: 0.05 + y * 1.27, z: 0.3 + z * 0.85, w: 1.8, d: 1.25, h: 0.83 })))),
  );
  const all = [...pallets.map((b) => ({ b, wood: true })), ...cartons.map((b) => ({ b, wood: false }))].sort((a, c) => byDepth(a.b, c.b));
  return (
    <Scene boxes={[...pallets, ...cartons]}>
      {all.map(({ b, wood }, i) =>
        wood ? (
          <g key={i} data-drop>
            <IsoBox {...b} u={U} {...WOOD} />
          </g>
        ) : (
          <Carton key={i} b={b} />
        ),
      )}
    </Scene>
  );
}

/* Private label: your brand on the carton and on the shoebox. */
function BrandScene() {
  const carton: Box = { x: 0, y: 0, z: 0, w: 3.6, d: 2.4, h: 2.0 };
  const shoe: Box = { x: 4.0, y: 1.6, z: 0, w: 2.2, d: 1.3, h: 0.75 };
  const lid: Box = { x: 3.95, y: 1.55, z: 0.75, w: 2.3, d: 1.4, h: 0.25 };
  return (
    <Scene boxes={[carton, shoe, lid]}>
      <g data-drop>
        <IsoBox {...carton} u={U} {...KRAFT} stroke="rgb(90 70 40 / .25)">
          <IsoQuad u={U} fill="#ffffff" c={[[0.2, 2.4, 0.4], [3.4, 2.4, 0.4], [3.4, 2.4, 1.55], [0.2, 2.4, 1.55]]} />
          <FaceText x={0.4} y={2.4} z={1.12} size={8} weight={800}>
            YOUR BRAND
          </FaceText>
          <FaceText x={0.4} y={2.4} z={0.74} size={4.8} weight={600}>
            12 PRS · MIXED SIZES
          </FaceText>
        </IsoBox>
      </g>
      <g data-drop>
        <IsoBox {...shoe} u={U} {...WHITE_BOX} />
        <IsoBox {...lid} u={U} top="#121416" right="#2a2f34" left="#1d2125">
          <IsoQuad u={U} fill="#ffffff" c={[[4.3, 2.95, 0.82], [5.7, 2.95, 0.82], [5.7, 2.95, 0.93], [4.3, 2.95, 0.93]]} />
        </IsoBox>
      </g>
    </Scene>
  );
}

type Program = {
  key: string;
  tab: string;
  icon: IconName;
  buyer: BuyerType;
  headline: string;
  first: { value: string; note: string };
  facts: [string, string][];
  perks: string[];
  cta: string;
  scene: () => ReactNode;
  tone: string;
};

const PROGRAMS: Program[] = [
  {
    key: "retail",
    tab: "Independent retailer",
    icon: "pin",
    buyer: "Retailer",
    headline: "Stock a full size run without overbuying.",
    first: { value: `${fmt(3 * MOQ_PAIRS)} pairs`, note: `Example: 3 styles × ${MOQ_CASES} cases` },
    facts: [
      ["Minimum", `${MOQ_CASES} cases (${MOQ_PAIRS} pairs) per style`],
      ["Ships as", "Mixed-size cases, DDP to your store"],
      ["Timing", `Samples ${days(LEAD.samples)}, bulk ${days(LEAD.bulk)}`],
    ],
    perks: ["Mix any styles from the line", `Reorder in steps of ${STEP_CASES} cases`, "Samples before you commit"],
    cta: "Start a retailer inquiry",
    scene: StoreScene,
    tone: "bg-frost",
  },
  {
    key: "chain",
    tab: "Chain & department store",
    icon: "grid",
    buyer: "Retailer",
    headline: "Volume across your doors, on your schedule.",
    first: { value: `${fmt(5 * 100 * PACK)} pairs`, note: "Example: 5 styles × 100 cases" },
    facts: [
      ["Pricing", `Tier pricing from ${fmt(TIER)} pairs`],
      ["Ships as", "Palletised mixed-size cases, DDP"],
      ["Timing", "Priority production slots for your delivery targets"],
    ],
    perks: ["Dedicated account manager", "Quality report with every shipment", "Mix styles across the whole line"],
    cta: "Start a chain inquiry",
    scene: ChainScene,
    tone: "bg-tile",
  },
  {
    key: "distributor",
    tab: "Distributor",
    icon: "truck",
    buyer: "Distributor",
    headline: "Buy by the pallet and supply your region.",
    first: { value: `${fmt(3 * CASES_PER_PALLET * PACK)} pairs`, note: `Example: 3 pallets × ${CASES_PER_PALLET} cases (indicative)` },
    facts: [
      ["Pricing", `Tier pricing from ${fmt(TIER)} pairs`],
      ["Terms", "DDP, FOB or EXW"],
      ["Ships as", "Full pallets of mixed-size cases"],
    ],
    perks: ["Priority production slots", "Recurring volume reorders", "Dedicated account manager"],
    cta: "Start a distributor inquiry",
    scene: DistributorScene,
    tone: "bg-stone",
  },
  {
    key: "brand",
    tab: "Private label brand",
    icon: "tag",
    buyer: "Private label brand",
    headline: "Your brand on proven Chime Long boots.",
    first: { value: `${fmt(PRIVATE_LABEL_MIN)} pairs`, note: "Minimum per style" },
    facts: [
      ["Branding", "Logo on the zip pull, insole and box"],
      ["Built on", "Existing Chime Long lasts and outsoles"],
      ["Pricing", `Tier pricing from ${fmt(TIER)} pairs`],
    ],
    perks: ["Custom boxes and labels", "Samples before bulk production", "Dedicated account manager"],
    cta: "Start a private-label brief",
    scene: BrandScene,
    tone: "bg-sand",
  },
];

const ORDER_TYPES: { icon: IconName; title: string; qty: string; text: string }[] = [
  { icon: "sample", title: "Sample order", qty: "1 pair per style", text: `Fit and finish in your hands in about ${days(LEAD.samples)}.` },
  { icon: "box", title: "First order", qty: `From ${MOQ_CASES} cases`, text: `${MOQ_PAIRS} pairs per style, in mixed-size cases of ${PACK}.` },
  { icon: "layers", title: "Reorder", qty: `Steps of ${STEP_CASES} cases`, text: "Top up the sizes and styles that sell through." },
  { icon: "percent", title: "Volume program", qty: `From ${fmt(TIER)} pairs`, text: "Tier pricing and priority production slots." },
];

/** Who we supply and how each buyer orders: tabs with an order scene, plus the four order types. */
export function BuyerTypes() {
  const [cur, setCur] = useState(0);
  const p = PROGRAMS[cur];
  const Scene = p.scene;
  const ref = useRef<HTMLElement>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (prefersReducedMotion()) return;
      gsap.from("[data-drop]", { y: -50, opacity: 0, duration: 0.55, ease: "power3.out", stagger: 0.035 });
      gsap.from("[data-swap]", { y: 14, opacity: 0, duration: 0.6, ease: "expo.out", stagger: 0.05 });
    },
    { dependencies: [cur], scope: ref },
  );

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (cur + d + PROGRAMS.length) % PROGRAMS.length;
    setCur(n);
    (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
  };

  return (
    <section ref={ref} id="programs" aria-labelledby="h-programs" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-programs"
        eyebrow="Buyer programs"
        title={
          <>
            Who we supply, <em>and how they order.</em>
          </>
        }
        sub="Pick your kind of business to see a typical first order."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,9fr)]">
        {/* buyer tabs */}
        <div role="tablist" aria-label="Business type" aria-orientation="vertical" className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {PROGRAMS.map((x, i) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              id={`bt-${x.key}`}
              aria-selected={i === cur}
              aria-controls="bt-panel"
              tabIndex={i === cur ? 0 : -1}
              onClick={() => setCur(i)}
              onKeyDown={onKey}
              className="group flex flex-none items-center gap-3 rounded-card bg-tile px-4 py-3.5 text-left transition-colors hover:bg-chip-hover aria-selected:bg-ink aria-selected:text-white lg:px-5 lg:py-5"
            >
              <span className="grid size-10 flex-none place-items-center rounded-full bg-white text-ink">
                <Icon name={x.icon} className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold whitespace-nowrap lg:whitespace-normal">{x.tab}</span>
                <span className="hidden text-[13.5px] opacity-70 lg:block">{x.headline}</span>
              </span>
            </button>
          ))}
        </div>

        {/* program panel */}
        <div id="bt-panel" role="tabpanel" aria-labelledby={`bt-${p.key}`} className="glass-strong grid overflow-hidden rounded-shell md:grid-cols-2">
          <div className={clsx("relative grid min-h-[300px] place-items-center px-[7%] pt-[7%] pb-16", p.tone)}>
            <div className="size-full max-h-[440px]">
              <Scene key={p.key} />
            </div>
            <span data-swap className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold">
              {p.tab}
            </span>
          </div>
          <div className="flex flex-col p-[clamp(20px,3vw,36px)]">
            <h3 data-swap className="text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-[-0.02em]">
              {p.headline}
            </h3>
            <div data-swap className="mt-5 rounded-ph bg-tile px-4 py-3.5">
              <p className="text-[13px] text-muted">Typical first order</p>
              <p className="text-[28px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">{p.first.value}</p>
              <p className="text-[13px] text-ink-2">{p.first.note}</p>
            </div>
            <dl data-swap className="mt-5 grid gap-2.5">
              {p.facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-[14.5px]">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <ul data-swap className="mt-5 grid gap-2 border-t border-line pt-5 text-[14.5px]">
              {p.perks.map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Icon name="check" className="size-4 flex-none text-glacier" />
                  {t}
                </li>
              ))}
            </ul>
            <div data-swap className="mt-auto pt-7">
              <OpenInquiryButton buyerType={p.buyer} className="btn btn-dark">
                {p.cta} <Icon name="arrow" className="size-4" />
              </OpenInquiryButton>
            </div>
          </div>
        </div>
      </div>

      {/* order types */}
      <h3 className="mt-14 text-[20px] font-semibold tracking-[-0.02em]">Four ways to order</h3>
      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER_TYPES.map((o, i) => (
          <li key={o.title} data-reveal className="relative rounded-card bg-tile p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-full bg-white text-glacier">
                <Icon name={o.icon} className="size-[18px]" />
              </span>
              {i < ORDER_TYPES.length - 1 && (
                <Icon name="arrow" className="hidden size-4 text-muted lg:block" />
              )}
            </div>
            <p className="mt-4 text-[17px] font-semibold">{o.title}</p>
            <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em] text-glacier tabular-nums">{o.qty}</p>
            <p className="mt-1.5 text-[14px] text-ink-2">{o.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
