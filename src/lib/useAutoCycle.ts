"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const subscribeVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};

/**
 * Steps through `count` items on a timer. It only runs while `ref` is on screen, not under the
 * mouse or keyboard focus, the tab is visible, motion is allowed and the user hasn't stopped it
 * (WCAG 2.2.2 Pause, Stop, Hide). Picking an item by hand restarts the timer from that item.
 */
export function useAutoCycle(ref: RefObject<HTMLElement | null>, count: number, ms: number, stopped = false) {
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => true);
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const enter = (e: PointerEvent) => e.pointerType === "mouse" && setHeld(true);
    const leave = (e: PointerEvent) => e.pointerType === "mouse" && setHeld(false);
    const focusIn = () => setHeld(true);
    const focusOut = (e: FocusEvent) => !el.contains(e.relatedTarget as Node | null) && setHeld(false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    return () => {
      io.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
    };
  }, [ref]);

  const autoplay = !reduced && !stopped && count > 1;
  const playing = autoplay && inView && !held && !hidden;
  const cur = count ? index % count : 0;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), ms);
    return () => clearTimeout(t);
  }, [playing, cur, count, ms]);

  return { index: cur, setIndex, autoplay, playing };
}
