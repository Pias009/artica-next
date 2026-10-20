"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { Pose } from "./tour";
import type { ShowroomApi } from "./scene";
import { tourStops } from "./tour";
import { prefersReducedMotion } from "@/lib/gsap";
import { getProduct } from "@/lib/products";
import { SHOWROOM } from "@/lib/showroom";
import { useUI } from "@/lib/store";

/** The area chips: where each one sits on the tour (index into tourStops). */
const AREAS = [
  { label: "Entrance", stop: 1 },
  { label: "Women · Boots", stop: 2 },
  { label: "Women · Shoes", stop: 4 },
  { label: "Kids", stop: 6 },
  { label: "Men", stop: 8 },
];

/** Standing outside the doorway, before walking in. */
const OUTSIDE: Pose = { x: 0, z: 2.6, yaw: 0, pitch: -0.04 };
/** How long the walk through the doors takes, in seconds. */
const WALK_S = 2.6;
/** Doors swing open, then the walk-through starts while they finish (ms). */
const DOORS_MS = 1300;
const THROUGH_AT = 700;

const isMobile = () => matchMedia("(pointer: coarse)").matches || innerWidth < 760;

type Status = "idle" | "loading" | "ready" | "fallback";
/** gate: the closed doors on the page · entering: full screen, loading and walking in · inside: walking the room */
type Phase = "gate" | "entering" | "inside";

/**
 * Signature moment: the client's 3D showroom behind a pair of glass doors. Nothing 3D loads until a visitor chooses
 * to walk in: "Enter the showroom" takes the page full screen, sets out the shoes behind the closed doors, then the
 * doors swing open and the camera walks through the doorway into the room, where it is theirs to explore. Tapping a
 * shoe opens the site's Quick View, so it can go on the real inquiry list. "Leave" (or Esc) comes back to the page.
 */
