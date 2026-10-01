"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { CropImage } from "../ui/CropImage";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { byId, cropsFor, MOQ_PAIRS, PACK } from "@/lib/products";
import { useInCart, useInquiry } from "@/lib/store";

const P = byId.p04;

/** Style of the season: one boot on a studio stage, outside/inside toggle, detail crops. */
export function Spotlight() {
  const [side, setSide] = useState<"outer" | "zip">("outer");
  const stage = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const inCart = useInCart(P.id);
  const toggle = useInquiry((s) => s.toggle);
  const crops = cropsFor(P.id);

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      const [out, inn] = side === "outer" ? ["[data-view=zip]", "[data-view=outer]"] : ["[data-view=outer]", "[data-view=zip]"];
      if (prefersReducedMotion()) {
        gsap.set(out, { autoAlpha: 0 });
        gsap.set(inn, { autoAlpha: 1 });
        return;
      }
      gsap.to(out, { autoAlpha: 0, rotation: -8, scale: 0.94, duration: 0.45, ease: "power2.in", overwrite: "auto" });
      gsap.fromTo(inn, { autoAlpha: 0, rotation: 8, scale: 0.94 }, { autoAlpha: 1, rotation: 0, scale: 1, duration: 0.8, delay: 0.15, ease: "power3.out", overwrite: "auto" });
    },
    { dependencies: [side], scope: stage },
  );

  return (
    <section id="spotlight" aria-labelledby="h-spotlight" className="mt-sec grid gap-3.5 lg:grid-cols-2">
      <div ref={stage} data-reveal className="bg-studio relative h-[clamp(380px,48vw,540px)] overflow-hidden rounded-shell border border-line/60">
        {/* slow orbit ring */}
        <div aria-hidden="true" className="motion-pause absolute top-1/2 left-1/2 aspect-square w-[78%] -translate-1/2 animate-spin-slow rounded-full border border-ink/10">
          <span className="absolute top-[14%] left-[14%] size-2.5 rounded-full bg-accent" />
        </div>

        {/* Technical compass grid marks */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-6 flex items-center justify-between text-[9px] font-mono text-muted/60">
          <span>[ 001.STAGE.A ]</span>
          <span>[ 360° INSPECT ]</span>
        </div>

        <span className="glass mono-label absolute top-5 left-5 z-[2] rounded-full px-3.5 py-1.5 text-studio-ink-2 shadow-xs">
          STYLE OF THE SEASON · CORE FW26
        </span>
        <QuickViewButton id={P.id} aria-label={`View details: ARTICA ${P.name}`} className="absolute inset-[16%_10%_18%] cursor-zoom-in">
          {(["outer", "zip"] as const).map((v) => (
            <span key={v} data-view={v} className={clsx("absolute inset-0", v === "zip" && "invisible opacity-0")}>
              <Image
                src={v === "zip" ? P.zip!.src : P.outer.src}
                alt={v === "zip" ? `${P.name}, inside zip view` : P.desc}
                fill
                sizes="(max-width: 1184px) 80vw, 560px"
                className="-rotate-6 object-contain drop-shadow-hero"
              />
            </span>
          ))}
        </QuickViewButton>
        <div role="group" aria-label="Boot side" className="glass absolute bottom-5 left-1/2 z-[2] flex -translate-x-1/2 gap-1 rounded-full p-1 shadow-soft">
          {(["outer", "zip"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={side === v}
              onClick={() => setSide(v)}
              className="h-9 rounded-full px-4 text-xs font-bold text-ink-2 transition-all aria-pressed:bg-accent aria-pressed:text-on-accent aria-pressed:shadow-xs"
            >
              {v === "outer" ? "Outside View" : "Inside Zip"}
            </button>
          ))}
        </div>
      </div>

      <div data-reveal className="flex flex-col gap-5 rounded-shell border border-line/60 bg-tile p-[clamp(20px,3vw,36px)]">
        <div className="flex items-center justify-between">
          <p className="mono-label text-muted">MEN {"//"} TOP REORDER STYLE</p>
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">
            SERIES 04
          </span>
        </div>
        <h2 id="h-spotlight" className="type-giant -mt-1 tracking-tight">
          {P.name}
        </h2>
        <p className="-mt-3 text-[15px] font-medium text-ink-2">{P.type} · 2.2mm Waterproof Leather</p>
        <dl className="grid grid-cols-3 gap-2.5">
          {[
            [String(MOQ_PAIRS), "Pairs MOQ"],
            [String(PACK), "Pairs / case"],
            [P.rating ?? "", "Cold Rated"],
          ].map(([v, k]) => (
            <div key={k} className="flex flex-col-reverse justify-end rounded-ph border border-line/50 bg-surface px-3.5 py-3 shadow-xs">
              <dt className="text-[11px] font-semibold text-muted">{k}</dt>
              <dd className="text-[clamp(20px,2.2vw,28px)] font-extrabold tracking-[-.02em] tabular-nums text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="mono-label text-muted">SIZES US</p>
            <span className="text-[11px] font-semibold text-muted">Pre-sorted 12/case pack</span>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {P.sizeRun.map((s) => (
              <li key={s} className="grid size-10 place-items-center rounded-lg border border-line/70 bg-surface text-[13px] font-bold tabular-nums text-ink shadow-xs">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {crops.map((c) => (
            <li key={c.id}>
              <QuickViewButton id={P.id} aria-label={`${c.label}: view details`} className="group block w-full overflow-hidden rounded-ph border border-line/50 shadow-xs">
                <CropImage crop={c} aspect={1} className="aspect-square transition-transform duration-700 ease-soft group-hover:scale-110" />
              </QuickViewButton>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap gap-2.5">
          <button type="button" onClick={() => toggle(P.id)} aria-pressed={inCart} className="btn btn-dark">
            <Icon name={inCart ? "check" : "plus"} />
            {inCart ? "In inquiry list" : "Add to inquiry"}
          </button>
          <QuickViewButton id={P.id} className="btn btn-ghost">
            Full specs <Icon name="arrow" />
          </QuickViewButton>
        </div>
      </div>
    </section>
  );
}
