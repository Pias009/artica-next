"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);
  watchPageHeight();
}

/**
 * ScrollTrigger only re-measures on window resize. When content above a pinned scene changes height after load
 * (a view switch, a tab, the inquiry chooser), its start/end go stale and the pin fires in the wrong place.
 * So watch the page height and refresh once it settles at a new value.
 */
function watchPageHeight() {
  const w = window as Window & { __stHeightWatch?: boolean };
  if (w.__stHeightWatch) return; // once per page, even across hot reloads
  w.__stHeightWatch = true;

  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const height = () => document.documentElement.scrollHeight;
  const observer = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (Math.abs(height() - last) < 2) return;
      ScrollTrigger.refresh();
      last = height();
    }, 150);
  });
  const start = () => {
    last = height();
    observer.observe(document.body);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, Flip, ScrollTrigger, useGSAP };
