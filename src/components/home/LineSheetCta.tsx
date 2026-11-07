"use client";

import { SectionText } from "../ui/SectionText";
import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import {
  collapse,
  LINE_LABEL,
  MOQ_PAIRS,
  PACK,
  products,
} from "@/lib/products";
import { useUI } from "@/lib/store";

const POINTS = [
  "Every style and size run",
  "Case-pack ratios",
  "Tier pricing within 24 hours",
];
const PER_PAGE = 8;

/** Closing: email-first line-sheet request beside a fanned stack of the sheet itself; hands the email to the inquiry drawer. */
export function LineSheetCta() {
  // worked out here, not on import: the catalogue includes the admin panel's edits only once they've been applied
  const STYLES = collapse(products); // one lead shoe per category
  /** A taste of the sheet: one style from each line, then the next best. */
  const ROWS = collapse([
    ...(["men", "women", "kids"] as const)
      .map((l) => STYLES.find((p) => p.line === l)!)
      .filter(Boolean),
    ...STYLES,
  ]).slice(0, 5);
  const PAGES = Math.max(1, Math.ceil(products.length / PER_PAGE));
  const openDrawer = useUI((s) => s.openDrawer);
  const [email, setEmail] = useState("");
  const ref = useRef<HTMLElement>(null);

  // Copy rises in, then the pages deal out of a neat stack.
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: ref.current, start: "top 80%", end: "bottom top", toggleActions: "play reverse play reverse" },
        });
        tl.timeScale(0.72); // a touch slower, so the pages are seen landing
        tl.from("[data-sheet-copy] > *", {
          y: 24,
          opacity: 0,
          ease: "expo.out",
          duration: 0.9,
          stagger: 0.08,
        })
          .from(
            "[data-page]",
            { y: 40, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1 },
            0.15,
          )
          .from(
            "[data-row]",
            {
              x: -12,
              opacity: 0,
              duration: 0.5,
              ease: "power3.out",
              stagger: 0.06,
            },
            0.6,
          )
          .from(
            "[data-stamp]",
            {
              scale: 1.6,
              opacity: 0,
              rotation: -24,
              duration: 0.5,
              ease: "back.out(2)",
            },
            ">-0.1",
          );
      });
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id="line-sheet"
      aria-labelledby="h-sheet"
      className="glass mt-sec overflow-hidden rounded-shell [--glass-bg:rgb(226_236_241/.6)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-16 gap-y-12 px-[clamp(20px,4vw,64px)] py-[clamp(48px,7vw,104px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div data-sheet-copy>
          <SectionText as="h2" part="title" id="h-sheet" className="type-section mt-3 max-w-[16ch]">
            Get the full <em>wholesale line sheet.</em>
          </SectionText>
          <SectionText part="sub" className="mt-4 max-w-[46ch] text-[18px] text-ink-2">
            Every style, size run and case-pack ratio, with tier pricing for your volume.
          </SectionText>
          <form
            className="mt-9 flex max-w-[520px] items-center gap-2 rounded-full bg-white p-1.5 pl-6 text-left shadow-soft focus-within:ring-2 focus-within:ring-ink"
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              if (!f.checkValidity()) return f.reportValidity();
              openDrawer(undefined, email.trim());
            }}
          >
            <label htmlFor="ls-email" className="sr-only">
              Work email
            </label>
            <Icon
              name="mail"
              className="size-4 flex-none text-muted max-sm:hidden"
            />
            <input
              id="ls-email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
            <button type="submit" className="btn btn-dark group/s">
              Send it to me
              <Icon
                name="arrow"
                className="size-4 transition-transform duration-300 ease-soft group-hover/s:translate-x-0.5 max-sm:hidden"
              />
            </button>
          </form>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {POINTS.map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 text-[15px] font-medium text-ink-2"
              >
                <Icon name="check" className="size-4 text-glacier" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[13px] text-muted">
            Trade buyers only. No retail orders.
          </p>
        </div>

        {/* the sheet itself, fanned on the desk */}
        <div
          aria-hidden="true"
          className="group/stack relative mx-auto w-full max-w-[560px] [perspective:1200px]"
        >
          {/* GSAP moves the [data-page] wrappers; the tilt lives on the inner sheets so the two never fight over transforms */}
          <div data-page className="absolute inset-0">
            <div className="size-full origin-bottom-left rotate-[-7deg] rounded-[10px] bg-white/70 shadow-float transition-[rotate,translate] duration-700 ease-soft group-hover/stack:-translate-x-4 group-hover/stack:rotate-[-10deg]" />
          </div>
          <div data-page className="absolute inset-0">
            <div className="relative size-full origin-bottom-right rotate-[4deg] rounded-[10px] bg-white/85 shadow-float transition-[rotate,translate] duration-700 ease-soft group-hover/stack:translate-x-3 group-hover/stack:rotate-[7deg]">
              <span className="absolute right-6 bottom-4 text-[13px] font-semibold text-muted tabular-nums">
                02 / {String(PAGES).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div data-page className="relative">
            <div className="relative rounded-[10px] bg-white p-[clamp(16px,3vw,28px)] shadow-[0_40px_60px_-30px_rgb(18_20_22/.35)] transition-[translate] duration-700 ease-soft group-hover/stack:-translate-y-2">
              <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                <div>
                  <p className="text-[13px] font-bold">
                    CHIME LONG
                  </p>
                  <p className="mt-1 text-[20px] leading-none font-semibold tracking-[-0.02em]">
                    Wholesale Line sheet
                  </p>
                </div>
                <p className="text-right text-[13px] leading-snug text-muted tabular-nums">
                  Wholesale · USD
                  <br />
                  01 / {String(PAGES).padStart(2, "0")}
                </p>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 pt-3 pb-1 text-[13px] font-semibold text-muted">
                <span>Style</span>
                <span className="w-16 text-right max-sm:hidden">Sizes</span>
                <span className="w-14 text-right">Case</span>
              </div>
              <ul className="divide-y divide-line">
                {ROWS.map((p) => (
                  <li
                    key={p.id}
                    data-row
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="relative size-11 flex-none rounded-ph bg-tile">
                        <Image
                          src={p.outer.src}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] leading-tight font-semibold">
                          {p.name}
                        </span>
                        <span className="block truncate text-[13px] text-muted">
                          {LINE_LABEL[p.line]} · {p.type}
                        </span>
                      </span>
                    </span>
                    <span className="w-16 text-right text-[13px] whitespace-nowrap text-ink-2 tabular-nums max-sm:hidden">
                      {p.sizes.replace(/^US\s*/, "")}
                    </span>
                    <span className="w-14 text-right text-[13px] font-semibold tabular-nums">
                      {PACK} prs
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-ph bg-tile px-3 py-2.5 text-[13px]">
                <span className="text-ink-2">
                  + {products.length - ROWS.length} more styles · MOQ {MOQ_PAIRS}{" "}
                  pairs
                </span>
              </div>

              {/* "for trade" stamp, on the corner of the sheet */}
              <span
                data-stamp
                className="absolute -right-3 -bottom-8 sm:-right-7"
              >
                <span className="grid size-[92px] rotate-[-14deg] place-items-center rounded-full border-2 border-dashed border-brand/60 bg-brand-soft text-center text-[13px] leading-tight font-bold text-brand-deep shadow-soft">
                  <span>
                    TRADE
                    <br />
                    PRICING
                    <br />
                    <span className="font-semibold tracking-normal">
                      within 24h
                    </span>
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
