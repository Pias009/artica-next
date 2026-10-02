"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { iso, IsoBox, IsoQuad, KRAFT } from "../ui/Iso";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { byId, CASE_PACK, inLine, LINE_LABEL, MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN, type ProductLine } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

/* ---------- one labelled carton, with the boot standing on it ---------- */
const U = 40;
const BOX = { x: 0, y: 0, z: 0, w: 3.2, d: 2.0, h: 1.45 };
const ROOM_H = 3.9; // headroom for the boot above the carton
const pts = [0, BOX.w].flatMap((dx) => [0, BOX.d].flatMap((dy) => [0, BOX.h + ROOM_H].map((dz) => iso(dx, dy, dz, U))));
const PAD = 10;
const VB = {
  x: Math.min(...pts.map((p) => p[0])) - PAD,
  y: Math.min(...pts.map((p) => p[1])) - PAD,
  w: Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])) + PAD * 2,
  h: Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])) + PAD * 2,
};
const pct = (x: number, y: number, z: number) => {
  const [px, py] = iso(x, y, z, U);
  return { left: ((px - VB.x) / VB.w) * 100, top: ((py - VB.y) / VB.h) * 100 };
};
const TOP = pct(BOX.w / 2, BOX.d / 2, BOX.h);
const FACE = { x0: 0.35, x1: 2.25, z0: 0.3, z1: 1.12 };
const FACE_TL = pct(FACE.x0, BOX.d + 0.002, FACE.z1);
const FACE_W = (((FACE.x1 - FACE.x0) * Math.cos(Math.PI / 6) * U) / VB.w) * 100;
const FACE_H = (((FACE.z1 - FACE.z0) * U) / VB.h) * 100;

function CartonPerch({ bootId, lines }: { bootId: string; lines: string[] }) {
  const b = byId[bootId];
  return (
    <div className="relative mx-auto w-[86%] @container" style={{ aspectRatio: `${VB.w} / ${VB.h}` }} aria-hidden="true">
      <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="absolute inset-0 size-full overflow-visible">
        <ellipse cx={iso(1.6, 1.0, 0, U)[0]} cy={iso(1.6, 1.0, 0, U)[1] + 10} rx={100} ry={22} fill="rgb(18 20 22 / .14)" filter="blur(8px)" />
        <IsoBox {...BOX} u={U} {...KRAFT} stroke="rgb(90 70 40 / .25)">
          <IsoQuad u={U} fill="#b9966d" c={[[BOX.w / 2 - 0.2, 0, BOX.h + 0.002], [BOX.w / 2 + 0.2, 0, BOX.h + 0.002], [BOX.w / 2 + 0.2, BOX.d, BOX.h + 0.002], [BOX.w / 2 - 0.2, BOX.d, BOX.h + 0.002]]} />
        </IsoBox>
      </svg>
      {/* printed label on the carton face */}
      <div
        className="absolute origin-top-left skew-y-[30deg] rounded-[2px] bg-white px-[2.2cqw] py-[1.8cqw] leading-none text-ink"
        style={{ left: `${FACE_TL.left}%`, top: `${FACE_TL.top}%`, width: `${FACE_W}%`, height: `${FACE_H}%` }}
      >
        <p className="text-[4.4cqw] font-bold tracking-[0.08em]">ARTICA</p>
        {lines.map((t) => (
          <p key={t} className="mt-[1.1cqw] text-[3cqw] font-semibold uppercase">
            {t}
          </p>
        ))}
      </div>
      {/* boot on the carton */}
      <div className="absolute" style={{ left: `${TOP.left}%`, top: `${TOP.top}%` }}>
        <span className="absolute bottom-[-3cqw] left-0 block h-[64cqw] w-[74cqw] -translate-x-1/2">
          <span className="block size-full transition-transform duration-700 ease-soft group-hover:-translate-y-2 group-hover:-rotate-2">
            <Image src={b.outer.src} alt="" fill sizes="(max-width: 1184px) 40vw, 300px" className="-rotate-3 object-contain object-bottom drop-shadow-tile" />
          </span>
        </span>
      </div>
    </div>
  );
}

const LINES: { line: ProductLine; bootId: string; tone: string }[] = [
  { line: "men", bootId: "p04", tone: "bg-frost" },
  { line: "women", bootId: "p02", tone: "bg-tile" },
  { line: "kids", bootId: "p03", tone: "bg-blush" },
];

/** Wholesale line cards: what a case of each line holds, its minimum, and one-click "add the whole line". */
export function ShopByLine() {
  return (
    <section id="lines" aria-labelledby="h-lines" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-lines"
        title="The FW26 range, by line"
        sub="Each line ships in its own mixed-size case. Take a whole line, or pick single styles."
        right={
          <Link href="/catalog">
            <ArrowLink>All styles</ArrowLink>
          </Link>
        }
      />
      <ul className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {LINES.map((l) => (
          <LineCard key={l.line} {...l} />
        ))}
        <PrivateLabelCard />
      </ul>
    </section>
  );
}

