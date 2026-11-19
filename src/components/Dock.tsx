"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/*
 * The floating buttons, bottom right: the inquiry button, Kai and the season switch. They share one container
 * (FloatDock, in SiteChrome) so they line up as a unit: on desktop Kai and the season sit in a row above the inquiry
 * button; on tablets, phones and any touch screen all three share one row. There the row also gets out of the way:
 * it tucks below the screen while you scroll down and comes back as you scroll up, and stays tucked while an
 * important button (a form's submit, anything marked data-dock-avoid) or the footer is in the strip it would cover.
 */

/** Where the row is a single strip that tucks away: tablets and phones, and touch screens of any size. */
export const COMPACT_DOCK = "(max-width: 1023px), (pointer: coarse)";
/** The strip at the bottom of the screen the row covers, in px (its height plus breathing room). */
const BAND = 96;
const AVOID = "[data-dock-avoid], #footer, form button[type='submit']";

function onMedia(cb: () => void) {
  const m = matchMedia(COMPACT_DOCK);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
/** True where the floating buttons share one row (see COMPACT_DOCK). False on the server. */
export const useCompactDock = () => useSyncExternalStore(onMedia, () => matchMedia(COMPACT_DOCK).matches, () => false);

/** The container the floating buttons are portalled into. Server-rendered, so the slots exist from the first paint. */
export function FloatDock() {
  return (
    <div
      id="float-dock"
      className="pointer-events-none fixed right-[clamp(16px,3vw,32px)] bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-40 flex flex-col-reverse items-end gap-2.5 [&>*]:pointer-events-auto compact-dock:flex-row-reverse compact-dock:items-center"
    >
      <div id="dock-inquiry" className="empty:hidden" />
      <div className="pointer-events-none flex flex-row-reverse items-center gap-2.5 [&>*]:pointer-events-auto">
        <div id="dock-kai" className="empty:hidden" />
        <div id="dock-season" className="empty:hidden" />
      </div>
    </div>
  );
}

const noop = () => () => {};
/** Renders `children` into one of the dock's slots (nothing until the page has hydrated). */
export function InDock({ slot, children }: { slot: "inquiry" | "kai" | "season"; children: ReactNode }) {
  const el = useSyncExternalStore(
    noop,
    () => document.getElementById(`dock-${slot}`),
    () => null,
  );
  return el ? createPortal(children, el) : null;
}

/**
 * Tucks the row away (sets <html data-dock="tucked">, and <html data-scroll="down"> while scrolling down) while the visitor scrolls down or an important button sits in
 * the strip it covers. Only where the row is compact; a hold (<html data-dock-hold>: a menu open, the season welcome
 * card flying in) keeps it in place whatever the scroll does. The styling is in globals.css.
 */
export function DockState() {
  const pathname = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    const mq = matchMedia(COMPACT_DOCK);
    let lastY = window.scrollY;
    let travel = 0;
    let down = false;
    const covering = new Set<Element>();
    const apply = () => {
      // the scroll direction on its own, for other things that make room while reading (the catalog's toolbar)
      if (down) html.dataset.scroll = "down";
      else delete html.dataset.scroll;
      const tuck = mq.matches && (down || covering.size > 0);
      if (tuck) html.dataset.dock = "tucked";
      else delete html.dataset.dock;
    };

    // hide after a deliberate scroll down, show again on a small scroll up (or back near the top)
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (!dy) return;
      if (Math.sign(dy) !== Math.sign(travel)) travel = 0;
      travel += dy;
      if (y < 80) down = false;
      else if (travel > 48) down = true;
      else if (travel < -24) down = false;
      apply();
    };

    // anything that must not be covered, entering the bottom strip
    let io: IntersectionObserver | null = null;
    const watch = () => {
      io?.disconnect();
      covering.clear();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) covering.add(e.target);
            else covering.delete(e.target);
          }
          apply();
        },
        { rootMargin: `-${Math.max(0, window.innerHeight - BAND)}px 0px 0px 0px` },
      );
      document.querySelectorAll(AVOID).forEach((el) => io!.observe(el));
    };
    watch();
    // client sections mount a moment after navigation; look again once they have
    const late = setTimeout(watch, 800);
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(watch, 200);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", apply);
    apply();
    return () => {
      clearTimeout(late);
      clearTimeout(resizeTimer);
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", apply);
      delete html.dataset.dock;
      delete html.dataset.scroll;
    };
  }, [pathname]);
  return null;
}

/** Keeps the row on screen while `on` (a menu open from it, an animation flying into it). */
export function useDockHold(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const html = document.documentElement;
    const n = Number(html.dataset.dockHold ?? 0) + 1;
    html.dataset.dockHold = String(n);
    return () => {
      const left = Number(html.dataset.dockHold ?? 1) - 1;
      if (left > 0) html.dataset.dockHold = String(left);
      else delete html.dataset.dockHold;
    };
  }, [on]);
}
