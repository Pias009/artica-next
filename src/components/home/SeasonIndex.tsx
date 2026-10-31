"use client";

import clsx from "clsx";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddButton } from "../product/AddButton";
import { byId, categoryOf, LINE_LABEL, MOQ_PAIRS, PACK } from "@/lib/products";
import { useUI } from "@/lib/store";

const DWELL = 4500; // ms on each style before the next comes up

/** The plate's tone under each style: soft grounds from the site's palette. */
const PLATES = ["#dde8ee", "#efdccd", "#dde6d6", "#f1dbe2", "#e7e2d9", "#e3e0ef"];

/**
 * The season's picks as an editorial index beside a stage: the styles listed by name, large, and the one in focus
 * standing on a round plate in its own tone. A new style comes up through an opening circle while the plate changes
 * colour; its wholesale terms sit under the stage. It moves through the list on its own (a thin line fills beside the
 * current name); pointing at or focusing a name brings it up. Pauses while held, off screen or in a hidden tab, and
 * has a pause button. Reduced motion: no autoplay, and styles swap without the reveal.
 */
export function SeasonIndex({ ids, label }: { ids: string[]; label: string }) {
  const picks = ids.map((id) => byId[id]).filter(Boolean);
  const openQuickView = useUI((s) => s.openQuickView);
  const box = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden), { threshold: 0.15 });
    if (box.current) io.observe(box.current);
    const onHide = () => setVisible((v) => v && !document.hidden);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      mq.removeEventListener("change", sync);
      io.disconnect();
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  const show = useCallback(
    (n: number) => {
      const next = (n + picks.length) % picks.length;
      if (next === cur) return;
      setPrev(cur);
      setCur(next);
    },
    [cur, picks.length],
  );

  const running = !paused && !held && visible && !reduced && picks.length > 1;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => show(cur + 1), DWELL);
    return () => clearTimeout(id);
  }, [running, cur, show]);

  const p = picks[cur];
  const before = prev !== null ? picks[prev] : null;

  return (
    <div
      ref={box}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-state={running ? "playing" : paused ? "paused" : "held"}
      className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-10"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
    >
      {/* the stage */}
      <div className="md:order-2">
        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <span
            aria-hidden="true"
            className="absolute inset-[6%] rounded-full transition-colors duration-700"
            style={{ background: PLATES[cur % PLATES.length] }}
          />
          <span aria-hidden="true" className="absolute inset-[6%] rounded-full shadow-[inset_0_-30px_60px_-30px_rgb(18_20_22/.18)]" />
          {/* the ground shadow the boot stands on */}
          <span aria-hidden="true" className="absolute bottom-[17%] left-1/2 h-[5%] w-[56%] -translate-x-1/2 rounded-[50%] bg-ink/25 blur-md" />
          {before && !reduced && (
            <span key={`b-${prev}-${cur}`} aria-hidden="true" className="absolute inset-[12%] animate-[stage-out_.55s_cubic-bezier(.4,0,1,1)_forwards]">
              <Image src={before.outer.src} alt="" fill sizes="460px" className="-scale-x-100 object-contain" />
            </span>
          )}
          <span
            key={`c-${cur}`}
            className={clsx("absolute inset-[12%]", !reduced && "animate-[stage-reveal_.9s_cubic-bezier(.65,0,.35,1)_both]")}
          >
            <span className={clsx("absolute inset-0", !reduced && "animate-[boot-in_1s_.05s_cubic-bezier(.22,1,.36,1)_both]")}>
              <Image src={p.outer.src} alt={`${p.name}, ${p.type}`} fill sizes="460px" className="-scale-x-100 object-contain drop-shadow-[0_24px_22px_rgb(18_20_22/.28)]" />
            </span>
          </span>
          <button
            type="button"
            onClick={() => openQuickView(p.id)}
            aria-label={`View ${p.name}`}
            className="absolute right-[4%] bottom-[10%] grid size-14 place-items-center rounded-full bg-ink text-white shadow-[0_14px_28px_-10px_rgb(18_20_22/.5)] transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div key={`t-${cur}`} className="mx-auto mt-2 flex max-w-[460px] items-end justify-between gap-4 motion-safe:animate-[panel-in_.6s_.15s_cubic-bezier(.22,1,.36,1)_both]">
          <dl className="grid grid-cols-3 gap-x-3 sm:gap-x-6">
            {[
              ["Minimum", `${MOQ_PAIRS} pairs`],
              ["Case", `${PACK} pairs`],
              ["Sizes", p.sizes],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[13px] text-ink-2">{k}</dt>
                <dd className="text-[15px] leading-tight font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <AddButton id={p.id} className="size-11 flex-none shadow-soft" />
        </div>
      </div>

      {/* the index */}
      <div className="md:order-1">
        <ol className="grid" aria-live={running ? "off" : "polite"}>
          {picks.map((x, i) => {
            const on = i === cur;
            return (
              <li key={x.id} className="border-b border-ink/10 last:border-0">
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => show(i)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && show(i)}
                  className="group relative grid w-full grid-cols-[2.25rem_minmax(0,1fr)] items-baseline py-3 text-left"
                >
                  <span className={clsx("text-[13px] font-semibold tabular-nums transition-colors", on ? "text-ink" : "text-ink-2/60")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={clsx(
                        "block truncate font-headline text-[clamp(24px,2.3vw,34px)] leading-tight font-semibold tracking-[-0.02em] transition-[color,translate] duration-500",
                        on ? "translate-x-1 text-ink" : "text-ink/30 group-hover:text-ink/60",
                      )}
                    >
                      {x.name}
                    </span>
                    <span
                      className={clsx(
                        "grid transition-[grid-template-rows,opacity] duration-500",
                        on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <span className="overflow-hidden text-[15px] text-ink-2">
                        <span className="block pt-1 pl-1">
                          {LINE_LABEL[x.line]} · {categoryOf(x)}
                        </span>
                      </span>
                    </span>
                  </span>
                  {/* time until the next comes up */}
                  {on && (
                    <span aria-hidden="true" className="absolute bottom-[-1px] left-0 h-[2px] w-full">
                      <span
                        key={`${cur}-${running}`}
                        className={clsx("block h-full bg-ink", running ? "animate-[slide-progress_linear_forwards]" : "w-0")}
                        style={running ? { animationDuration: `${DWELL}ms` } : undefined}
                      />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? "Play the styles" : "Pause the styles"}
            className="mt-2 flex min-h-11 items-center gap-2 rounded-full pr-3 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
              {paused ? <path d="M8 5.5v13l10.5-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
            </svg>
            {paused ? "Play" : "Pause"}
          </button>
        )}
      </div>
    </div>
  );
}
