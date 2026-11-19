"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useKai } from "../assistant/kai";
import { InDock, useDockHold } from "../Dock";
import { Icon } from "../Icon";
import { EffectsToggle } from "./EffectsToggle";
import { onSeason, whenIdle } from "./live";
import { usePickSeason } from "./pickSeason";
import { useCountryName } from "./SeasonContext";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { isSeason, SEASON_COOKIE, SEASON_IDS, SEASONS, type SeasonId, type SeasonTheme } from "@/lib/season";
import { useUI } from "@/lib/store";

const read = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
/** The season on show (the theme script set it) and whether the visitor picked it by hand. */
const snapshot = () => `${document.documentElement.dataset.season ?? ""}|${read(SEASON_COOKIE.pick) ? "pick" : "auto"}`;

/** Set once the welcome card has been shown, so it greets each visitor one time. */
const INTRO_KEY = "cl-season-intro";
/** How long the page settles before the card drops in (after the browser goes idle), in ms. */
const INTRO_DELAY = 1100;
/** Seconds the card waits before folding itself away; hover or keyboard use holds it. */
const AUTO_FOLD = 9;

function introSeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true; // no storage: it would greet them on every page, so not at all
  }
}
function markSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {}
}

/** The dock's look: the season swatch, and its name from tablet up. The welcome card lands wearing exactly this. */
const PILL = "flex h-[54px] items-center gap-2 rounded-full bg-white p-1.5 shadow-fab ring-1 ring-ink/8 md:pr-4";
function DockFace({ season }: { season: SeasonTheme }) {
  return (
    <>
      <span data-season-swatch={season.id} className="bg-season-field grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-ink/10">
        <Icon name={season.icon} className="size-5! text-season" />
      </span>
      <span className="hidden text-[14px] font-semibold whitespace-nowrap text-ink md:inline">{season.name}</span>
    </>
  );
}

/**
 * The season switch, in the floating row beside Kai (components/Dock.tsx). On a visitor's first visit it arrives as a welcome card: the card drops
 * from the top to just above the middle, says the range is sorted by season, and offers the six. On "Show", a pick,
 * Escape, a click outside or after AUTO_FOLD seconds it folds into a strip, pinches to the dock's size and drops on an
 * arc into the corner, where it becomes the button. Reduced motion gets a plain fade. Later visits find the button already there.
 */
