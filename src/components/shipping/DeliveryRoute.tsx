"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRef, useState, type ComponentType } from "react";
import { FreightCanvas } from "./FreightCanvas";
import { AIR_U, AirScene, ROAD_U, RoadScene, SEA_U, SeaScene, travel } from "./FreightScenes";
import { gsap, useGSAP } from "@/lib/gsap";

type Mode = "sea" | "air" | "road";

/** Each way an order can travel, with its legs (indicative; every quote confirms the dates). */
const MODES: Record<Mode, { label: string; time: string; u: number; scene: ComponentType; bg: string; best: string; stops: [string, string, string][] }> = {
  sea: {
    label: "Sea",
    time: "14–42 days at sea",
    u: SEA_U,
    scene: SeaScene,
    bg: "bg-[linear-gradient(180deg,#eef4f6_0%,#d6e6ed_55%,#c3d9e3_100%)]",
    best: "Full containers and most orders: the lowest cost per pair.",
    stops: [
      ["Day 0", "Factory", "Guangzhou"],
      ["Days 3–5", "Export port", "Ningbo or Shanghai"],
      ["14–42 days", "At sea", "Direct container ships"],
      ["+1–3 days", "Import customs", "Destination port"],
      ["+1–5 days", "Your door", "DC or warehouse"],
    ],
  },
  air: {
    label: "Air",
    time: "3–7 days door to door",
    u: AIR_U,
    scene: AirScene,
    bg: "bg-[linear-gradient(180deg,#e4eef5_0%,#eef3f6_60%,#e8ece6_100%)]",
    best: "Samples, top-ups and urgent re-orders: the fastest, priced by weight.",
    stops: [
      ["Day 0", "Factory", "Guangzhou"],
      ["Days 1–2", "Baiyun airport", "CAN, Guangzhou"],
      ["1–2 days", "In the air", "Direct or one stop"],
      ["+1–2 days", "Import customs", "Destination airport"],
      ["+1–2 days", "Your door", "DC or warehouse"],
    ],
  },
  road: {
    label: "Road",
    time: "14–20 days to Europe",
    u: ROAD_U,
    scene: RoadScene,
    bg: "bg-[linear-gradient(180deg,#f1f0ea_0%,#e7e9e1_60%,#dde3d8_100%)]",
    best: "Central Asia and Europe: faster than sea, without the price of air.",
    stops: [
      ["Day 0", "Factory", "Guangzhou"],
      ["Days 5–7", "Khorgos border", "China to Kazakhstan"],
      ["Days 7–14", "Overland", "Across Central Asia"],
      ["Days 12–16", "EU border", "Import customs"],
      ["Days 14–20", "Your door", "DC or warehouse"],
    ],
  },
};

const ORDER: Mode[] = ["sea", "air", "road"];
const LOOP = 7; // seconds per run of the route

/**
 * The Shipping page opening: pick sea, air or road and watch the order travel, drawn in the packing scenes'
 * isometric style. The scene loops while on screen (the swell or the road slides past, the plane takes off) and the
 * route underneath fills stop by stop in time with it. Reduced motion shows the scene still and the route complete.
 */
