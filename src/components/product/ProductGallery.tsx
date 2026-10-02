"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { gsap, MOTION_OK, prefersReducedMotion, useGSAP } from "@/lib/gsap";

type Shot = { src: string; alt: string; label: string };

/** Studio-style product viewer: crossfading views, pointer tilt, thumbnails. */
export function ProductGallery({ shots, badge }: { shots: Shot[]; badge?: ReactNode }) {
  const [cur, setCur] = useState(0);
  const prev = useRef(0);
  const stage = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-view='0']", { x: 60, rotation: 6, autoAlpha: 0, duration: 1.1, ease: "power3.out" });
      });
    },
    { scope: stage },
  );

  useGSAP(
    () => {
      const from = prev.current;
      if (from === cur) return;
      prev.current = cur;
      const views = Array.from(stage.current!.querySelectorAll<HTMLElement>("[data-view]"));
      if (prefersReducedMotion()) {
        gsap.set(views[from], { autoAlpha: 0 });
        gsap.set(views[cur], { autoAlpha: 1 });
        return;
      }
      const dir = cur > from ? 1 : -1;
      gsap.to(views[from], { x: -40 * dir, autoAlpha: 0, duration: 0.45, ease: "power2.in", overwrite: "auto" });
      gsap.fromTo(views[cur], { x: 50 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", delay: 0.1, overwrite: "auto" });
    },
    { dependencies: [cur], scope: stage },
  );

  const onMove = contextSafe((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to("[data-tilt]", { rotationY: px * 10, rotationX: -py * 8, x: px * 14, y: py * 10, duration: 0.6, ease: "power2.out" });
  });
  const onLeave = contextSafe(() => {
    gsap.to("[data-tilt]", { rotationY: 0, rotationX: 0, x: 0, y: 0, duration: 0.8, ease: "power3.out" });
  });

  return (
    <div className="grid gap-3">
      <div
        ref={stage}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative aspect-square overflow-hidden rounded-shell bg-tile [perspective:900px] md:aspect-[1/0.95]"
      >
        {badge}
        <div className="absolute right-[14%] bottom-[9%] left-[14%] h-9 rounded-[50%] bg-[radial-gradient(closest-side,rgb(29_30_25/.22),transparent)] blur-[4px]" />
        <div data-tilt className="absolute inset-[10%_8%_14%]">
          {shots.map((s, i) => (
            <div key={s.src} data-view={i} className={clsx("absolute inset-0", i !== 0 && "invisible opacity-0")}>
              <Image
                src={s.src}
                alt={s.alt}
                fill
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                sizes="(max-width: 864px) 90vw, 620px"
                className="-rotate-6 object-contain drop-shadow-hero"
              />
            </div>
          ))}
        </div>
      </div>
      {shots.length > 1 && (
        <div role="tablist" aria-label="Product views" className="flex gap-2.5">
          {shots.map((s, i) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={i === cur}
              aria-label={s.label}
              onClick={() => setCur(i)}
              className={clsx(
                "relative h-20 w-24 overflow-hidden rounded-ph border-2 bg-photo transition-colors",
                i === cur ? "border-accent" : "border-transparent hover:border-line",
              )}
            >
              <Image src={s.src} alt="" fill sizes="96px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
