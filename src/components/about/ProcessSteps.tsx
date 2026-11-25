"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../season/live";
import type { AboutPhoto } from "@/lib/about-photos";

export type Step = { photo: AboutPhoto; title: string; text: string };

const pad = (i: number) => String(i + 1).padStart(2, "0");

/**
 * How a pair is made, as a split: on wide screens the list of steps stays put on the left while the photos scroll
 * by on the right, and the step whose photo is mid-screen opens in the list (any step in the list scrolls to its
 * photo). On phones each photo carries its own number, name and line.
 */
export function ProcessSteps({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const still = useReducedMotion();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      // the band across the middle of the screen: a photo counts once it reaches it
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          <h2 id="h-steps" className="type-section">
            From leather to carton.
          </h2>
          <p className="mt-4 max-w-[40ch] text-[17px] leading-relaxed text-ink-2">Seven steps, photographed on the production floor where the orders are made.</p>
          <ol className="mt-9 hidden border-t border-line lg:block">
            {steps.map((s, i) => (
              <li key={s.title} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => refs.current[i]?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" })}
                  aria-current={active === i ? "step" : undefined}
                  className="grid w-full grid-cols-[44px_minmax(0,1fr)] gap-2 py-4 text-left"
                >
                  <span className={clsx("pt-0.5 text-[13px] font-semibold tabular-nums transition-colors duration-300", active === i ? "text-brand" : "text-muted")}>{pad(i)}</span>
                  <span>
                    <span className={clsx("block text-[16px] font-semibold transition-colors duration-300", active === i ? "text-ink" : "text-ink-2")}>{s.title}</span>
                    {/* the open step's line, eased open; the others fold away */}
                    <span className={clsx("grid transition-[grid-template-rows,opacity] duration-500 ease-soft", active === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                      <span className="overflow-hidden">
                        <span className="block pt-1.5 text-[14.5px] leading-relaxed text-ink-2">{s.text}</span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ol className="grid gap-8 lg:col-span-7 lg:gap-12">
        {steps.map((s, i) => (
          <li key={s.title} ref={(el) => void (refs.current[i] = el)} data-i={i}>
            <figure>
              <span className="relative block aspect-[4/3] overflow-hidden rounded-shell bg-photo">
                <Image src={s.photo.src} alt={s.photo.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
              </span>
              <figcaption className="mt-4 grid grid-cols-[44px_minmax(0,1fr)] gap-2 lg:mt-3">
                <span className="pt-0.5 text-[13px] font-semibold text-brand tabular-nums">{pad(i)}</span>
                <span>
                  <span className="block text-[16px] font-semibold lg:text-[14px] lg:font-medium lg:text-ink-2">{s.title}</span>
                  <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-2 lg:hidden">{s.text}</span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </div>
  );
}