export function DeliveryRoute() {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("sea");
  const m = MODES[mode];
  const Scene = m.scene;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = ref.current!;
        const pauseOffscreen = { trigger: root, start: "top bottom", end: "bottom top", toggleActions: "play pause resume pause" } as const;

        // the world slides past: each [data-scroll] group moves one period and repeats seamlessly
        root.querySelectorAll<SVGGElement>("[data-scroll]").forEach((g) => {
          const period = Number(g.dataset.scroll);
          gsap.to(g, { ...travel(period, m.u), duration: mode === "sea" ? 5 : 0.9, ease: "none", repeat: -1, scrollTrigger: pauseOffscreen });
        });
        gsap.to("[data-bob]", mode === "sea" ? { y: -4, rotation: -0.6, transformOrigin: "50% 80%", duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut" } : { y: -1, duration: 0.12, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to("[data-drift]", { ...travel(6, m.u), duration: 8, ease: "none", repeat: -1, yoyo: true });

        // the route fills stop by stop; the plane's take-off rides the same clock
        const stops = gsap.utils.toArray<HTMLElement>("[data-stop]");
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, scrollTrigger: pauseOffscreen });
        tl.set(stops, { opacity: 0.5 }, 0)
          .fromTo("[data-fill]", { scaleX: 0 }, { scaleX: 1, duration: LOOP, ease: "none" }, 0)
          .fromTo("[data-fill-y]", { scaleY: 0 }, { scaleY: 1, duration: LOOP, ease: "none" }, 0);
        stops.forEach((s, i) => tl.to(s, { opacity: 1, duration: 0.3 }, (i / (stops.length - 1)) * LOOP - 0.15));
        if (mode === "air") {
          const u = m.u;
          tl.fromTo("[data-plane]", { x: 0, y: 0, rotation: 0 }, { x: 4 * Math.cos(Math.PI / 6) * u, y: 2 * u - 4 * u, rotation: -6, svgOrigin: "0 0", duration: 2.6, ease: "power2.in" }, 1.6)
            .fromTo("[data-shadow]", { opacity: 0.12, scale: 1 }, { opacity: 0.03, scale: 0.6, x: 4 * Math.cos(Math.PI / 6) * u, y: 2 * u, transformOrigin: "50% 50%", duration: 2.6, ease: "power2.in" }, 1.6)
            .to("[data-plane]", { y: "-=10", duration: LOOP - 4.2, ease: "sine.inOut" }, 4.2);
        }
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [mode], revertOnUpdate: true },
  );

  return (
    <div ref={ref} data-deco="band" className="bleed relative isolate mb-12 overflow-hidden bg-sky px-(--shell-pad) pt-10 pb-14 md:pt-14 md:pb-20">
      <div className="wrap">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
          <Link href="/" className="hover:text-ink hover:underline">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-ink">
            Shipping terms
          </span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <h1 className="font-headline text-[clamp(28px,3vw,40px)] leading-[1.08] font-semibold tracking-[-0.018em]">
            From our line <em className="font-medium text-brand">to your door.</em>
          </h1>
          <div role="group" aria-label="Freight mode" className="inline-flex rounded-full bg-white/80 p-1 shadow-[0_1px_2px_rgb(18_20_22/.08)] ring-1 ring-ink/8">
            {ORDER.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === mode}
                onClick={() => setMode(id)}
                className={clsx(
                  "min-h-11 rounded-full px-5 text-[14px] font-semibold transition-colors duration-200 sm:px-6",
                  id === mode ? "bg-ink text-white" : "text-ink-2 hover:text-ink",
                )}
              >
                {MODES[id].label}
                <span className="sr-only"> freight, {MODES[id].time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* the scene: the drawing first, the WebGL scene over it once it's ready */}
        <div className={clsx("relative mt-8 aspect-[4/3] overflow-hidden rounded-shell sm:aspect-[21/8] md:mt-10", m.bg)} aria-hidden="true">
          <div key={mode} className="absolute inset-0 grid place-items-center px-[4%] py-[3%] motion-safe:animate-[scene-in_.5s_ease-out]">
            <Scene />
          </div>
          <FreightCanvas mode={mode} />
          <p className="absolute top-4 left-4 rounded-full bg-white/85 px-3.5 py-1.5 text-[13px] font-semibold shadow-[0_1px_2px_rgb(18_20_22/.08)] sm:top-6 sm:left-6">
            {m.label} freight · <span className="text-brand">{m.time}</span>
          </p>
        </div>

        {/* the route: across on wide screens, down on phones */}
        <div className="relative mt-8 md:mt-10">
          <div aria-hidden="true" className="absolute top-[7px] bottom-[7px] left-[6px] w-0.5 rounded-full bg-ink/12 md:top-[6px] md:right-[10%] md:bottom-auto md:left-[10%] md:h-0.5 md:w-auto">
            <span data-fill-y className="absolute inset-0 origin-top rounded-full bg-brand md:hidden" />
            <span data-fill className="absolute inset-0 hidden origin-left rounded-full bg-brand md:block" />
          </div>
          <ol key={mode} className="relative grid gap-6 md:grid-cols-5 md:gap-4">
            {m.stops.map(([time, title, place]) => (
              <li key={title} data-stop className="flex gap-4 md:flex-col md:items-center md:gap-0 md:text-center">
                <span className="mt-0.5 size-3.5 flex-none rounded-full bg-brand ring-4 ring-white md:mt-0" />
                <span className="min-w-0 md:mt-4">
                  <span className="block text-[13px] font-semibold text-brand tabular-nums">{time}</span>
                  <span className="mt-0.5 block text-[16px] font-semibold">{title}</span>
                  <span className="block text-[14px] text-ink-2">{place}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p aria-live="polite" className="mt-8 max-w-[64ch] text-[16px] text-ink-2 md:mt-10">
          <b className="font-semibold text-ink">{m.label} freight.</b> {m.best} Times are indicative; your quote confirms them.
        </p>
      </div>
    </div>
  );
}
