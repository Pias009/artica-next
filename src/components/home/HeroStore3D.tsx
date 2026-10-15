"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { HEADLINE, HeroStore, pick, PLUM_DEPTH } from "./HeroStore";
import type { HeroSceneApi, HeroShoe, PillarRect } from "./hero3d/scene";
import { prefersReducedMotion } from "@/lib/gsap";
import { inLine, LINE_LABEL, products, type ProductLine } from "@/lib/products";

const LINES: ProductLine[] = ["women", "kids", "men"];
const shot = (p: { outer: HeroShoe }): HeroShoe => ({ src: p.outer.src, w: p.outer.w, h: p.outer.h });

/**
 * First view in WebGL (hero3d/scene.ts): a curved showroom of arched, backlit niches on a mirrored marble floor, three
 * marble pillars carrying one pair per line. The headline, the action and the three ways in stay HTML over the
 * canvas (crisp, accessible, clickable); the labels are placed where the scene says the pillars land. Without WebGL
 * the CSS store hero takes over.
 */
export function HeroStore3D() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null);
  const api = useRef<HeroSceneApi | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [rects, setRects] = useState<PillarRect[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let visible = true;
    const setRendering = () => api.current?.setActive(visible && !document.hidden);

    (async () => {
      try {
        const { createHeroScene } = await import("./hero3d/scene");
        if (cancelled || !canvas.current) return;
        const heroes = LINES.map(pick);
        const heroIds = new Set(heroes.map((p) => p.id));
        api.current = createHeroScene(canvas.current, {
          wall: products.filter((p) => !heroIds.has(p.id)).map(shot),
          pillars: heroes.map(shot) as [HeroShoe, HeroShoe, HeroShoe],
          mobile: matchMedia("(max-width: 54rem)").matches,
          reduced: prefersReducedMotion(),
          onReady: () => setStatus("ready"),
          onLayout: setRects,
        });
        setRendering();
      } catch {
        // no WebGL (old device, blocked GPU): the CSS hero
        if (!cancelled) setStatus("fallback");
      }
    })();

    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      setRendering();
    });
    if (root.current) seen.observe(root.current);
    document.addEventListener("visibilitychange", setRendering);

    return () => {
      cancelled = true;
      seen.disconnect();
      document.removeEventListener("visibilitychange", setRendering);
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  if (status === "fallback") return <HeroStore />;

  return (
    <section
      ref={root}
      id="hero"
      aria-labelledby="hero-title"
      className="bleed relative isolate h-[calc(100svh-112px)] max-h-[960px] min-h-[640px] overflow-hidden bg-[linear-gradient(180deg,#f7f2ec_0%,#f1e8dd_60%,#ece6de_100%)] max-md:h-[calc((100svh-112px)*.7)] max-md:min-h-[448px]"
    >
      <canvas ref={canvas} aria-hidden="true" className={`absolute inset-0 size-full transition-opacity duration-700 ${status === "ready" ? "opacity-100" : "opacity-0"}`} />

      {/* headline and the one action */}
      <div className="pointer-events-none relative z-[2] flex flex-col items-center px-(--shell-pad) pt-[clamp(24px,7vh,72px)] text-center max-md:pt-[clamp(18px,3.4vh,32px)]">
        <h1
          id="hero-title"
          className="relative max-w-[20ch] animate-rise-in font-headline text-[clamp(34px,4.6vw,72px)] leading-[1.08] font-semibold tracking-[-0.015em] text-balance motion-reduce:animate-none max-md:leading-[0.98] max-md:tracking-[-0.025em]"
        >
          <span aria-hidden="true" className="absolute inset-0 text-[#8a3f76]" style={{ textShadow: PLUM_DEPTH }}>
            {HEADLINE}
          </span>
          <span className="relative block bg-[linear-gradient(180deg,#b0609a_0%,#984080_55%,#7e3369_100%)] bg-[length:100%_1.08em] bg-clip-text text-transparent max-md:bg-[length:100%_0.98em]">
            {HEADLINE}
          </span>
        </h1>
        <OpenInquiryButton className="btn pointer-events-auto mt-[clamp(18px,3.4vh,32px)] animate-rise-in bg-[#984080] text-white shadow-[0_3px_0_#6a2c59,0_14px_26px_-12px_rgb(110_45_95/.55)] transition-[background-color,box-shadow,translate] [animation-delay:90ms] hover:-translate-y-px hover:bg-[#87386f] active:translate-y-[2px] active:shadow-[0_1px_0_#6a2c59,0_8px_16px_-8px_rgb(110_45_95/.5)] motion-reduce:animate-none max-md:mt-3.5 max-md:h-10 max-md:gap-2 max-md:px-5 max-md:text-[14px]">
          Get wholesale pricing <Icon name="arrow" className="size-4" />
        </OpenInquiryButton>
      </div>

      {/* one way in per pillar: the pillar and its pair are the link, the label sits on the floor in front */}
      <nav aria-label="Shop by line" className="absolute inset-0 z-[2]">
        <ul>
          {LINES.map((line, i) => {
            const r = rects?.[i];
            return (
              <li key={line}>
                <Link
                  href={`/catalog?line=${line}`}
                  onPointerEnter={() => api.current?.setHover(i)}
                  onPointerLeave={() => api.current?.setHover(null)}
                  onFocus={() => api.current?.setHover(i)}
                  onBlur={() => api.current?.setHover(null)}
                  className={`group absolute flex flex-col items-center justify-end outline-offset-4 transition-opacity duration-700 ${r && status === "ready" ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  style={
                    r
                      ? { left: r.x - r.w / 2, top: r.top, width: r.w, height: r.bottom - r.top + 86, transitionDelay: `${1600 + i * 120}ms` }
                      : { visibility: "hidden" }
                  }
                >
                  <span className="font-headline text-[clamp(18px,1.9vw,28px)] leading-none font-semibold whitespace-nowrap text-[#3a2433]">{LINE_LABEL[line]}</span>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 whitespace-nowrap text-[clamp(13px,1.05vw,15px)] text-[#6f5a67] transition-colors group-hover:text-[#984080]">
                    {inLine(line).length} styles
                    <Icon name="arrow" className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
