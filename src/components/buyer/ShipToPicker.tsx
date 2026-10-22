"use client";

import { useId, useState } from "react";
import { Icon } from "../Icon";
import { EXPORT_DOCS, MARKET_COUNTRIES, marketOf } from "@/lib/buyer-desk";
import { useUI } from "@/lib/store";

/** Pick a country: the port, transit time, trade terms and what the import usually needs. */
export function ShipToPicker() {
  const uid = useId();
  const [country, setCountry] = useState("United States");
  const openDrawer = useUI((s) => s.openDrawer);
  const m = marketOf(country)!;

  return (
    <div data-deco="card" className="grid gap-8 rounded-shell bg-tile p-[clamp(20px,4vw,48px)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
      <div>
        <label htmlFor={`${uid}-country`} className="text-[15px] font-semibold">
          Where does the order ship?
        </label>
        <select id={`${uid}-country`} value={country} onChange={(e) => setCountry(e.target.value)} className="field mt-3 max-w-[320px]">
          {MARKET_COUNTRIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <dl aria-live="polite" className="mt-8 grid gap-2">
          {[
            ["Arrives at", m.port],
            ["Ocean transit", m.transit],
          ].map(([k, v]) => (
            <div key={k} className="rounded-ph bg-white px-4 py-3">
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[16px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[14px] font-semibold">Trade terms</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {m.terms.map((t) => (
            <li key={t} className="rounded-full bg-white px-3.5 py-1.5 text-[14px] font-semibold">
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div>
        {/* only the heading is announced when the country changes; the details below are there to read */}
        <h3 aria-live="polite" className="font-headline text-[clamp(22px,2.4vw,30px)] leading-tight font-semibold tracking-[-0.02em]">
          Shipping to {country}
        </h3>
        <p className="mt-6 text-[14px] font-semibold">What your import usually needs</p>
        <ul className="mt-3 grid gap-2.5 text-[15px] text-ink-2">
          {m.rules.map((r) => (
            <li key={r} className="flex gap-2.5">
              <Icon name="check" className="mt-1 size-4 flex-none text-brand" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[14px] font-semibold">Papers with every shipment</p>
        <p className="mt-2 text-[15px] text-ink-2">{EXPORT_DOCS.join(" · ")}</p>
        <button
          type="button"
          onClick={() => openDrawer(undefined, undefined, `Shipping to ${country}: please quote ${m.terms[0]}.`)}
          className="btn btn-dark mt-8"
        >
          Get a {m.terms[0]} quote to {country} <Icon name="arrow" />
        </button>
        <p className="mt-3 max-w-[52ch] text-[13px] text-muted">General guidance, not legal advice. Your customs broker confirms the rules for your shipment.</p>
      </div>
    </div>
  );
}
