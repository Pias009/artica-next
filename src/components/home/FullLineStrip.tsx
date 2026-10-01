"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Icon } from "../Icon";
import { AddButton } from "../product/AddButton";
import { QuickViewButton } from "../ui/QuickViewButton";
import { SectionHead } from "../ui/SectionHead";
import { prefersReducedMotion } from "@/lib/gsap";
import { LINE_LABEL, MOQ_PAIRS, products, type Scene } from "@/lib/products";

const TONE: Record<Scene, string> = { sage: "bg-sage", sand: "bg-sand", blush: "bg-blush", stone: "bg-stone" };
const pad = (n: number) => String(n).padStart(2, "0");

/** Full-width strip of big slides: drag with the mouse, swipe on touch, snap into place. */
export function FullLineStrip() {
  const ref = useRef<HTMLUListElement>(null);
  const drag = useRef({ active: false, x: 0, left: 0, moved: false });
  const [dragging, setDragging] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current!;
    const measure = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = ref.current!;
    const slide = el.querySelector("li");
    el.scrollBy({ left: dir * ((slide?.clientWidth ?? 400) + 14), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const onDown = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { active: true, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  };
  const onMove = (e: PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.moved) e.currentTarget.scrollLeft = d.left - dx;
  };
  const onUp = () => {
    drag.current.active = false;
    setDragging(false);
  };

  return (
    <section id="full-line" aria-labelledby="h-full" className="mt-sec">
      <SectionHead
        id="h-full"
        title="The full line"
        muted={`${pad(products.length)} styles`}
        right={
          <div className="flex gap-2">
            {([-1, 1] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => step(d)}
                disabled={d === -1 ? edges.start : edges.end}
                aria-label={d === -1 ? "Previous style" : "Next style"}
                aria-controls="strip"
                className="grid size-11 place-items-center rounded-full bg-chip transition-[background-color,opacity] hover:bg-chip-hover disabled:opacity-35"
              >
                <Icon name="arrow" className={d === -1 ? "rotate-180" : undefined} />
              </button>
            ))}
          </div>
        }
      />
      <ul
        ref={ref}
        id="strip"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        // Swallow the click that ends a drag so it doesn't open Quick View.
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
        className={clsx(
          "bleed no-scrollbar flex gap-3.5 overflow-x-auto px-(--shell-pad) scroll-px-(--shell-pad)",
          dragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory md:cursor-grab",
        )}
      >
        {products.map((p, i) => (
          <li
            key={p.id}
            className={clsx(
              "group relative isolate aspect-square w-[82vw] max-w-[560px] flex-none snap-start overflow-hidden rounded-shell border border-line/60 shadow-soft card-lift md:w-[40vw]",
              TONE[p.scene],
            )}
          >
            <span aria-hidden="true" className="type-giant text-outline pointer-events-none absolute inset-x-0 top-[18%] z-0 text-center text-[clamp(64px,11vw,150px)] whitespace-nowrap opacity-30 select-none">
              {p.name}
            </span>
            <div className="absolute top-5 left-5 z-[2] flex items-center gap-2">
              <span className="mono-label rounded-md bg-white/70 px-2 py-0.5 text-[9.5px] font-bold text-ink">
                ARCHIVE {pad(i + 1)} / {pad(products.length)}
              </span>
            </div>
            <QuickViewButton id={p.id} tabIndex={-1} aria-hidden="true" className="absolute inset-0 z-[1]" />
            <AddButton id={p.id} className="absolute top-4 right-4 z-[3] size-10 shadow-sm" />
            <span className="pointer-events-none absolute inset-[16%_12%_30%] z-[1] transition-transform duration-[900ms] ease-soft group-hover:-translate-y-2 group-hover:scale-105 group-hover:-rotate-3">
              <Image src={p.outer.src} alt={p.desc} fill draggable={false} sizes="(max-width: 864px) 80vw, 520px" className="object-contain drop-shadow-hero" />
            </span>
            <div className="glass-card pointer-events-none absolute inset-x-4 bottom-4 z-[2] flex flex-wrap items-end justify-between gap-3 rounded-2xl p-4 shadow-soft">
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wide text-ink">ARTICA {p.name}</h3>
                <p className="text-xs text-ink-2">{p.type}</p>
                <QuickViewButton id={p.id} className="pointer-events-auto mt-1 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                  Quick Inspect <Icon name="arrow" className="size-3.5" />
                </QuickViewButton>
              </div>
              <ul className="flex flex-wrap gap-1.5" aria-label="Specs">
                {[LINE_LABEL[p.line], p.sizes, `MOQ ${MOQ_PAIRS}`].map((c) => (
                  <li key={c} className="rounded-md border border-line/50 bg-white/80 px-2 py-0.5 text-[11px] font-bold text-ink">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
