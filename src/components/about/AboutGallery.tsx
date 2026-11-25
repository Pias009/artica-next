"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { AboutPhoto } from "@/lib/about-photos";

/**
 * A contact sheet: an even grid of photos, each numbered and named under it, the first `shown` at once and the rest
 * behind a button. Any photo opens large, with the ones before and after a click or an arrow key away; Escape closes.
 */
export function AboutGallery({ photos, shown = 12, columns = 4, className }: { photos: AboutPhoto[]; shown?: number; columns?: 3 | 4; className?: string }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = all ? photos : photos.slice(0, shown);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (by: number) => setOpen((i) => (i === null ? i : (i + by + photos.length) % photos.length));
  const p = open !== null ? photos[open] : null;

  return (
    <>
      <ul className={clsx("grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4", columns === 4 && "lg:grid-cols-4", className)}>
        {list.map((ph, i) => (
          <li key={ph.slug}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              aria-label={`Open photo ${i + 1}: ${ph.alt}`}
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-ph bg-photo">
                <Image
                  src={ph.src}
                  alt={ph.alt}
                  fill
                  sizes={columns === 4 ? "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" : "(min-width: 640px) 33vw, 50vw"}
                  className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
                />
              </span>
              <span className="mt-2 flex gap-2.5 text-[13px] leading-snug">
                <span className="shrink-0 font-semibold text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-ink-2 transition-colors group-hover:text-ink">{ph.alt}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {photos.length > shown && (
        <div className="mt-8 flex items-center gap-4">
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <button type="button" onClick={() => setAll((v) => !v)} className="btn btn-line">
            {all ? "Show fewer" : `Show all ${photos.length} photos`}
          </button>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>
      )}

      <dialog
        ref={dialog}
        aria-label={p ? p.alt : "Photo"}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-white backdrop:bg-ink/60"
      >
        {p && (
          <div className="relative flex h-full flex-col items-center justify-center p-[clamp(12px,3vw,40px)]">
            <div className="relative h-full max-h-[calc(100dvh-120px)] w-full">
              <Image src={p.src} alt={p.alt} fill sizes="100vw" quality={85} className="object-contain" />
            </div>
            <p className="mt-4 text-center text-[14px] text-white/80">
              <span className="text-white/50 tabular-nums">{String(open! + 1).padStart(2, "0")} / {photos.length}</span> · {p.alt}
            </p>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <Icon name="close" />
            </button>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 rotate-180 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <Icon name="arrow" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <Icon name="arrow" />
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
