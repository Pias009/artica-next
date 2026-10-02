"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { AddButton } from "../product/AddButton";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap, MOTION_OK, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { byId, CASE_PACK, LEAD, LINE_LABEL, MOQ_CASES, MOQ_PAIRS, PACK } from "@/lib/products";

const LINES = [
  { key: "men", label: "Men", id: "p04" },
  { key: "women", label: "Women", id: "p01" },
  { key: "kids", label: "Kids", id: "p03" },
] as const;

const TERMS: [string, string][] = [
  [`${MOQ_PAIRS} pairs`, "Minimum per style"],
  [`${PACK} pairs`, "Mixed-size case"],
  [LEAD.samples.replace("d", " days"), "Samples"],
  [LEAD.bulk.replace("d", " days"), "Production"],
  ["DDP", "US and Canada"],
];

/** The twelve boxes of one case, in size order (e.g. 7, 8, 8, 9, 9, 10, 10, 10 …). */
const caseSizes = (line: keyof typeof CASE_PACK) => CASE_PACK[line].flatMap(([s, n]) => Array.from({ length: n }, () => s));
/** The open box: the first pair of the most-stocked size. */
const openIndex = (line: keyof typeof CASE_PACK) => {
  const top = CASE_PACK[line].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  return caseSizes(line).indexOf(top);
};

