import { Fragment } from "react";

const ITEMS = [
  "300 Pairs MOQ",
  "12 Pairs / Case Pack",
  "Samples Dispatched in 10 Days",
  "DDP to US & Canada",
  "Private Label & OEM Lasts",
  "100% Pre-Shipment Inspection",
  "FW26 Trade Line Sheet Available",
];

/** Full-width olive band with an infinite marquee (static for reduced motion). */
export function Ticker() {
  const row = (hidden?: boolean) => (
    <ul aria-hidden={hidden} className="flex flex-none items-center">
      {ITEMS.map((t) => (
        <Fragment key={t}>
          <li className="px-6 text-[12.5px] font-extrabold tracking-[.14em] whitespace-nowrap uppercase">{t}</li>
          <li aria-hidden="true" className="size-1.5 flex-none rounded-full bg-kraft/90 shadow-xs" />
        </Fragment>
      ))}
    </ul>
  );
  return (
    <section aria-label="Wholesale terms" className="bleed mt-sec overflow-hidden border-y border-ink/10 bg-accent py-4 text-on-accent shadow-xs">
      <div className="motion-pause flex w-max animate-marquee hover:[animation-play-state:paused]">
        {row()}
        {row(true)}
      </div>
    </section>
  );
}
