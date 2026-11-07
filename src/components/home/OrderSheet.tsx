"use client";

import { Txt } from "../ui/Txt";
import clsx from "clsx";
import Image from "next/image";
import { useRef } from "react";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { SectionHead } from "../ui/SectionHead";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { byId, CASE_PACK, LEAD, LINE_LABEL, PACK } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

const EXAMPLE = [
  { id: "p04", cases: 25 },
  { id: "p01", cases: 30 },
  { id: "p03", cases: 25 },
];

const fmt = (n: number) => n.toLocaleString("en-US");

/** A wholesale order sheet on paper, filled from the buyer's own inquiry list. */
export function OrderSheet() {
  const lines = useInquiry((s) => s.lines);
  const openDrawer = useUI((s) => s.openDrawer);
  const example = lines.length === 0;
  const rows = example ? EXAMPLE : lines;
  const totalCases = rows.reduce((a, l) => a + l.cases, 0);
  const ref = useRef<HTMLElement>(null);

  // The sheet slides onto the desk, rows write themselves in, the stamp lands.
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: "[data-paper]", start: "top 85%", end: "bottom top", toggleActions: "play reverse play reverse" } })
          .from("[data-paper]", { y: 60, rotation: 3, opacity: 0, duration: 1, ease: "expo.out" })
          .from("[data-row]", { x: -16, opacity: 0, duration: 0.5, ease: "power2.out", stagger: 0.12 }, 0.35)
          .from("[data-cell]", { opacity: 0, y: 6, duration: 0.25, stagger: 0.012 }, 0.5)
          .from("[data-total]", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.6, ease: "power2.out" }, ">-0.1")
          .from("[data-stamp]", { scale: 1.6, opacity: 0, rotation: -24, duration: 0.5, ease: "expo.out" }, ">-0.1")
          .timeScale(0.72);
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="order-sheet" aria-labelledby="h-sheet-live" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-sheet-live"
        eyebrow="Order sheet"
        title={
          <>
            Your order sheet, <em>built as you browse.</em>
          </>
        }
        sub="Every style you add becomes a line with its size breakdown. Tier pricing back within 24 hours."
        right={
          <div className="flex flex-wrap gap-3">
            <a href="#styles" className="btn btn-line">
              <Txt k="add" label="Button 1">Add styles</Txt>
            </a>
            <button type="button" onClick={() => openDrawer()} className="btn btn-dark">
              <Txt k="price" label="Button 2">Get pricing for this sheet</Txt> <Icon name="arrow" className="size-4" />
            </button>
          </div>
        }
      />

      <div className="glass rounded-shell px-[clamp(12px,4vw,64px)] py-[clamp(28px,5vw,72px)]">
        <p className="mb-5 flex items-center justify-center gap-2 text-[14px] text-ink-2">
          <span className={clsx("size-2 rounded-full", example ? "bg-muted" : "bg-glacier")} />
          {example ? "Example sheet. Add styles with + to build your own." : `Built from your inquiry list · ${rows.length} style${rows.length > 1 ? "s" : ""}`}
        </p>

        <article
          data-paper
          aria-label="Order sheet"
          className="relative mx-auto max-w-[1000px] -rotate-[0.6deg] rounded-[10px] bg-white p-[clamp(18px,3.4vw,44px)] shadow-[0_30px_60px_-24px_rgb(18_20_22/.3),0_2px_6px_rgb(18_20_22/.05)]"
        >
          {/* letterhead */}
          <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink pb-5">
            <div>
              <Logo />
              <p className="mt-2 text-[13px] font-semibold text-brand">Guangzhou Chime Long Trading Co., Ltd</p>
              <Txt as="p" k="sheet" label="Sheet title" className="mt-4 text-[clamp(26px,3vw,36px)] leading-none font-semibold tracking-[-0.03em]">Order sheet</Txt>
              <Txt as="p" k="sheet-sub" label="Under the sheet title" className="mt-1 text-[14px] text-muted">Wholesale · Trade buyers only</Txt>
            </div>
            <dl className="grid grid-cols-[auto_minmax(140px,1fr)] gap-x-4 gap-y-1.5 text-[13px]">
              {[
                ["Buyer", "Your company"],
                ["Ship to", "Worldwide: your port or door"],
                ["Terms", "DDP · FOB · EXW"],
                ["Case pack", `${PACK} pairs, mixed sizes`],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <Txt as="dt" k={`field-${k.toLowerCase().replace(/\W+/g, "-")}`} label={`Field name: ${k}`} className="text-muted">{k}</Txt>
                  <Txt as="dd" k={`value-${k.toLowerCase().replace(/\W+/g, "-")}`} label={`${k}: value`} className="border-b border-dashed border-ink/20 pb-0.5 font-medium">{v}</Txt>
                </div>
              ))}
            </dl>
          </header>

          {/* column heads */}
          <div className="mt-6 hidden grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_72px_80px] gap-4 border-b border-line pb-2 text-[12px] font-semibold tracking-[0.04em] text-muted uppercase md:grid">
            <span>Style</span>
            <span>Pairs per size</span>
            <span className="text-right">Cases</span>
            <span className="text-right">Pairs</span>
          </div>

          <ol>
            {rows.map((l) => {
              const p = byId[l.id];
              const pack = CASE_PACK[p.line];
              return (
                <li
                  key={l.id}
                  data-row
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-b border-line py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_72px_80px] md:items-center"
                >
                  <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 md:col-auto md:row-auto">
                    <span className="relative h-11 w-14 flex-none rounded-lg bg-tile">
                      <Image src={p.outer.src} alt="" fill sizes="56px" className="object-contain p-1" />
                    </span>
                    <span className="min-w-0 leading-tight">
                      <b className="block truncate text-[15px] font-semibold">Chime Long {p.name}</b>
                      <span className="block truncate text-[12.5px] text-muted">
                        {p.color.name} · {LINE_LABEL[p.line]} · {p.sizes}
                      </span>
                    </span>
                  </div>

                  <table className="col-span-2 w-full max-w-[420px] border-collapse text-center text-[12.5px] tabular-nums md:col-span-1">
                    <caption className="sr-only">Pairs per size for Chime Long {p.name}</caption>
                    <thead>
                      <tr>
                        {pack.map(([size]) => (
                          <th key={size} scope="col" className="border border-line bg-tile px-1 py-1 font-medium text-muted">
                            {size}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {pack.map(([size, n]) => (
                          <td key={size} data-cell className="border border-line px-1 py-1.5 font-semibold">
                            {n * l.cases}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>

                  <p className="col-start-2 row-start-1 self-center text-right text-[15px] tabular-nums md:col-auto md:row-auto">
                    <span className="text-muted md:hidden">Cases </span>
                    <b className="font-semibold">{l.cases}</b>
                  </p>
                  <p className="hidden text-right text-[15px] font-semibold tabular-nums md:block">{fmt(l.cases * PACK)}</p>
                </li>
              );
            })}
          </ol>

          {/* totals */}
          <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="grid gap-1.5 text-[13px] text-ink-2">
              <p>
                <b className="font-semibold text-ink">Prices:</b> <Txt k="prices" label="Prices note">tier pricing quoted on request, within 24 hours.</Txt>
              </p>
              <p>
                <b className="font-semibold text-ink">Lead time:</b> samples {LEAD.samples.replace("d", " days")}, production {LEAD.bulk.replace("d", " days")}, delivery{" "}
                {LEAD.delivery.replace("d", " days")}.
              </p>
              <p className="mt-6 flex items-end gap-3">
                <Txt k="signature" label="Signature line" className="text-muted">Buyer signature</Txt>
                <span className="inline-block w-48 border-b border-ink/40" />
              </p>
            </div>
            <div className="min-w-[240px] text-right">
              <p className="text-[13px] text-muted">
                {rows.length} style{rows.length > 1 ? "s" : ""} · {totalCases} cases
              </p>
              <p className="mt-1 text-[40px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                {fmt(totalCases * PACK)} <span className="text-[18px] tracking-normal text-ink-2">pairs</span>
              </p>
              <span data-total className="mt-2 block h-0.5 w-full bg-ink" />
              <span className="mt-1 block h-0.5 w-full bg-ink" />
            </div>
          </div>

          <span
            data-stamp
            aria-hidden="true"
            className={clsx(
              "pointer-events-none absolute top-[clamp(40px,6vw,64px)] left-[40%] hidden -rotate-12 lg:block rounded-md border-[3px] px-3 py-1 text-[15px] font-bold tracking-[0.18em]",
              example ? "border-ink/30 text-ink/35" : "border-glacier/80 text-glacier",
            )}
          >
            {example ? "EXAMPLE" : "READY TO SEND"}
          </span>
        </article>
      </div>
    </section>
  );
}