/**
 * Wholesale hero: one ARTICA case, opened on a packing table. Twelve shoeboxes, each stamped
 * with its size, show the mixed-size run a store actually receives; one box is open on the boot.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const [cur, setCur] = useState(0);
  const first = useRef(true);
  const line = LINES[cur].key;
  const p = byId[LINES[cur].id];
  const sizes = caseSizes(line);
  const open = openIndex(line);

  // Intro: the flaps unfold, the boxes are packed in, one lid comes off.
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .from("[data-line]", { yPercent: 105, duration: 1.1, stagger: 0.09 })
          .from("[data-rise]", { y: 20, opacity: 0, duration: 1, stagger: 0.07 }, 0.3)
          .from("[data-case]", { y: 40, rotation: -8, opacity: 0, duration: 1.1 }, 0.1)
          .from("[data-flap=y]", { scaleY: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 0.45)
          .from("[data-flap=x]", { scaleX: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 0.5)
          .from("[data-tile]", { y: -26, opacity: 0, scale: 1.08, duration: 0.6, ease: "power3.out", stagger: { each: 0.05, from: "center" } }, 0.7)
          .fromTo("[data-lid-open]", { x: 0, y: 0, rotation: 0 }, { x: "40%", y: "-46%", rotation: 9, duration: 0.9, ease: "power3.inOut" }, ">-0.1")
          .from("[data-note]", { opacity: 0, y: 10, duration: 0.7, stagger: 0.1 }, "<0.3");
      });
    },
    { scope: root },
  );

  // Line switch: the boxes flip and re-stamp, the open box gets the next boot.
  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (prefersReducedMotion()) return;
      gsap.fromTo("[data-stamp]", { rotationX: -90, opacity: 0 }, { rotationX: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.035 });
      gsap.fromTo("[data-lid-open]", { x: 0, y: 0, rotation: 0 }, { x: "40%", y: "-46%", rotation: 9, duration: 0.8, delay: 0.25, ease: "power3.inOut" });
      gsap.fromTo("[data-boot]", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.5, ease: "expo.out" });
    },
    { dependencies: [cur], scope: root },
  );

  return (
    <section
      ref={root}
      id="hero"
      aria-labelledby="hero-title"
      className="bleed relative isolate overflow-hidden bg-[#f3f4f2] [background-image:linear-gradient(rgb(18_20_22/.045)_1px,transparent_1px),linear-gradient(90deg,rgb(18_20_22/.045)_1px,transparent_1px)] [background-size:44px_44px]"
    >
      <div className="wrap grid items-center gap-x-12 gap-y-10 px-(--shell-pad) pt-[clamp(48px,7vw,96px)] pb-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* words */}
        <div className="max-w-[600px]">
          <h1 id="hero-title" className="type-display">
            {[
              ["Twelve pairs.", "text-ink"],
              ["Every size.", "text-glacier"],
              ["One case.", "text-ink"],
            ].map(([t, c]) => (
              <span key={t} className="block overflow-hidden pb-[0.06em]">
                <span data-line className={clsx("block", c)}>
                  {t}
                </span>
              </span>
            ))}
          </h1>
          <p data-rise className="mt-7 max-w-[44ch] text-[18px] leading-relaxed text-ink-2">
            Each ARTICA case holds a full size run, so one order stocks a whole shelf. Winter boots for men, women and kids, from {MOQ_CASES} cases per style, delivered
            DDP to the US and Canada.
          </p>
          <div data-rise className="mt-8 flex flex-wrap gap-3">
            <OpenInquiryButton className="btn btn-dark">
              Get wholesale pricing <Icon name="arrow" className="size-4" />
            </OpenInquiryButton>
            <a href="#samples" className="btn btn-line">
              <Icon name="sample" className="size-4" /> Order samples
            </a>
          </div>
          <p data-rise className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <Icon name="box" className="size-4 text-glacier" /> Factory direct
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="shield" className="size-4 text-glacier" /> Trade buyers only
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" className="size-4 text-glacier" /> Tier pricing within 24 hours
            </span>
          </p>
        </div>

        {/* the open case */}
        <div className="relative px-[9%] py-[11%] sm:px-[10%]">
          <div data-case className="relative @container">
            <div className="relative -rotate-[2.5deg]">
              <p className="sr-only">
                One case of ARTICA {p.name}: {PACK} pairs in sizes {sizes.join(", ")}.
              </p>

              {/* flaps, folded out around the opening */}
              <span aria-hidden="true" data-flap="y" className="absolute right-0 bottom-full left-0 h-[17%] origin-bottom bg-[linear-gradient(0deg,#cfb28b,#dcc4a1)] [clip-path:polygon(6%_0,94%_0,100%_100%,0_100%)]" />
              <span aria-hidden="true" data-flap="y" className="absolute top-full right-0 left-0 h-[17%] origin-top bg-[linear-gradient(180deg,#c4a57d,#d8bf9a)] [clip-path:polygon(0_0,100%_0,94%_100%,6%_100%)]" />
              <span aria-hidden="true" data-flap="x" className="absolute top-0 right-full bottom-0 w-[12%] origin-right bg-[linear-gradient(270deg,#c8aa82,#d9c19c)] [clip-path:polygon(0_8%,100%_0,100%_100%,0_92%)]" />
              <span aria-hidden="true" data-flap="x" className="absolute top-0 bottom-0 left-full w-[12%] origin-left bg-[linear-gradient(90deg,#c8aa82,#d9c19c)] [clip-path:polygon(0_0,100%_8%,100%_92%,0_100%)]" />

              {/* carton walls + floor */}
              <div className="relative rounded-[6px] bg-[#b8966c] p-[2.6cqw] shadow-[0_40px_60px_-30px_rgb(18_20_22/.45)]">
                <div className="grid grid-cols-4 gap-[1.4cqw] rounded-[3px] bg-[#9c7b54] p-[1.6cqw] shadow-[inset_0_6px_14px_rgb(60_40_20/.45)]">
                  {sizes.map((s, i) =>
                    i === open ? (
                      <div key={`open-${line}`} data-tile className="relative aspect-[1.25/1]">
                        {/* the open box: tissue and the boot lying on its side */}
                        <QuickViewButton
                          id={p.id}
                          aria-label={`View details: ARTICA ${p.name}`}
                          className="absolute inset-0 cursor-zoom-in overflow-hidden rounded-[4px] bg-[radial-gradient(ellipse_at_40%_40%,#ffffff_0%,#e6ecee_70%)] shadow-[inset_0_0_0_0.6cqw_#ffffff,inset_0_4px_10px_rgb(18_20_22/.18)]"
                        >
                          <span data-boot className="absolute inset-[5%_3%]">
                            <Image src={p.outer.src} alt={p.desc} fill loading="eager" fetchPriority="high" sizes="200px" className="object-contain drop-shadow-boot" />
                          </span>
                        </QuickViewButton>
                        {/* the lid, set aside on the next box (GSAP owns its transform; it rests open by default) */}
                        <span
                          aria-hidden="true"
                          data-lid-open
                          className="pointer-events-none absolute inset-0 z-[3] rounded-[4px] bg-white shadow-[0_18px_28px_-10px_rgb(18_20_22/.45),inset_0_0_0_0.6cqw_#f1f3f4]"
                          style={{ transform: "translate(40%, -46%) rotate(9deg)" }}
                        >
                          <span className="absolute top-[12%] left-[10%] text-[1.5cqw] font-bold tracking-[0.12em]">ARTICA</span>
                          <span className="absolute bottom-[12%] left-[10%] text-[3.4cqw] leading-none font-semibold tabular-nums">
                            <span className="mr-[0.6cqw] text-[1.5cqw] font-medium text-muted">US</span>
                            {s}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div key={i} data-tile aria-hidden="true" className="group/box relative aspect-[1.25/1] [perspective:400px]">
                        <span data-stamp className="absolute inset-0">
                          <span className="absolute inset-0 rounded-[4px] bg-white shadow-[0_2px_0_rgb(18_20_22/.06),0_8px_14px_-8px_rgb(18_20_22/.35),inset_0_0_0_0.6cqw_#f1f3f4] transition-transform duration-300 ease-soft group-hover/box:-translate-y-[0.8cqw] group-hover/box:-rotate-2">
                            <span className="absolute top-[12%] left-[10%] text-[1.5cqw] font-bold tracking-[0.12em]">ARTICA</span>
                            <span className="absolute top-[12%] right-[10%] text-[1.3cqw] text-muted tabular-nums">{String(i + 1).padStart(2, "0")}/12</span>
                            <span className="absolute bottom-[12%] left-[10%] text-[4.2cqw] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                              <span className="mr-[0.6cqw] text-[1.5cqw] font-medium tracking-normal text-muted">US</span>
                              {s}
                            </span>
                            <span className="absolute right-[10%] bottom-[14%] flex h-[2.6cqw] items-stretch gap-[0.25cqw]">
                              {[1, 2, 1, 3, 1, 1, 2, 1].map((w, k) => (
                                <span key={k} className="bg-ink/80" style={{ width: `${w * 0.16}cqw` }} />
                              ))}
                            </span>
                          </span>
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* annotations around the case */}
          <span data-note className="absolute top-[4%] left-0 hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold shadow-soft sm:flex">
            <span className="size-1.5 rounded-full bg-glacier" /> Mixed sizes · {p.sizes}
          </span>
          <span data-note className="absolute top-0 right-[2%] hidden items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-white sm:flex">
            1 case = {PACK} pairs
          </span>
          <span data-note className="absolute right-0 bottom-[3%] hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold shadow-soft sm:flex">
            <Icon name="box" className="size-4 text-glacier" /> Shelf-ready boxes
          </span>
        </div>
      </div>

      {/* switcher + order slip */}
      <div className="wrap flex flex-wrap items-center justify-between gap-4 px-(--shell-pad)">
        <div data-rise className="flex flex-wrap items-center gap-3">
          <span className="text-[14px] font-medium text-ink-2">Open a case:</span>
          <div role="group" aria-label="Show a line" className="flex rounded-full bg-white p-1 shadow-soft">
            {LINES.map((l, i) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={i === cur}
                onClick={() => setCur(i)}
                className="h-10 rounded-full px-5 text-[14px] font-semibold text-ink-2 transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-white"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div data-rise className="flex items-center gap-3 rounded-full bg-white py-1.5 pr-1.5 pl-5 shadow-soft">
          <p className="text-[14px] leading-tight">
            <b className="block font-semibold">
              ARTICA {p.name} <span className="font-normal text-muted">· {LINE_LABEL[p.line]}</span>
            </b>
            <span className="text-muted tabular-nums">
              Min. {MOQ_CASES} cases · {MOQ_PAIRS} pairs
            </span>
          </p>
          <AddButton id={p.id} className="relative size-11 bg-ink! text-white!" />
        </div>
      </div>

      {/* wholesale terms, like the head of a packing slip */}
      <div className="wrap px-(--shell-pad) pt-8 pb-10">
        <dl className="grid grid-cols-2 overflow-hidden rounded-card bg-white shadow-soft sm:grid-cols-3 lg:grid-cols-5">
          {TERMS.map(([v, k], i) => (
            <div key={k} className={clsx("px-5 py-4", i > 0 && "lg:border-l lg:border-line", i === TERMS.length - 1 && "max-sm:col-span-2")}>
              <dd className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{v}</dd>
              <dt className="text-[13px] text-muted">{k}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
