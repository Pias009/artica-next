"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { Freight, FreightMode } from "./freight3d";

/**
 * The WebGL freight scene, loaded on its own after the page is up. It fades in over the drawn scene once its first
 * frame is ready; without WebGL it never appears and the drawing stays. Reduced motion gets one still frame.
 */
export function FreightCanvas({ mode }: { mode: FreightMode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const api = useRef<Freight | null>(null);
  const current = useRef(mode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let freight: Freight | null = null;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./freight3d").then(({ createFreight }) => {
      if (!alive || !ref.current) return;
      freight = createFreight(ref.current, { still, onFirstFrame: () => alive && setReady(true) });
      api.current = freight;
      freight?.set(current.current);
    });
    return () => {
      alive = false;
      api.current = null;
      freight?.destroy();
    };
  }, []);

  useEffect(() => {
    current.current = mode;
    api.current?.set(mode);
  }, [mode]);

  return <canvas ref={ref} aria-hidden="true" className={clsx("absolute inset-0 size-full transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")} />;
}
