"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "../Icon";
import { MOQ_PAIRS, products } from "@/lib/products";
import { useUI } from "@/lib/store";

const POINTS = ["Tier pricing", "All sizes and colors", "Reply in 24h"];

/** Email-first line-sheet request; hands the email to the inquiry drawer. */
export function LineSheetCta() {
  const openDrawer = useUI((s) => s.openDrawer);
  const [email, setEmail] = useState("");

  return (
    <section id="line-sheet" aria-labelledby="h-sheet" className="bg-linesheet mt-sec grid items-center gap-8 overflow-hidden rounded-shell p-[clamp(22px,4vw,52px)] lg:grid-cols-2">
      <div data-reveal>
        <h2 id="h-sheet" className="type-section">
          Get the FW26
          <br />
          <span className="text-studio-ink-2">line sheet</span>
        </h2>
        <form
          className="mt-6 flex h-14 max-w-[460px] items-center gap-2 rounded-full bg-surface pr-1.5 pl-5 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            if (!f.checkValidity()) return f.reportValidity();
            openDrawer(undefined, email.trim());
          }}
        >
          <label htmlFor="ls-email" className="sr-only">
            Your work email
          </label>
          <input
            id="ls-email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your work email"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted sm:text-sm"
          />
          <button type="submit" className="btn btn-dark">
            Unlock pricing
          </button>
        </form>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {POINTS.map((t) => (
            <li key={t} className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
              <span className="grid size-6 place-items-center rounded-full bg-surface text-accent">
                <Icon name="check" className="size-3.5" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* the paper line sheet */}
      <div data-reveal className="flex justify-center [perspective:1000px]">
        <div
          aria-hidden="true"
          className="relative w-full max-w-[460px] rotate-[2deg] rounded-[20px] border border-black/5 bg-white p-6 pb-16 shadow-[0_28px_60px_-10px_rgb(29_30_25/0.22)] transition-all duration-700 ease-soft hover:rotate-0 hover:scale-[1.02] hover:shadow-[0_36px_70px_-12px_rgb(29_30_25/0.28)]"
        >
          {/* Subtle archival paper texture grid watermark */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[20px] bg-[radial-gradient(#1d1e19_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-[0.03]" />

          <div className="flex items-start justify-between gap-3 border-b border-line pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-extrabold tracking-[.1em] text-ink">LINE SHEET FW26</p>
                <span className="mono-label rounded bg-chip px-1.5 py-0.5 text-[8.5px] text-muted">CONFIDENTIAL</span>
              </div>
              <p className="mt-0.5 text-[10.5px] font-mono text-muted">DOC.REF #ART-2026-FW {"//"} TRADE ONLY</p>
            </div>
            <Barcode />
          </div>
          
          <span className="absolute top-14 right-6 -rotate-12 rounded-md border-2 border-danger/80 px-2 py-0.5 text-[10px] font-extrabold tracking-[.18em] text-danger/90">
            WHOLESALE ONLY
          </span>

          <ul className="mt-2 divide-y divide-line">
            {products.map((p) => (
              <li key={p.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-3 py-2">
                <span className="relative h-9 w-11 rounded-lg bg-photo border border-line/40">
                  <Image src={p.outer.src} alt="" fill sizes="44px" className="object-contain p-1" />
                </span>
                <span className="min-w-0 leading-tight">
                  <b className="block truncate text-[12px] font-extrabold uppercase text-ink">ARTICA {p.name}</b>
                  <span className="block truncate text-[11px] text-muted">{p.type}</span>
                </span>
                <span className="text-[11.5px] font-bold tabular-nums text-ink">{MOQ_PAIRS} pr</span>
                <span className="text-[12px] font-bold text-ink-2 blur-[5px] select-none">$00.00</span>
              </li>
            ))}
          </ul>
          
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[11.5px] font-bold whitespace-nowrap text-surface shadow-float hover:scale-105 transition-transform">
              <Icon name="lock" className="size-3.5 text-accent/80" />
              Tier Pricing Unlocks on Inquiry
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Barcode() {
  const bars = [1.2, 2.4, 1, 1.8, 1, 2.6, 1.2, 1, 2, 1.2, 2.6, 1, 1.6, 1, 2.2, 1];
  let x = 0;
  return (
    <svg viewBox="0 0 48 22" className="h-6 w-14 flex-none" aria-hidden="true">
      {bars.map((w, i) => {
        const r = <rect key={i} x={x} y="0" width={w} height="22" fill="#1D1E19" />;
        x += w + 1.2;
        return r;
      })}
    </svg>
  );
}
