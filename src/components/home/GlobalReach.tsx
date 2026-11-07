"use client";

import { SectionText } from "../ui/SectionText";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { useUI } from "@/lib/store";
/** The map is centred on the Pacific, so every lane runs the way the ships do (west through Suez, east to the Americas). */
const CENTER_LON = 160;
const at = (lon: number, lat: number) => ({ x: (((lon - CENTER_LON + 540) % 360) / 360) * 1000, y: ((90 - lat) / 180) * 500 });

/** Where the factory is, and the lanes out of it (indicative transit, client placeholders; same as the shipping page). */
const ORIGIN = { name: "Guangzhou", ...at(113.3, 23.1) };
const LANES = [
  { port: "Rotterdam", region: "Europe", days: "30–36 days", ...at(4.5, 51.9) },
  { port: "Dubai", region: "Middle East", days: "18–22 days", ...at(55.3, 25.3) },
  { port: "Sydney", region: "Australia", days: "14–20 days", ...at(151.2, -33.9) },
  { port: "Los Angeles", region: "North America", days: "14–18 days", ...at(-118.2, 34) },
  { port: "New York", region: "North America", days: "26–34 days", ...at(-74, 40.7) },
  { port: "Santos", region: "South America", days: "35–42 days", ...at(-46.3, -24) },
];

