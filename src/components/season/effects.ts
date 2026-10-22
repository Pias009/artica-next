"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the season scenes (snow, rain, leaves, birds…) move. On unless the visitor switched them off in the season
 * menu (WCAG 2.2.2: moving content can be paused); kept in localStorage, so it is this browser's choice only.
 */
const KEY = "cl-effects";
const EVENT = "cl-effects";

const read = () => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};

export function setEffects(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the change lasts until the page reloads
  }
  // the CSS decorations (sheen, drips, twinkling lights) pause on html[data-effects="off"]
  if (on) delete document.documentElement.dataset.effects;
  else document.documentElement.dataset.effects = "off";
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** False on the server and until hydration, so scenes only ever start in the browser. */
export const useEffectsOn = () => useSyncExternalStore(subscribe, read, () => false);