export function SeasonDock() {
  const uid = useId();
  const [shown, mode] = useSyncExternalStore(onSeason, snapshot, () => "|auto").split("|");
  const season = isSeason(shown) ? SEASONS[shown] : null;
  const country = useCountryName();
  const [pickSeason, pending] = usePickSeason();
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<"wait" | "intro" | "docked">("wait");
  const [arrival, setArrival] = useState<"rise" | "land">("rise");
  const [open, setOpen] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const dockBtn = useRef<HTMLButtonElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const timer = useRef<gsap.core.Tween | null>(null);
  const held = useRef(false);
  const folding = useRef(false);
  const focusOnLand = useRef(false);

  // first visit, nothing picked yet: greet once the page has settled, unless a drawer or the chat got there first
  useEffect(() => {
    if (introSeen() || read(SEASON_COOKIE.pick)) {
      const id = requestAnimationFrame(() => setPhase("docked"));
      return () => cancelAnimationFrame(id);
    }
    let t: ReturnType<typeof setTimeout> | undefined;
    const cancel = whenIdle(() => {
      t = setTimeout(() => {
        if (useUI.getState().drawerOpen || useKai.getState().open) return setPhase("docked");
        markSeen();
        setPhase("intro");
      }, INTRO_DELAY);
    }, 2500);
    return () => {
      cancel();
      clearTimeout(t);
    };
  }, []);

  // landed (and rendered visible): focus follows the card if it was in it, and a soft ring draws the eye to the dock
  useEffect(() => {
    if (phase !== "docked" || arrival !== "land") return;
    // a frame later, once the un-hidden dock has been styled
    const id = requestAnimationFrame(() => {
      if (focusOnLand.current) dockBtn.current?.focus({ preventScroll: true });
      focusOnLand.current = false;
    });
    const tween =
      ring.current && !prefersReducedMotion()
        ? gsap.fromTo(ring.current, { scale: 1, autoAlpha: 0.8 }, { scale: 1.45, autoAlpha: 0, duration: 1, repeat: 1, repeatDelay: 0.15, ease: "power2.out" })
        : null;
    return () => {
      cancelAnimationFrame(id);
      tween?.kill();
    };
  }, [phase, arrival]);

  const fold = () => {
    if (folding.current || !flyer.current || !card.current || !dockBtn.current) return;
    folding.current = true;
    timer.current?.kill();
    focusOnLand.current = flyer.current.contains(document.activeElement);    const done = () => {
      folding.current = false;
      setArrival("land");
      setPhase("docked");
    };

    if (prefersReducedMotion()) {
      gsap.to([scrim.current, flyer.current], { autoAlpha: 0, duration: 0.25, onComplete: done });
      return;
    }

    // measured now, so a resize or scroll since the drop doesn't matter
    const c = card.current.getBoundingClientRect();
    const d = dockBtn.current.getBoundingClientRect();
    const dx = d.left + d.width / 2 - (c.left + c.width / 2);
    const dy = d.top + d.height / 2 - (c.top + c.height / 2);
    const sx = d.width / c.width;
    const sy = d.height / c.height;
    const r = d.height / 2; // the pill's corner radius, written in the card's unscaled px so it stays round
    gsap.set(card.current, { borderRadius: "20px / 20px" });

    gsap
      .timeline({ onComplete: done })
      .to(content.current, { autoAlpha: 0, y: -8, duration: 0.2, ease: "power2.in" }, 0)
      .to(scrim.current, { autoAlpha: 0, duration: 0.7, ease: "power1.out" }, 0)
      // fold: top and bottom close in to a strip the dock's height
      .to(card.current, { scaleY: sy, borderRadius: `20px / ${r / sy}px`, duration: 0.42, ease: "power3.inOut" }, 0.12)
      // pinch: the strip draws in to the dock's width and takes on its face
      .to(card.current, { scaleX: sx, borderRadius: `${r / sx}px / ${r / sy}px`, duration: 0.36, ease: "power3.inOut" }, 0.46)
      .to(face.current, { autoAlpha: 1, duration: 0.14 }, 0.7)
      // drop: a small lift, then down into the corner on an arc, tipping as it goes
      .to(flyer.current, { x: dx, duration: 0.72, ease: "power2.inOut" }, 0.86)
      .to(flyer.current, { y: dy, duration: 0.72, ease: "back.in(1.7)" }, 0.86)
      .to(flyer.current, { rotation: 7, duration: 0.36, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.86)
      // land: squash, then spring back to shape
      .to(flyer.current, { scaleX: 1.1, scaleY: 0.84, duration: 0.09, ease: "power2.out" }, 1.58)
      .to(flyer.current, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1, 0.42)" }, 1.67);
  };

  // the floating row stays put while its menu is open or the welcome card is flying into it
  useDockHold(open || phase === "intro");

  // the drop-in, the countdown, and Escape to fold
  useGSAP(
    () => {
      if (phase !== "intro" || !flyer.current || !content.current) return;
      const reduced = prefersReducedMotion();
      // focus waits until the button is visible (a hidden one can't take it)
      const focus = () => primary.current?.focus({ preventScroll: true });
      if (reduced) {
        gsap.from([scrim.current, flyer.current], { autoAlpha: 0, duration: 0.3, onComplete: focus });
      } else {
        // dropped in from above the top edge, settling with a little give
        const box = flyer.current.getBoundingClientRect();
        gsap
          .timeline()
          .from(scrim.current, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, 0)
          .from(flyer.current, { y: -(box.bottom + 48), rotation: -5, duration: 0.95, ease: "back.out(1.2)" }, 0.05)
          .from(content.current.querySelectorAll("[data-rise]"), { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.06, ease: "power2.out" }, 0.5)
          .call(focus, undefined, 0.9);
      }
      timer.current = gsap.fromTo(
        bar.current,
        { scaleX: 1 },
        { scaleX: 0, duration: AUTO_FOLD, ease: "none", delay: reduced ? 0.3 : 1.1, onComplete: () => fold() },
      );
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && fold();
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    },
    { dependencies: [phase], scope: root },
  );

  // the dock's menu closes on Escape or a click elsewhere
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        setOpen(false);
        dockBtn.current?.focus();
      } else if (!dock.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!season) return null;

  const choose = (id: SeasonId | "auto") => {
    setBusy(id);
    pickSeason(id);
  };
  const loading = (id: string) => pending && busy === id;
  // a pick from the welcome card: let the theme repaint for a beat, then fold
  const chooseAndFold = (id: SeasonId) => {
    if (id !== shown) choose(id);
    setTimeout(fold, id === shown ? 0 : 320);
  };
  // hover holds the countdown; any keyboard use stops it for good (they're reading, or choosing)
  const hold = () => !held.current && timer.current?.pause();
  const release = () => !held.current && timer.current?.resume();
  const onCardKey = (e: ReactKeyboardEvent) => {
    held.current = true;
    timer.current?.pause();
    if (e.key !== "Tab" || !flyer.current) return;
    const items = [...flyer.current.querySelectorAll<HTMLElement>("button:not([tabindex='-1'])")];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };
  const where = country && mode === "auto" ? ` for ${country}` : "";

  return (
    <div ref={root}>
      {phase === "intro" && (
        <>
          <div ref={scrim} aria-hidden="true" onClick={() => fold()} className="fixed inset-0 z-[55] bg-ink/20 backdrop-blur-[2px]" />
          <div className="pointer-events-none fixed inset-0 z-[56] grid place-items-center px-4 pt-4 pb-[12vh]">
            <div
              ref={flyer}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${uid}-intro-title`}
              aria-describedby={`${uid}-intro-text`}
              onPointerEnter={hold}
              onPointerLeave={release}
              onKeyDown={onCardKey}
              className="pointer-events-auto relative w-full max-w-[420px]"
            >
              {/* the paper: folds, pinches and flies; the words sit on top and fade first */}
              <div ref={card} aria-hidden="true" className="absolute inset-0 rounded-shell bg-white shadow-[0_30px_80px_-24px_rgb(18_20_22/0.38)] ring-1 ring-ink/8" />

              <div ref={content} className="relative overflow-hidden rounded-shell p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span data-rise data-season-swatch={season.id} className="bg-season-field grid size-12 place-items-center rounded-full ring-1 ring-ink/10">
                    <Icon name={season.icon} className="size-6! text-season" />
                  </span>
                  <button type="button" onClick={() => fold()} aria-label="Close" className="-mt-2 -mr-2 grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-tile">
                    <Icon name="close" className="size-4!" />
                  </button>
                </div>

                <h2 data-rise id={`${uid}-intro-title`} className="mt-4 text-[24px] leading-[1.15] font-semibold tracking-[-0.01em] text-ink sm:text-[26px]">
                  Stock what sells <em className="font-serif font-normal whitespace-nowrap text-brand italic">this season.</em>
                </h2>
                <p data-rise id={`${uid}-intro-text`} className="mt-2.5 text-[15px] leading-relaxed text-pretty text-ink-2">
                  We put the styles your customers are buying right now up front. You&rsquo;re seeing the{" "}
                  <b className="font-semibold text-ink">{season.edit.toLowerCase()}</b>
                  {where}; pick another season for a different market.
                </p>

                <ul data-rise className="mt-5 grid grid-cols-3 gap-2" aria-label="Seasons">
                  {SEASON_IDS.map((id) => {
                    const t = SEASONS[id];
                    const on = id === shown;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          data-season-swatch={id}
                          aria-pressed={on}
                          onClick={() => chooseAndFold(id)}
                          className={clsx(
                            "bg-season-field flex min-h-[66px] w-full flex-col items-center justify-center gap-1 rounded-card px-1 text-center ring-1 transition-shadow",
                            on ? "ring-2 ring-ink" : "ring-ink/8 hover:ring-ink/30",
                          )}
                        >
                          <Icon name={t.icon} className="size-5! text-season" />
                          <span className="text-[12.5px] leading-tight font-semibold">{t.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <button data-rise ref={primary} type="button" onClick={() => fold()} className="btn btn-dark mt-5 w-full">
                  Show the {season.edit.toLowerCase()}
                  <Icon name="arrow" className="size-4!" />
                </button>
                <p data-rise className="mt-3 text-center text-[12.5px] text-muted">
                  Switch any time from the season button, bottom right.
                </p>

                {/* the countdown to folding away */}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/6">
                  <span ref={bar} className="block h-full origin-left bg-ink/35" />
                </span>
              </div>

              {/* the dock's face, worn by the card for the last stretch of the flight */}
              <div ref={face} aria-hidden="true" className={clsx(PILL, "invisible absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0")}>
                <DockFace season={season} />
              </div>
            </div>
          </div>
        </>
      )}

      <InDock slot="season">
        <div
          ref={dock}
          className={clsx(
            // in the floating row beside Kai (components/Dock.tsx). No transitions here: globals.css gives every
            // element a 0.01ms one under reduced motion, and on this wrapper that would tween `visibility`, leaving
            // the dock hidden (and unfocusable) as it lands
            "relative transition-none",
            phase !== "docked" && "invisible",
            phase === "docked" && arrival === "rise" && "animate-rise-in",
          )}
        >
          {open && (
            <div
              id={`${uid}-panel`}
              role="dialog"
              aria-labelledby={`${uid}-title`}
              className="fixed right-[clamp(16px,3vw,32px)] bottom-[calc(86px+env(safe-area-inset-bottom,0px))] w-[min(calc(100vw-32px),380px)] lg:bottom-[calc(150px+env(safe-area-inset-bottom,0px))] compact-dock:bottom-[calc(86px+env(safe-area-inset-bottom,0px))] animate-rise-in rounded-shell bg-white p-4 shadow-float ring-1 ring-ink/8"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`${uid}-title`} className="text-[16px] font-semibold">
                    Shop by season
                  </h2>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    Showing the <b className="font-semibold text-ink">{season.edit.toLowerCase()}</b>
                    {mode === "auto" ? ` (auto${where})` : " (picked)"}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-tile">
                  <Icon name="close" className="size-4!" />
                </button>
              </div>

              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SEASON_IDS.map((id) => {
                  const t = SEASONS[id];
                  const on = id === shown;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        data-season-swatch={id}
                        aria-pressed={on}
                        onClick={() => choose(id)}
                        className={clsx(
                          "bg-season-field flex min-h-[84px] w-full flex-col items-start justify-between rounded-card p-3 text-left ring-1 transition-shadow",
                          on ? "ring-2 ring-ink" : "ring-ink/8 hover:ring-ink/30",
                        )}
                      >
                        <Icon name={t.icon} className="size-5! text-season" />
                        <span className="text-[14px] font-semibold">{loading(id) ? "Loading…" : t.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => choose("auto")}
                className={clsx("mt-2 flex min-h-11 w-full items-center gap-2.5 rounded-card px-3 text-[14px] hover:bg-tile", mode === "auto" && "font-semibold")}
              >
                <Icon name="pin" className="size-4!" />
                <span className="flex-1 text-left">{loading("auto") ? "Loading…" : `Auto${country ? ` (${country})` : ", by location"}`}</span>
                {mode === "auto" && <Icon name="check" className="size-4! text-brand" />}
              </button>
              <EffectsToggle />
              <p className="mt-2 px-1 text-[12px] text-muted">Colours change at once; the products re-sort a moment later.</p>
            </div>
          )}

          <button
            ref={dockBtn}
            type="button"
            aria-expanded={open}
            aria-controls={`${uid}-panel`}
            tabIndex={phase === "docked" ? 0 : -1}
            onClick={() => setOpen((v) => !v)}
            className={clsx(PILL, "relative transition-[translate,box-shadow] duration-300 ease-soft hover:-translate-y-0.5")}
          >
            <span ref={ring} aria-hidden="true" data-season-swatch={season.id} className="pointer-events-none absolute inset-0 rounded-full border-2 border-current text-season opacity-0" />
            <DockFace season={season} />
            <span className="sr-only">{`, ${season.name} styles first. Change season`}</span>
          </button>
        </div>
      </InDock>
    </div>
  );
}
