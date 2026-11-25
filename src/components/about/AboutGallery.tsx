"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { AboutPhoto } from "@/lib/about-photos";

/**
 * A wall of photos in columns (each keeps its own shape), the first `shown` at once and the rest behind a button.
 * Any photo opens large, with the ones before and after a click or an arrow key away; Escape closes it.
 */
export function AboutGallery({ photos, shown = 12, className }: { photos: AboutPhoto[]; shown?: number; className?: string }) {
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
      <ul className={clsx("columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4", className)}>
        {list.map((ph, i) => (
          <li key={ph.slug} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group relative block w-full overflow-hidden rounded-card bg-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label={`Open photo: ${ph.alt}`}
            >
              {/* very tall phone shots would tower over the rest: shown 3:4 here, whole when opened */}
              {ph.h / ph.w > 1.4 ? (
                <span className="relative block aspect-[3/4]">
                  <Image
                    src={ph.src}
                    alt={ph.alt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
                  />
                </span>
              ) : (
                <Image
                  src={ph.src}
                  alt={ph.alt}
                  width={ph.w}
                  height={ph.h}
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="h-auto w-full transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
                />
              )}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgb(12_13_14/.6),transparent)] px-3 pt-8 pb-2.5 text-left text-[12.5px] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {ph.alt}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {photos.length > shown && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => setAll((v) => !v)} className="btn btn-line">
            {all ? "Show fewer photos" : `Show all ${photos.length} photos`}
          </button>
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
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/92 p-0 text-white backdrop:bg-ink/60"
      >
        {p && (
          <div className="relative flex h-full flex-col items-center justify-center p-[clamp(12px,3vw,40px)]">
            <div className="relative h-full max-h-[calc(100dvh-120px)] w-full">
              <Image src={p.src} alt={p.alt} fill sizes="100vw" quality={85} className="object-contain" />
            </div>
            <p className="mt-4 text-center text-[14px] text-white/80">
              {p.alt} <span className="text-white/50 tabular-nums">· {open! + 1} / {photos.length}</span>
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
