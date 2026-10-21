import type { PointerEvent } from "react";
import { prefersReducedMotion } from "./gsap";

const TILT_VARS = ["--rx", "--ry", "--px", "--py", "--gx", "--gy"];

/**
 * Tilt a card toward the pointer by writing CSS variables on it: --rx/--ry (degrees to turn), --px/--py (pointer
 * offset from the centre, -0.5 to 0.5, for parallax) and --gx/--gy (pointer position, for a glare). Mouse only, and
 * nothing under reduced motion; pair with offTilt on pointer leave.
 */
export function onTilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--rx", `${(-py * 12).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(px * 14).toFixed(2)}deg`);
  el.style.setProperty("--px", px.toFixed(3));
  el.style.setProperty("--py", py.toFixed(3));
  el.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
  el.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
}

export function offTilt(e: PointerEvent<HTMLElement>) {
  for (const v of TILT_VARS) e.currentTarget.style.removeProperty(v);
}
