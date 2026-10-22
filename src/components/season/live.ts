"use client";

import { useSyncExternalStore } from "react";
import { isSeason, type SeasonId } from "@/lib/season";

/*
 * What the season components share: the season on show (live, so a switch repaints without a reload), the visitor's
 * reduced-motion setting, and a way to start work once the page is idle (effects never compete with the first paint).
 */

const html = () => document.documentElement;

/** Calls back whenever <html data-season> changes (the theme script, the season menus). */
export function onSeason(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(html(), { attributes: true, attributeFilter: ["data-season"] });
  return () => mo.disconnect();
}
const readSeason = () => html().dataset.season ?? "";

/** The season the page is dressed in. Null on the server and during hydration. */
export function useShownSeason(): SeasonId | null {
  const s = useSyncExternalStore(onSeason, readSeason, () => "");
  return isSeason(s) ? s : null;
}

const REDUCE = "(prefers-reduced-motion: reduce)";
function onReduced(cb: () => void) {
  const m = matchMedia(REDUCE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
/** True on the server too, so nothing animates before the browser has said it may. */
export const useReducedMotion = () => useSyncExternalStore(onReduced, () => matchMedia(REDUCE).matches, () => true);

/** Runs `fn` when the browser is idle (at most `timeout` ms later). Returns a cancel. */
export function whenIdle(fn: () => void, timeout = 1200) {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 200);
  return () => clearTimeout(id);
}