export function Showroom() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const api = useRef<ShowroomApi | null>(null);
  const stops = useRef(tourStops(false));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState<Phase>("gate");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [through, setThrough] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [area, setArea] = useState(0);
  const [touched, setTouched] = useState(false);
  const openQuickView = useUI((s) => s.openQuickView);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const clearLater = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Fetch the 3D code (not the room) once the section is near, so the doors open quickly.
  useEffect(() => {
    const el = stage.current!;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        void import("./scene");
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Render only while someone is in the room (or walking in) and the tab is visible.
  useEffect(() => {
    const sync = () => api.current?.setActive(phase !== "gate" && !document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [phase, status]);

  // Build the room on the first visit through the doors.
  const build = useCallback(async () => {
    if (api.current) return;
    setStatus("loading");
    try {
      const mobile = isMobile();
      stops.current = tourStops(mobile);
      await document.fonts.ready;
      const { createShowroom } = await import("./scene");
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
      api.current.jumpTo(OUTSIDE);
    } catch {
      // no WebGL (old device, blocked GPU): the gate shows the catalog link instead
      setStatus("fallback");
    }
  }, [openQuickView]);

  const enter = () => {
    if (status === "fallback") return;
    // must run inside the click: browsers only allow full screen from a user gesture
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    root.style.overflow = "hidden";
    setTouched(false);
    setPhase("entering");
    void build();
  };

  // Once the shoes are on the shelves (and on every later visit), open the doors and walk in.
  useEffect(() => {
    if (phase !== "entering" || status !== "ready" || !api.current) return;
    const a = api.current;
    const inside = stops.current[AREAS[0].stop].pose;
    a.jumpTo(OUTSIDE);
    a.setMode("free");
    if (prefersReducedMotion()) {
      a.jumpTo(inside);
      later(() => {
        setArea(0);
        setDoorsOpen(true);
        setThrough(true);
        setPhase("inside");
      }, 0);
      return clearLater;
    }
    later(() => {
      setArea(0);
      setDoorsOpen(true);
    }, 150);
    later(() => {
      setThrough(true);
      a.flyTo(inside, WALK_S);
    }, 150 + THROUGH_AT);
    later(() => setPhase("inside"), 150 + DOORS_MS + 900);
    return clearLater;
  }, [phase, status]);

  const leave = useCallback(() => {
    clearLater();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    document.documentElement.style.overflow = "";
    api.current?.setMode("tour");
    api.current?.jumpTo(OUTSIDE);
    setPhase("gate");
    setDoorsOpen(false);
    setThrough(false);
  }, []);

  // Leaving full screen from the browser (Esc, the system gesture) leaves the room too.
  useEffect(() => {
    if (phase === "gate") return;
    const onFs = () => !document.fullscreenElement && leave();
    document.addEventListener("fullscreenchange", onFs);
    // without full screen support (iPhone), Esc still leaves; an open dialog closes first
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && leave();
    addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      removeEventListener("keydown", onKey);
    };
  }, [phase, leave]);

  useEffect(
    () => () => {
      clearLater();
      document.documentElement.style.overflow = "";
      api.current?.dispose();
      api.current = null;
    },
    [],
  );

  const goTo = (i: number) => {
    api.current?.flyTo(stops.current[AREAS[i].stop].pose);
    setArea(i);
  };

  // keep the current area's chip in view on narrow screens (scrolls the row only, never the page)
  useEffect(() => {
    const row = chips.current;
    const el = row?.children[area] as HTMLElement | undefined;
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [area]);

  const open = phase !== "gate";
  const inside = phase === "inside";
  // from the click until the doors move: the button shows the shoes being set out
  const loadingNow = phase === "entering";
  const pct = status === "ready" ? 100 : Math.round(loaded * 100);

  return (
    <section id="showroom" aria-labelledby="h-showroom" className="bleed mt-sec h-svh min-h-[560px]">
      <div
        ref={stage}
        className={clsx(
          "w-full overflow-hidden bg-[#E9E4DA] select-none",
          open ? "fixed inset-0 z-[70] h-dvh" : "relative h-full",
        )}
      >
        {/* the room, as a photograph, until the 3D one is drawn over it */}
        <Image src="/showroom/poster.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <canvas
          ref={canvas}
          aria-label="3D showroom. Drag to look around, tap the floor to walk, tap a shoe to see its details."
          className={clsx("absolute inset-0 block size-full transition-opacity duration-500", status === "ready" && open ? "opacity-100" : "opacity-0")}
          style={{ touchAction: inside ? "none" : "pan-y" }}
        />

        {/* name tag while hovering a shoe (desktop) */}
        <div
          ref={tip}
          data-on="false"
          aria-hidden="true"
          className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-[130%] rounded-xl bg-white/90 px-3 py-2 text-[13px] font-semibold whitespace-nowrap opacity-0 shadow-float backdrop-blur-md transition-opacity duration-150 data-[on=true]:opacity-100 [&_em]:block [&_em]:text-[12px] [&_em]:font-medium [&_em]:text-muted [&_em]:not-italic"
        />

        {/* the gate: a plaster wall with a doorway; the doors open and the camera walks through */}
        {!inside && (
          <div aria-hidden={through} className="absolute inset-0 z-[4] grid place-items-center overflow-hidden">
            <div
              className={clsx(
                "relative flex flex-col items-center transition-[scale,opacity] ease-[cubic-bezier(.5,0,.2,1)]",
                through ? "scale-[4] opacity-0 duration-[1400ms]" : "scale-100 opacity-100 duration-500",
              )}
            >
              {/* sign over the door */}
              <p className="mb-5 text-center text-[11px] font-bold tracking-[0.32em] text-[#5b4e43] uppercase">Chime Long · FW26 showroom</p>

              {/* the doorway: transparent, so the room shows through; the wall round it is its own shadow */}
              <div
                className="relative h-[min(64svh,600px)] w-[min(82vw,460px)] rounded-t-[200px] shadow-[0_0_0_200vmax_#ece5da]"
                style={{ perspective: "1600px" }}
              >
                {/* bronze frame */}
                <span aria-hidden="true" className="pointer-events-none absolute -inset-3 z-[2] rounded-t-[212px] border-[12px] border-[#4a3f36] shadow-[inset_0_0_0_1px_rgb(255_255_255/.12),0_30px_60px_-30px_rgb(40_30_20/.5)]" />
                {/* two glass doors */}
                {(["left", "right"] as const).map((side) => (
                  <span
                    key={side}
                    aria-hidden="true"
                    className={clsx(
                      "absolute top-0 bottom-0 z-[1] w-1/2 border-[#4a3f36] bg-[linear-gradient(160deg,rgb(255_255_255/.55),rgb(255_255_255/.22)_45%,rgb(255_255_255/.38))] backdrop-blur-md transition-transform duration-[1300ms] ease-[cubic-bezier(.6,0,.2,1)]",
                      side === "left" ? "left-0 origin-left rounded-tl-[200px] border-r-[3px]" : "right-0 origin-right rounded-tr-[200px] border-l-[3px]",
                    )}
                    style={{ transform: doorsOpen ? `rotateY(${side === "left" ? -108 : 108}deg)` : "rotateY(0deg)" }}
                  >
                    {/* brass pull */}
                    <span className={clsx("absolute top-1/2 h-28 w-1.5 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#9c7b45,#e3c88d,#9c7b45)] shadow-[0_2px_6px_rgb(60_40_10/.35)]", side === "left" ? "right-4" : "left-4")} />
                    {/* etched name */}
                    <span className={clsx("absolute top-[38%] font-headline text-[22px] tracking-[0.18em] text-[#4a3f36]/55 italic", side === "left" ? "right-8" : "left-8")}>
                      {side === "left" ? "Chime" : "Long"}
                    </span>
                  </span>
                ))}

                {/* the way in */}
                {!doorsOpen && (
                  <div className="absolute inset-x-0 bottom-[14%] z-[3] flex justify-center px-4">
                    {status === "fallback" ? (
                      <div className="max-w-[300px] rounded-2xl bg-white/90 p-5 text-center shadow-float backdrop-blur-md">
                        <p className="text-[14.5px] text-ink-2">This device can&rsquo;t show the 3D room. Every style is in the catalog.</p>
                        <Link href="/catalog" className="btn btn-dark mt-4">
                          Open the catalog <Icon name="arrow" className="size-4" />
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={enter}
                        disabled={loadingNow}
                        aria-describedby="showroom-what"
                        className="group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full bg-ink pr-6 pl-2 text-[13px] font-bold tracking-[0.12em] text-white uppercase shadow-[0_18px_40px_-14px_rgb(18_20_22/.6)] transition-[background-color,translate] duration-300 ease-soft enabled:hover:-translate-y-0.5 enabled:hover:bg-brand"
                      >
                        {/* progress while the shoes are set out */}
                        {loadingNow && (
                          <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
                        )}
                        <span className="relative grid size-10 place-items-center rounded-full bg-white/15">
                          <Icon name={loadingNow ? "clock" : "arrow"} className="size-4" />
                        </span>
                        <span className="relative">{loadingNow ? `Opening the doors · ${pct}%` : "Enter the showroom"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p id="showroom-what" className="mt-6 max-w-[34ch] text-center text-[14px] text-[#5b4e43]">
                {SHOWROOM.length} styles on three walls and a centre table. Opens full screen.
              </p>
            </div>
          </div>
        )}

        {/* heading, on the wall beside the door */}
        {!open && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] px-(--shell-pad) pt-[clamp(92px,13vh,128px)] max-md:hidden">
            <div className="wrap">
              <h2 id="h-showroom" className="type-section max-w-[14ch]">
                Walk the FW26 showroom.
              </h2>
            </div>
          </div>
        )}

        {/* inside: leave, the areas, and a hint */}
        {inside && (
          <>
            <button type="button" onClick={leave} className="btn btn-dark absolute top-[calc(16px+env(safe-area-inset-top,0px))] right-4 z-[5] h-11! shadow-float">
              <Icon name="close" className="size-4" /> Leave showroom
            </button>
            <div className="absolute inset-x-0 bottom-0 z-[5] flex animate-rise-in flex-col items-center gap-3 px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] motion-reduce:animate-none">
              <p
                className={clsx(
                  "rounded-full bg-white/80 px-4 py-2 text-center text-[13px] font-medium text-ink-2 shadow-soft backdrop-blur-md transition-opacity duration-500",
                  touched && "pointer-events-none opacity-0",
                )}
              >
                <span className="[@media(pointer:coarse)]:hidden">Drag to look · click the floor to walk · W A S D to move · Esc to leave</span>
                <span className="hidden [@media(pointer:coarse)]:inline">Drag to look · tap the floor to walk · tap a shoe for details</span>
              </p>
              <nav aria-label="Showroom areas" className="max-w-full overflow-hidden rounded-full bg-white/80 p-1 shadow-soft backdrop-blur-md">
                <div ref={chips} className="no-scrollbar flex gap-0.5 overflow-x-auto">
                  {AREAS.map((a, i) => (
                    <button
                      key={a.label}
                      type="button"
                      aria-pressed={area === i}
                      onClick={() => goTo(i)}
                      className="h-10 flex-none rounded-full px-4 text-[13.5px] font-semibold whitespace-nowrap text-ink-2 transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-white"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </nav>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
