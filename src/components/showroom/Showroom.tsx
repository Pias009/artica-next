"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { ShowroomApi } from "./scene";
import { poseAt, tourStops } from "./tour";
import { prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { getProduct } from "@/lib/products";
import { SHOWROOM } from "@/lib/showroom";
import { useUI } from "@/lib/store";

/** The area chips: where each one sits on the tour (index into tourStops). */
const AREAS = [
  { label: "Entrance", stop: 0 },
  { label: "Women · Boots", stop: 2 },
  { label: "Women · Shoes", stop: 4 },
  { label: "Kids", stop: 6 },
  { label: "Men", stop: 8 },
];
/** Scroll length of the tour, in viewport heights per leg. */
const LEG_VH = 60;

const isMobile = () => matchMedia("(pointer: coarse)").matches || innerWidth < 760;
const areaAt = (t: number) => AREAS.reduce((best, a, i) => (a.stop <= t + 0.5 ? i : best), 0);

type Status = "idle" | "loading" | "ready" | "fallback";

/**
 * Signature moment: the client's 3D showroom. Scrolling walks the camera along each wall close enough to read the
 * shelves; "Explore freely" hands over first-person controls. Tapping a shoe opens the site's Quick View, so it can be
 * added to the real inquiry list. three.js only loads when the section is near, and only renders while on screen.
 */
export function Showroom() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const api = useRef<ShowroomApi | null>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const progress = useRef(0);
  const stops = useRef(tourStops(false));
  const visible = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [loaded, setLoaded] = useState(0);
  const [area, setArea] = useState(0);
  const [free, setFree] = useState(false);
  const [touched, setTouched] = useState(false);
  const openQuickView = useUI((s) => s.openQuickView);

  const setRendering = () => api.current?.setActive(visible.current && !document.hidden);

  // Load the 3D scene once the section is about a screen away.
  useEffect(() => {
    const el = stage.current!;
    let cancelled = false;
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setStatus("loading");
        try {
          const mobile = isMobile();
          stops.current = tourStops(mobile);
          await document.fonts.ready;
          const { createShowroom } = await import("./scene");
          if (cancelled) return;
          api.current = createShowroom(canvas.current!, {
            mobile,
            reduced: prefersReducedMotion(),
            font: getComputedStyle(document.body).fontFamily,
            tip: tip.current!,
            onProgress: (l, t) => setLoaded(l / t),
            onReady: () => setStatus("ready"),
            onPick: (slug) => {
              const p = getProduct(slug);
              if (p) openQuickView(p.id);
            },
            onInteract: () => setTouched(true),
          });
          api.current.setTourPose(poseAt(stops.current, progress.current));
          setRendering();
        } catch {
          // no WebGL (old device, blocked GPU): keep the poster and the catalog link
          if (!cancelled) setStatus("fallback");
        }
      },
      { rootMargin: "120% 0px" },
    );
    io.observe(el);

    // render only while on screen and the tab is visible
    const seen = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      setRendering();
    });
    seen.observe(el);
    document.addEventListener("visibilitychange", setRendering);

    return () => {
      cancelled = true;
      io.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", setRendering);
      api.current?.dispose();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll drives the tour: the stage pins and the camera walks from stop to stop.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return; // reduced motion: no pinned tour; the chips jump instead
      const seg = tourStops(false).length - 1;
      const st = ScrollTrigger.create({
        trigger: stage.current,
        start: "top top",
        end: `+=${seg * LEG_VH}%`,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          progress.current = self.progress;
          api.current?.setTourPose(poseAt(stops.current, self.progress));
          if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
          // the heading belongs to the entrance; it fades as the walk reaches the shelves
          if (heading.current) heading.current.style.opacity = String(Math.max(0, 1 - self.progress * seg * 0.9));
          setArea(areaAt(self.progress * seg));
        },
      });
      trigger.current = st;
      return () => {
        trigger.current = null;
      };
    },
    { scope: stage },
  );

  const goTo = (i: number) => {
    const stop = AREAS[i].stop;
    const pose = stops.current[stop].pose;
    if (free) {
      api.current?.flyTo(pose);
      setArea(i);
      return;
    }
    const st = trigger.current;
    if (!st) {
      // reduced motion: no scroll tour, so show that wall directly
      api.current?.setTourPose(pose);
      setArea(i);
      return;
    }
    const seg = stops.current.length - 1;
    window.scrollTo({ top: st.start + (stop / seg) * (st.end - st.start), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const enterFree = () => {
    const st = trigger.current;
    // line the stage up with the screen, then hold the page still while walking
    if (st) window.scrollTo({ top: st.start + progress.current * (st.end - st.start), behavior: "instant" });
    else stage.current?.scrollIntoView({ block: "start", behavior: "instant" });
    document.documentElement.style.overflow = "hidden";
    api.current?.setMode("free");
    setFree(true);
    setTouched(false);
  };
  const exitFree = () => {
    document.documentElement.style.overflow = "";
    api.current?.setMode("tour");
    if (!trigger.current) api.current?.setTourPose(stops.current[AREAS[area].stop].pose);
    setFree(false);
  };

  // keep the current area's chip in view on narrow screens (scrolls the row only, never the page)
  useEffect(() => {
    const row = chips.current;
    const el = row?.children[area] as HTMLElement | undefined;
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [area]);

  // Esc leaves free view (unless a dialog is open; it closes first). Never leave the page locked.
  useEffect(() => {
    if (!free) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && exitFree();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [free]);
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  const ready = status === "ready";

  return (
    <section id="showroom" aria-labelledby="h-showroom" className="bleed mt-sec">
      <div
        ref={stage}
        className={clsx("relative h-svh min-h-[560px] w-full overflow-hidden bg-[#E9E4DA] select-none", free && "z-40")}
      >
        <canvas
          ref={canvas}
          aria-label="3D showroom. Scroll to walk along the shelves, drag to look around, tap a shoe to see its details."
          className="absolute inset-0 block size-full"
          style={{ touchAction: free ? "none" : "pan-y" }}
        />

        {/* name tag while hovering a shoe (desktop) */}
        <div
          ref={tip}
          data-on="false"
          aria-hidden="true"
          className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-[130%] rounded-xl bg-white/90 px-3 py-2 text-[13px] font-semibold whitespace-nowrap opacity-0 shadow-float backdrop-blur-md transition-opacity duration-150 data-[on=true]:opacity-100 [&_em]:block [&_em]:text-[12px] [&_em]:font-medium [&_em]:text-muted [&_em]:not-italic"
        />

        {/* poster + progress until the shoes are on the shelves */}
        <div
          className={clsx(
            "absolute inset-0 z-[4] grid place-items-center transition-[opacity,visibility] duration-700 ease-soft",
            ready ? "invisible opacity-0" : "visible opacity-100",
          )}
        >
          <Image src="/showroom/poster.jpg" alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(246_243_236/.5),rgb(233_228_218/.85))]" />
          <div className="relative mx-4 max-w-[420px] rounded-shell bg-white/85 px-7 py-6 text-center shadow-float backdrop-blur-md">
            <p className="text-[clamp(24px,3vw,32px)] leading-tight font-semibold tracking-[-0.03em]">The FW26 showroom</p>
            {status === "fallback" ? (
              <>
                <p className="mt-2 text-[15px] text-ink-2">This device can&rsquo;t show the 3D room. Every style is in the catalog.</p>
                <Link href="/catalog" className="btn btn-dark mt-5">
                  Open the catalog <Icon name="arrow" className="size-4" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-[15px] text-ink-2">Setting out {SHOWROOM.length} styles on the shelves…</p>
                <span className="mx-auto mt-5 block h-1 w-48 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                  <span className="block h-full origin-left rounded-full bg-ink transition-transform duration-300" style={{ transform: `scaleX(${loaded})` }} />
                </span>
              </>
            )}
          </div>
        </div>

        {/* heading */}
        <div
          ref={heading}
          className={clsx(
            "pointer-events-none absolute inset-x-0 top-0 z-[2] bg-[linear-gradient(180deg,rgb(233_228_218/.92),rgb(233_228_218/0))] px-(--shell-pad) pt-[clamp(84px,11vh,112px)] pb-16",
            free && "invisible",
          )}
        >
          <div className="wrap">
            <h2 id="h-showroom" className="type-section max-w-[16ch]">
              Walk the FW26 showroom.
            </h2>
            <p className="mt-2 max-w-[42ch] text-[16px] text-ink-2 max-sm:hidden">
              {SHOWROOM.length} styles on three walls and a centre table. Scroll to walk the shelves, tap any pair for its details.
            </p>
          </div>
        </div>

        {/* exit free view */}
        {free && (
          <button type="button" onClick={exitFree} className="btn btn-dark absolute top-[calc(16px+env(safe-area-inset-top,0px))] right-4 z-[5] h-11! shadow-float">
            <Icon name="close" className="size-4" /> Exit free view
          </button>
        )}

        {/* bottom controls */}
        {/* on phones the tour controls sit above the site's floating inquiry button */}
        <div
          className={clsx(
            "absolute inset-x-0 bottom-0 z-[2] flex flex-col items-center gap-3 px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]",
            !free && "max-md:pb-[calc(84px+env(safe-area-inset-bottom,0px))]",
          )}
        >
          <p
            className={clsx(
              "rounded-full bg-white/80 px-4 py-2 text-center text-[13px] font-medium text-ink-2 shadow-soft backdrop-blur-md transition-opacity duration-500",
              (touched || !ready) && "pointer-events-none opacity-0",
            )}
          >
            {free ? "Drag to look · tap the floor to walk · W A S D to move · Esc to exit" : "Scroll to walk · drag to look around · tap a shoe for details"}
          </p>
          <div className="flex w-full max-w-full flex-wrap items-center justify-center gap-2">
            <nav aria-label="Showroom areas" className="relative max-w-full overflow-hidden rounded-full bg-white/80 p-1 shadow-soft backdrop-blur-md">
              <div ref={chips} className="no-scrollbar relative flex gap-0.5 overflow-x-auto">
                {AREAS.map((a, i) => (
                  <button
                    key={a.label}
                    type="button"
                    disabled={!ready}
                    aria-pressed={area === i}
                    onClick={() => goTo(i)}
                    className="h-10 flex-none rounded-full px-4 text-[13.5px] font-semibold whitespace-nowrap text-ink-2 transition-colors hover:text-ink disabled:opacity-50 aria-pressed:bg-ink aria-pressed:text-white"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {!free && (
                <span aria-hidden="true" className="absolute inset-x-5 bottom-0.5 h-0.5 overflow-hidden rounded-full">
                  <span ref={bar} className="block h-full origin-left bg-brand" style={{ transform: "scaleX(0)" }} />
                </span>
              )}
            </nav>
            {!free && (
              <button type="button" onClick={enterFree} disabled={!ready} className="btn btn-dark h-12! shadow-soft">
                <Icon name="zoom" className="size-4" /> Explore freely
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
