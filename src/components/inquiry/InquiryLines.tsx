"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Icon } from "../Icon";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { byId, PACK } from "@/lib/products";
import { useInquiry } from "@/lib/store";

export function InquiryLines({ onNavigate }: { onNavigate?: () => void }) {
  const lines = useInquiry((s) => s.lines);
  const step = useInquiry((s) => s.step);
  const remove = useInquiry((s) => s.remove);
  const ref = useRef<HTMLDivElement>(null);

  // Slide newly added rows in.
  const known = useRef<Set<string>>(new Set());
  useGSAP(
    () => {
      const fresh = lines.filter((l) => !known.current.has(l.id)).map((l) => `[data-line="${l.id}"]`);
      known.current = new Set(lines.map((l) => l.id));
      if (!fresh.length) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from(fresh.join(","), { x: 24, autoAlpha: 0, duration: 0.5, ease: "power3.out", stagger: 0.05 });
      });
    },
    { dependencies: [lines.length], scope: ref },
  );

  if (!lines.length) {
    return (
      <div className="rounded-ph bg-tile p-[26px] text-center text-[13px] text-muted">
        No styles yet. Tap <b>+</b> on any boot, or just send the form for the full line sheet.
      </div>
    );
  }

  const totalCases = lines.reduce((a, l) => a + l.cases, 0);

  return (
    <div ref={ref}>
      <ul className="grid gap-2.5">
        {lines.map(({ id, cases }) => {
          const p = byId[id];
          return (
            <li key={id} data-line={id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-ph bg-tile p-2.5">
              <span className="relative h-14 w-16 rounded-xl bg-photo">
                <Image src={p.outer.src} alt="" fill sizes="64px" className="object-contain p-1.5" />
              </span>
              <span className="min-w-0">
                <Link href={`/products/${p.slug}`} onClick={onNavigate} className="block text-[12.5px] font-extrabold uppercase hover:underline">
                  ARTICA {p.name}
                </Link>
                <span className="block text-[11.5px] text-muted tabular-nums">
                  {cases} cases · {cases * PACK} pairs · {p.sizes}
                </span>
                <button type="button" onClick={() => remove(id)} className="mt-0.5 -ml-1 px-1 py-1 text-xs text-muted underline hover:text-ink">
                  Remove
                </button>
              </span>
              <span className="flex items-center gap-0.5 rounded-full bg-surface p-[3px]" role="group" aria-label={`Cases for ${p.name}`}>
                <button type="button" onClick={() => step(id, -1)} aria-label="Fewer cases" className="hit-44 relative grid size-7 place-items-center rounded-full hover:bg-chip">
                  <Icon name="minus" />
                </button>
                <output className="min-w-[30px] text-center text-[13px] font-extrabold tabular-nums">{cases}</output>
                <button type="button" onClick={() => step(id, 1)} aria-label="More cases" className="hit-44 relative grid size-7 place-items-center rounded-full hover:bg-chip">
                  <Icon name="plus" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between px-1 pt-3.5 pb-1 text-[13px] text-ink-2">
        <span>
          {lines.length} style{lines.length > 1 ? "s" : ""} · {totalCases} cases
        </span>
        <b className="text-ink tabular-nums">{(totalCases * PACK).toLocaleString("en-US")} pairs</b>
      </div>
    </div>
  );
}
