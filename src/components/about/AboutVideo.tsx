"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "../season/live";

/**
 * A short, silent factory clip: plays on its own while it's on screen and stops when it scrolls away. With reduced
 * motion it waits on its poster for the visitor to press play. Controls are always there.
 */
export function AboutVideo({ src, poster, label, className }: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [still]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      aria-label={label}
      className={className}
    />
  );
}
