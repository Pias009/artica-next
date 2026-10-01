"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../Icon";
import { SectionHead } from "../ui/SectionHead";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { byId } from "@/lib/products";
import { useInCart, useInquiry } from "@/lib/store";

const STYLES = ["p04", "p01", "p05", "p03"].map((id) => byId[id]);

/** Look closer: tap a hotspot, the loupe pans to that spot and its material lights up. */
export function Explorer() {
  const [idx, setIdx] = useState(0);
  const p = STYLES[idx];
  const [spot, setSpot] = useState(p.hotspots[0].id);
  const active = p.hotspots.find((h) => h.id === spot) ?? p.hotspots[0];
  const stage = useRef<HTMLDivElement>(null);
  const prev = useRef(0);
  const inCart = useInCart(p.id);
  const toggle = useInquiry((s) => s.toggle);

  const choose = (i: number) => {
    setIdx(i);
    setSpot(STYLES[i].hotspots[0].id);
  };

  // Slide the boot out and the next one in when the tab changes.
  useGSAP(
    () => {
      if (prev.current === idx || prefersReducedMotion()) {
        prev.current = idx;
        return;
      }
      const dir = idx > prev.current ? 1 : -1;
      prev.current = idx;
      gsap.fromTo("[data-boot]", { x: 80 * dir, autoAlpha: 0, rotation: 4 * dir }, { x: 0, autoAlpha: 1, rotation: 0, duration: 0.8, ease: "power3.out" });
      gsap.from("[data-spot]", { scale: 0, duration: 0.4, ease: "back.out(2)", stagger: 0.05, delay: 0.35 });
    },
    { dependencies: [idx], scope: stage },
  );

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (idx + d + STYLES.length) % STYLES.length;
    choose(next);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <section id="explore" aria-labelledby="h-explore" className="mt-sec">
      <SectionHead id="h-explore" title="Look closer." muted="Tap a dot." />
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div ref={stage} data-reveal className="bg-studio relative flex min-h-[420px] flex-col overflow-hidden rounded-shell p-4 md:min-h-[520px]">
          <div role="tablist" aria-label="Styles" className="glass relative z-[3] flex self-start rounded-full p-1">
            {STYLES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={`xt-${s.id}`}
                aria-selected={i === idx}
                aria-controls="x-panel"
                tabIndex={i === idx ? 0 : -1}
                onClick={() => choose(i)}
                onKeyDown={onTabKey}
                className="h-11 rounded-full px-4 text-[13px] font-semibold text-ink-2 transition-colors aria-selected:bg-accent aria-selected:text-on-accent"
              >
                {s.name}
              </button>
            ))}
          </div>

          <span aria-hidden="true" className="type-giant pointer-events-none absolute right-4 bottom-2 z-0 text-ink/[.06]">
            {p.name}
          </span>

          {/* boot at its own aspect ratio so hotspots sit on the right spots */}
          <div className="relative z-[1] grid flex-1 place-items-center py-6">
            <div
              data-boot
              className="relative"
              // Width capped so height stays ≤ 400px while keeping the photo's exact aspect.
              style={{ aspectRatio: `${p.outer.w} / ${p.outer.h}`, width: `min(88%, ${Math.round((400 * p.outer.w) / p.outer.h)}px)` }}
            >
              <Image src={p.outer.src} alt={p.desc} fill sizes="(max-width: 1184px) 80vw, 560px" className="object-contain drop-shadow-hero" />
              {p.hotspots.map((h) => (
                <button
                  key={h.id}
                  data-spot
                  type="button"
                  aria-label={`${h.label}: ${h.value}`}
                  aria-pressed={h.id === active.id}
                  onClick={() => setSpot(h.id)}
                  onMouseEnter={() => setSpot(h.id)}
                  onFocus={() => setSpot(h.id)}
                  className="hit-44 absolute z-[2] grid size-5 -translate-1/2 place-items-center rounded-full"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  <span
                    className={clsx(
                      "motion-pause block rounded-full border-2 border-white shadow-[0_2px_8px_rgb(0_0_0/.35)] transition-[width,height,background-color] duration-300",
                      h.id === active.id ? "size-5 bg-accent" : "size-3.5 animate-hotspot bg-white",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div id="x-panel" role="tabpanel" aria-labelledby={`xt-${p.id}`} data-reveal className="flex flex-col gap-4 rounded-shell bg-tile p-[clamp(18px,2.6vw,28px)]">
          <div
            role="img"
            aria-label={`Close-up: ${active.label}, ${active.value}`}
            className="relative aspect-[4/3] overflow-hidden rounded-card bg-photo border border-line/60 transition-[background-position] duration-700 ease-soft shadow-inner"
            style={{
              backgroundImage: `url(${p.outer.src})`,
              backgroundSize: "380%",
              backgroundPosition: `${active.x}% ${active.y}%`,
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Optical reticle HUD overlays */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {/* Corner brackets */}
              <span className="absolute top-3 left-3 size-3 border-t-2 border-l-2 border-ink/40" />
              <span className="absolute top-3 right-3 size-3 border-t-2 border-r-2 border-ink/40" />
              <span className="absolute bottom-3 left-3 size-3 border-b-2 border-l-2 border-ink/40" />
              <span className="absolute bottom-3 right-3 size-3 border-b-2 border-r-2 border-ink/40" />
              
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 size-7 -translate-1/2">
                <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-ink/30" />
                <span className="absolute left-1/2 top-0 w-px h-full -translate-x-1/2 bg-ink/30" />
                <span className="absolute inset-1 rounded-full border border-ink/30" />
              </div>

              {/* Optical stamp */}
              <div className="glass absolute top-3 left-7 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold">
                <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                <span className="mono-label text-[9px] text-ink">3.8× MACRO</span>
              </div>

              {/* Coordinate stamp */}
              <div className="glass absolute bottom-3 right-3 rounded-md px-2 py-0.5 text-[9px] font-mono text-muted">
                LOC: {active.x}%, {active.y}%
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="type-label text-muted">
                {p.line} · {p.type}
              </p>
              <span className="mono-label text-[10px] text-accent font-bold">INSPECTED</span>
            </div>
            <h3 className="mt-1 text-[clamp(24px,2.6vw,32px)] leading-none font-extrabold uppercase tracking-tight">ARTICA {p.name}</h3>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {p.hotspots.map((h) => (
              <li key={h.id} className={clsx(h === p.hotspots[4] && "col-span-2")}>
                <button
                  type="button"
                  aria-pressed={h.id === active.id}
                  onClick={() => setSpot(h.id)}
                  className="w-full rounded-ph border border-line/60 bg-surface px-3.5 py-2.5 text-left transition-all hover:bg-chip-hover hover:border-ink/20 aria-pressed:bg-accent aria-pressed:border-accent aria-pressed:text-on-accent shadow-xs"
                >
                  <span className="block text-[11px] font-semibold opacity-75">{h.label}</span>
                  <span className="block text-[13px] font-bold">{h.value}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2.5">
            <button type="button" onClick={() => toggle(p.id)} aria-pressed={inCart} className="btn btn-dark">
              <Icon name={inCart ? "check" : "plus"} />
              {inCart ? "In inquiry list" : "Add to inquiry"}
            </button>
            <QuickViewButton id={p.id} className="btn btn-ghost">
              Full specs <Icon name="arrow" />
            </QuickViewButton>
          </div>
        </div>
      </div>
    </section>
  );
}