function LineCard({ line, bootId, tone }: { line: ProductLine; bootId: string; tone: string }) {
  const styles = inLine(line);
  const pack = CASE_PACK[line];
  const max = Math.max(...pack.map(([, n]) => n));
  const sizes = byId[bootId].sizes;
  const setRailFilter = useUI((s) => s.setRailFilter);
  const showToast = useUI((s) => s.showToast);
  const cart = useInquiry((s) => s.lines);
  const setCases = useInquiry((s) => s.setCases);
  const allIn = styles.every((p) => cart.some((c) => c.id === p.id));

  const viewStyles = () => {
    setRailFilter(line);
    document.getElementById("styles")?.scrollIntoView({ block: "start" });
  };
  const addLine = () => {
    styles.forEach((p) => {
      if (!cart.some((c) => c.id === p.id)) setCases(p.id, MOQ_CASES);
    });
    showToast(`${LINE_LABEL[line]} line added: ${styles.length} style${styles.length > 1 ? "s" : ""} · ${(styles.length * MOQ_PAIRS).toLocaleString("en-US")} pairs`);
  };

  return (
    <li data-reveal className="group flex flex-col">
      <button
        type="button"
        onClick={viewStyles}
        aria-label={`View ${LINE_LABEL[line].toLowerCase()} styles`}
        className={clsx("relative flex aspect-[4/5] items-end overflow-hidden rounded-card pb-[8%]", tone)}
      >
        <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold tabular-nums">
          {styles.length} style{styles.length > 1 ? "s" : ""}
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold tabular-nums">
          {PACK} pairs / case
        </span>
        <CartonPerch bootId={bootId} lines={[`${LINE_LABEL[line]} · ${PACK} PRS`, sizes]} />
      </button>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{LINE_LABEL[line]}</h3>
        <span className="text-[14px] text-muted">{sizes}</span>
      </div>

      {/* what one case holds */}
      <figure className="mt-3">
        <figcaption className="text-[13px] text-muted">Pairs per size in one case</figcaption>
        <ul className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${pack.length}, minmax(0, 1fr))` }}>
          {pack.map(([s, n]) => (
            <li key={s} className="flex flex-col items-center gap-1">
              <span className="flex h-7 w-full items-end rounded-[3px] bg-tile" aria-hidden="true">
                <span className="block w-full rounded-[3px] bg-glacier" style={{ height: `${(n / max) * 100}%` }} />
              </span>
              <span className="text-[11.5px] leading-none text-muted tabular-nums">{s}</span>
              <span className="text-[12.5px] leading-none font-semibold tabular-nums">
                <span className="sr-only">size {s}: </span>
                {n}
              </span>
            </li>
          ))}
        </ul>
      </figure>

      <p className="mt-4 border-t border-line pt-3 text-[14px]">
        <b className="font-semibold">From {MOQ_CASES} cases</b>
        <span className="text-muted"> · {MOQ_PAIRS} pairs per style</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={addLine}
          aria-pressed={allIn}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover aria-pressed:bg-white aria-pressed:text-ink aria-pressed:ring-1 aria-pressed:ring-ink/20"
        >
          <Icon name={allIn ? "check" : "plus"} className="size-4" />
          {allIn ? "Line in your list" : "Add whole line"}
        </button>
        <button type="button" onClick={viewStyles} className="inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold underline decoration-ink/25 underline-offset-[6px] hover:decoration-ink">
          View styles <Icon name="arrow" className="size-4" />
        </button>
      </div>
    </li>
  );
}

function PrivateLabelCard() {
  return (
    <li data-reveal className="group flex flex-col">
      <Link href="/private-label" aria-label="Private label" className="relative flex aspect-[4/5] items-end overflow-hidden rounded-card bg-sand pb-[8%]">
        <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold tabular-nums">From {PRIVATE_LABEL_MIN} pairs</span>
        <CartonPerch bootId="p05" lines={["YOUR BRAND", `${PACK} PRS`]} />
        <span className="absolute top-[30%] right-[12%] -rotate-6 rounded-md bg-white px-2.5 py-1.5 text-[11px] font-bold tracking-[0.14em] shadow-soft">YOUR LOGO</span>
      </Link>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[20px] font-semibold tracking-[-0.02em]">Private label</h3>
        <span className="text-[14px] text-muted">Any line</span>
      </div>
      <ul className="mt-3 grid gap-1.5 text-[14px] text-ink-2">
        {["Your logo on pull, insole and box", "Proven lasts and outsoles", "Tier pricing from 1,000 pairs"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <Icon name="check" className="size-4 flex-none text-glacier" />
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-[14px]">
        <b className="font-semibold">From {PRIVATE_LABEL_MIN / PACK} cases</b>
        <span className="text-muted"> · {PRIVATE_LABEL_MIN} pairs per style</span>
      </p>
      <div className="mt-4">
        <OpenInquiryButton
          buyerType="Private label brand"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Start a brief <Icon name="arrow" className="size-4" />
        </OpenInquiryButton>
      </div>
    </li>
  );
}