/** A lane as a shallow arc, bowed away from the equator so it reads as a great-circle route. */
function arc(to: { x: number; y: number }) {
  const { x: x0, y: y0 } = ORIGIN;
  const d = Math.hypot(to.x - x0, to.y - y0);
  const lift = d * 0.26 * (to.y > 260 ? -1 : 1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${((x0 + to.x) / 2).toFixed(1)} ${((y0 + to.y) / 2 - lift).toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

const CYCLE_MS = 3600;

/**
 * Worldwide: a live map of the trade lanes out of the Guangzhou factory. Every lane flows and carries a container on a
 * loop, one lane at a time is lit with its port and transit called out, and the ports list beside it picks a lane. The
 * map is the dotted world, Pacific-centred (public/images/world-dots-pacific.svg), in its own 1000 x 500 units. A button stops the motion
 * (WCAG 2.2.2); reduced motion shows it still.
 */
export function GlobalReach() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const openDrawer = useUI((s) => s.openDrawer);
  const still = paused || reduced;

  useEffect(() => {
    if (still) return;
    const t = setInterval(() => !document.hidden && setActive((a) => (a + 1) % LANES.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [still]);

  const lane = LANES[active];

  return (
    <section id="worldwide" aria-labelledby="h-worldwide" className="mt-sec scroll-mt-24">
      <div className="mb-8 md:mb-10">
        <p className="eyebrow">Worldwide</p>
        <SectionText as="h2" part="title" id="h-worldwide" className="type-section mt-3 max-w-[20ch]">
          From our factory to <em>your shelves, anywhere.</em>
        </SectionText>
        <SectionText part="sub" className="mt-3 max-w-[52ch] text-[17px] text-ink-2">
          Every order ships from Guangzhou, DDP, FOB or EXW, door-to-door or to your port.
        </SectionText>
      </div>

      <div className="glass relative overflow-hidden rounded-[28px]">
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* the map */}
          <div className="relative aspect-[1000/430] min-h-[220px] w-full lg:aspect-auto lg:h-full lg:min-h-[440px]">
            <svg aria-hidden="true" viewBox="0 20 1000 430" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full">
              <defs>
                <radialGradient id="gr-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="var(--color-brand)" stopOpacity="0.35" />
                  <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <image href="/images/world-dots-pacific.svg" x="0" y="0" width="1000" height="500" opacity="0.16" />

              {LANES.map((l, i) => {
                const on = i === active;
                const d = arc(l);
                return (
                  <g key={l.port}>
                    <path
                      d={d}
                      fill="none"
                      stroke="var(--color-brand)"
                      strokeWidth={on ? 2 : 1.1}
                      strokeOpacity={on ? 0.9 : 0.28}
                      strokeLinecap="round"
                      strokeDasharray={on ? undefined : "3 6"}
                      className={still || on ? "transition-[stroke-opacity] duration-700" : "[animation:route-flow_2.4s_linear_infinite]"}
                    />
                    {/* a container on every lane, staggered, looping */}
                    {!reduced && (
                      <circle r={on ? 4 : 2.6} fill="var(--color-brand)" opacity={on ? 1 : 0.55}>
                        <animateMotion
                          dur={`${4 + (i % 3)}s`}
                          begin={`${-i * 0.9}s`}
                          repeatCount="indefinite"
                          path={d}
                          keyPoints="0;1"
                          keyTimes="0;1"
                          calcMode="spline"
                          keySplines=".45 0 .25 1"
                        />
                      </circle>
                    )}
                    <circle cx={l.x} cy={l.y} r={on ? 4.4 : 3} fill={on ? "var(--color-brand)" : "#6f6670"} className="transition-all duration-500" />
                    {on && !still && (
                      <circle
                        key={`p-${active}`}
                        cx={l.x}
                        cy={l.y}
                        r="4.4"
                        fill="none"
                        stroke="var(--color-brand)"
                        strokeWidth="1.3"
                        className="[transform-box:fill-box] origin-center [animation:port-pulse_1.8s_ease-out_infinite]"
                      />
                    )}
                  </g>
                );
              })}

              {/* the factory */}
              <circle cx={ORIGIN.x} cy={ORIGIN.y} r="22" fill="url(#gr-glow)" />
              <circle cx={ORIGIN.x} cy={ORIGIN.y} r="5.4" fill="var(--color-brand)" stroke="#fff" strokeWidth="2" />
            </svg>

            {/* labels, in HTML so they stay crisp and readable */}
            <span
              className="pointer-events-none absolute -translate-x-1/2 translate-y-2.5 rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold tracking-[0.1em] whitespace-nowrap text-white uppercase max-sm:hidden"
              style={pos(ORIGIN)}
            >
              Guangzhou · factory
            </span>
            <span
              key={`l-${active}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] animate-rise-in rounded-xl bg-white/90 px-3 py-1.5 text-center whitespace-nowrap shadow-soft backdrop-blur-md motion-reduce:animate-none max-sm:hidden"
              style={pos(lane)}
            >
              <b className="block text-[12.5px] font-semibold">{lane.port}</b>
              <span className="text-[11.5px] text-muted">{lane.days}</span>
            </span>
          </div>

          {/* the lanes */}
          <div className="relative border-ink/8 p-5 max-lg:border-t lg:border-l lg:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold tracking-[0.16em] text-muted uppercase">Trade lanes</p>
              {!reduced && (
                <button
                  type="button"
                  onClick={() => setPaused((v) => !v)}
                  aria-pressed={paused}
                  aria-label={paused ? "Play the map" : "Pause the map"}
                  className="grid size-9 place-items-center rounded-full bg-white/70 text-ink-2 transition-colors hover:bg-white hover:text-ink"
                >
                  <Icon name={paused ? "play" : "pause"} className="size-3" />
                </button>
              )}
            </div>
            <ul className="mt-3 grid gap-1 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {LANES.map((l, i) => {
                const on = i === active;
                return (
                  <li key={l.port}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setActive(i);
                        setPaused(true);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? "bg-white shadow-soft" : "hover:bg-white/60"}`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className={`size-2 shrink-0 rounded-full ${on ? "bg-brand" : "bg-ink/20"}`} />
                        <span className="min-w-0">
                          <b className="block truncate text-[14px] font-semibold">{l.port}</b>
                          <span className="block truncate text-[12px] text-muted">{l.region}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-[12.5px] font-medium text-ink-2 tabular-nums">{l.days}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => openDrawer(undefined, undefined, `Shipping lane: Guangzhou to ${lane.port} (${lane.region}).`)}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-semibold text-white transition-colors hover:bg-brand"
            >
              Get pricing to {lane.port} <Icon name="arrow" className="size-3.5" />
            </button>
            <p className="mt-2.5 text-center text-[12px] text-muted">Indicative ocean transit. Confirmed on every quote.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A point in map units as a CSS position over the map box (viewBox 0 20 1000 430). */
function pos(p: { x: number; y: number }) {
  return { left: `${(p.x / 10).toFixed(2)}%`, top: `${(((p.y - 20) / 430) * 100).toFixed(2)}%` };
}

const REDUCE = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = matchMedia(REDUCE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => matchMedia(REDUCE).matches,
    () => false,
  );
}
