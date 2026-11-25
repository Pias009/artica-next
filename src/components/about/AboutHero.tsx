"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { useReducedMotion } from "../season/live";
import type { AboutPhoto } from "@/lib/about-photos";

/** Seconds each photo stays before the next fades in. */
const EVERY = 6;

/**
 * The About page's opening: the factory and the showroom full screen, edge to edge, one photo fading into the next
 * with a slow drift, the headline over them. Pauses on hover and from its own button (content that moves by itself
 * needs a way to stop it); with reduced motion it shows the first photo, still.
 */
export function AboutHero({ slides }: { slides: AboutPhoto[] }) {
  const [n, setN] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  // true on the server and the first paint, so nothing moves until the browser says motion is fine
  const still = useReducedMotion();

  const running = !paused && !held && !still && slides.length > 1;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setN((i) => (i + 1) % slides.length), EVERY * 1000);
    return () => clearInterval(t);
  }, [running, slides.length]);

  return (
    <section
      aria-labelledby="h-about"
      className="bleed relative isolate h-[calc(100svh-112px)] min-h-[560px] max-h-[1080px] overflow-hidden bg-ink text-white"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      {slides.map((p, i) => (
        <div
          key={p.slug}
          aria-hidden={i !== n}
          className={clsx("absolute inset-0 transition-opacity duration-[1400ms] ease-soft", i === n ? "opacity-100" : "opacity-0")}
        >
          <Image
            src={p.src}
            alt={i === n ? p.alt : ""}
            fill
            preload={i === 0}
            sizes="100vw"
            quality={80}
            className={clsx("object-cover", i === n && !still && "about-drift", !running && "[animation-play-state:paused]")}
          />
        </div>
      ))}
      {/* the words need a dark ground: from the left on wide screens, from the bottom on all */}
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgb(12_13_14/.72)_0%,rgb(12_13_14/.35)_48%,transparent_75%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(0deg,rgb(12_13_14/.78),transparent)]" />

      {/* on phones and tablets the floating buttons sit at the bottom: the content stops above them */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-(--shell-pad) pb-[clamp(28px,5vw,64px)] compact-dock:pb-[calc(116px+env(safe-area-inset-bottom,0px))]">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[14px] text-white/70">
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-white">
            About Chime Long
          </span>
        </nav>
        <p className="text-[12.5px] font-semibold tracking-[0.18em] text-white/75 uppercase">Specialist footwear engineering</p>
        <h1 id="h-about" className="mt-3 max-w-[16ch] font-headline text-[clamp(40px,6vw,86px)] leading-[0.98] font-semibold tracking-[-0.03em]">
          Wholesale footwear, <em className="font-normal">built to sell through.</em>
        </h1>
        <p className="mt-5 max-w-[46ch] text-[clamp(16px,1.4vw,19px)] leading-relaxed text-white/85">
          Boots that hold up in the weather and look right on the shelf, so fewer pairs come back. Made on our own floor, from cutting to carton.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/catalog" className="btn bg-white text-ink hover:bg-white/90">
            View current collection <Icon name="arrow" />
          </Link>
          <OpenInquiryButton className="btn text-white ring-1 ring-white/40 hover:bg-white/10">Book a showroom visit</OpenInquiryButton>
        </div>

        {/* which photo this is, each one a button; the bar fills while it shows */}
        <div className="mt-[clamp(28px,5vw,56px)] flex items-end gap-3">
          <ol className="grid flex-1 grid-cols-4 gap-x-3 gap-y-3 sm:gap-x-4" aria-label="Photos">
            {slides.map((p, i) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => setN(i)}
                  aria-current={i === n}
                  className="group block w-full text-left"
                >
                  <span className="block h-[3px] overflow-hidden rounded-full bg-white/25">
                    <span
                      key={`${n}-${running}`}
                      className={clsx("block h-full bg-white", i < n || (i === n && !running) ? "w-full" : i === n ? "about-progress" : "w-0")}
                      style={i === n && running ? { animationDuration: `${EVERY}s` } : undefined}
                    />
                  </span>
                  <span className={clsx("mt-2 block truncate text-[13px] transition-colors max-sm:sr-only", i === n ? "text-white" : "text-white/60 group-hover:text-white/85")}>
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> {p.caption}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {slides.length > 1 && !still && (
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-label={paused ? "Play the photos" : "Pause the photos"}
              className="grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-white/40 hover:bg-white/10"
            >
              <Icon name={paused ? "play" : "pause"} className="size-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
