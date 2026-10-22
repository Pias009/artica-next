"use client";

import { useEffect, useRef } from "react";
import { useEffectsOn } from "../effects";
import { useReducedMotion, useShownSeason, whenIdle } from "../live";
import type { World } from "./world";

/**
 * The season's 3D world behind every page (./world.ts): fixed, behind all content, never taking clicks. The engine
 * (three.js) is fetched only once the page is idle, so it costs nothing on the first paint; until its first frame the
 * CSS season gradient shows, then the world fades in over it. A white veil above it thickens as the page scrolls past
 * the hero (a CSS scroll-driven animation, globals.css), so the landscape is vivid up top and quiet behind the
 * words and the shoes further down. Reduced motion or "Season animations" off: a still view of the same world.
 */
export function SeasonWorld() {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const season = useShownSeason();
  const on = useEffectsOn();
  const reduced = useReducedMotion();
  const still = reduced || !on;
  const want = useRef({ season, still });

  useEffect(() => {
    want.current = { season, still };
    if (season) world.current?.set(season, still);
  }, [season, still]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let dead = false;
    const cancel = whenIdle(() => {
      import("./world").then(({ createWorld }) => {
        if (dead) return;
        world.current = createWorld(canvas, () => {
          canvas.dataset.ready = "";
          document.documentElement.dataset.world = "on";
        });
        const w = want.current;
        if (w.season) world.current?.set(w.season, w.still);
      });
    }, 1500);
    return () => {
      dead = true;
      cancel();
      world.current?.destroy();
      world.current = null;
      delete document.documentElement.dataset.world;
    };
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-[6] size-full opacity-0 transition-opacity duration-1000 ease-out data-ready:opacity-100"
      />
      <div aria-hidden="true" className="season-veil pointer-events-none fixed inset-0 -z-[5]" />
    </>
  );
}
