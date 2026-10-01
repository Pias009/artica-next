"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { AddButton } from "../product/AddButton";
import { QuickViewButton } from "../ui/QuickViewButton";
import { gsap, MOTION_OK, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { byId, img } from "@/lib/products";
import { useUI } from "@/lib/store";

const SLIDES = [
  { id: "p04", label: "Men", main: img("p04-men-leather-winter-lace-up-outer-view"), back: img("p05-leather-shearling-zip-boot-outer-view") },
  { id: "p02", label: "Women", main: img("p02-women-tall-suede-outer-view"), back: img("p01-women-suede-ankle-outer-view"), tall: true },
  { id: "p03", label: "Kids", main: img("p03-pink-patent-lace-up-outer-view"), back: img("p03-pink-patent-lace-up-zip-view") },
];

const CHIPS: [IconName, string, string][] = [
  ["truck", "Ships to US & Canada", "DDP, FOB or EXW"],
  ["sample", "Samples in 10 days", "Before your bulk order"],
  ["shield", "Every batch inspected", "Photo report included"],
];

const AUTOPLAY_MS = 5500;

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

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const [cur, setCur] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [stopped, setStopped] = useState(false); // user pressed pause
  const prev = useRef(0);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const reduced = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);
  const tabHidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);

  // Autoplay: user can stop it; it also rests on hover/focus, while the drawer is open,
  // in a background tab, and for reduced-motion users (WCAG 2.2.2 Pause, Stop, Hide).
  const autoplay = !stopped && !reduced;
  const playing = autoplay && !hovering && !drawerOpen && !tabHidden;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setCur((c) => (c + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [playing]);

  // Intro timeline + idle float.
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-line]", { yPercent: 110, duration: 1, stagger: 0.09 })
          .from("[data-fade]", { y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.25)
          .from('[data-slide="0"] [data-main]', { x: 90, rotation: 10, autoAlpha: 0, duration: 1.3 }, 0.1)
          .from('[data-slide="0"] [data-back]', { x: 40, rotation: 8, autoAlpha: 0, duration: 1.1 }, 0.3)
          .from('[data-slide="0"] [data-tag]', { y: 12, autoAlpha: 0, duration: 0.6 }, 0.8)
          .from("[data-chip]", { x: 30, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.45);

        gsap.to("[data-float]", { y: -10, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });

        // Boots follow the mouse slightly (±18px).
        const el = root.current!;
        const xTo = gsap.quickTo("[data-parallax]", "x", { duration: 0.8, ease: "power3.out" });
        const yTo = gsap.quickTo("[data-parallax]", "y", { duration: 0.8, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          const r = el.getBoundingClientRect();
          xTo(((e.clientX - r.left) / r.width - 0.5) * 36);
          yTo(((e.clientY - r.top) / r.height - 0.5) * 36);
        };
        const onLeave = () => {
          xTo(0);
          yTo(0);
        };
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });
    },
    { scope: root },
  );

  // Slide change.
  useGSAP(
    () => {
      const from = prev.current;
      if (from === cur) return;
      prev.current = cur;
      const slides = Array.from(root.current!.querySelectorAll<HTMLElement>("[data-slide]"));
      const out = slides[from];
      const inn = slides[cur];
      const q = gsap.utils.selector(inn);

      if (prefersReducedMotion()) {
        gsap.set(out, { autoAlpha: 0 });
        gsap.set(inn, { autoAlpha: 1 });
        return;
      }
      gsap
        .timeline({ defaults: { ease: "power3.out", overwrite: "auto" } })
        .to(out, { autoAlpha: 0, duration: 0.5 })
        .to(out.querySelector("[data-main]"), { x: -60, autoAlpha: 0, duration: 0.5 }, 0)
        .fromTo(inn, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.05)
        .fromTo(q("[data-main]"), { x: 90, rotation: 8, autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: 1.1 }, 0.1)
        .fromTo(q("[data-back]"), { x: 50, rotation: 10, autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 0.95, duration: 1 }, 0.2)
        .fromTo(q("[data-tag]"), { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 }, 0.45);
    },
    { dependencies: [cur], scope: root },
  );

  return (
    <section
      ref={root}
      id="hero"
      aria-label="Wholesale collection"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHovering(false)}
      className="bg-studio relative grid min-h-0 grid-cols-1 overflow-hidden rounded-shell text-ink md:grid-cols-2 lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_230px]"
    >
      {/* curved slab, echoes a plaza ramp */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[8%] -bottom-[38%] h-[78%] w-[78%] rounded-[50%_50%_0_0/70%_70%_0_0] bg-linear-to-b from-white/55 to-white/0 to-60%"
      />

      <div className="relative z-[2] flex flex-col justify-center gap-[20px] px-[22px] pt-7 md:p-[clamp(28px,4vw,52px)]">
        <div data-fade className="flex items-center gap-2.5">
          <span className="glass rounded-full px-3.5 py-1.5 mono-label text-studio-ink-2">
            FW26 · DIRECT ATELIER
          </span>
          <span className="mono-label text-[10px] text-muted tracking-widest hidden sm:inline">
            [ LAT 64°08&apos;N // SERIES 01 ]
          </span>
        </div>
        <h1 className="text-[clamp(34px,10.5vw,44px)] leading-[.96] font-extrabold tracking-[-.03em] text-balance uppercase sm:text-[clamp(38px,5vw,68px)]">
          {["Winter boots", "built for", "your shelves"].map((t, i) => (
            <span key={t} className="block overflow-hidden pb-[.04em]">
              <span data-line className={clsx("block", i > 0 && "text-studio-ink-2")}>
                {t}
              </span>
            </span>
          ))}
        </h1>
        <p data-fade className="max-w-[34ch] text-[15px] leading-relaxed text-studio-ink-2">
          Men, women and kids. From 300 pairs, packed 12 per case, shipped direct to the US and Canada.
        </p>

        {/* Quick line selector pills */}
        <div data-fade className="flex items-center gap-1 rounded-full border border-line/70 bg-surface/75 p-1 w-fit backdrop-blur-md">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCur(i)}
              className={clsx(
                "h-7 rounded-full px-3 text-xs font-bold transition-all",
                cur === i
                  ? "bg-accent text-on-accent shadow-[0_2px_8px_rgb(71_76_56/0.25)]"
                  : "text-ink-2 hover:text-ink hover:bg-chip",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div data-fade className="flex flex-wrap gap-2.5 pt-1">
          <OpenInquiryButton className="btn btn-dark">
            Request line sheet
            <span className="-mr-2 grid size-[26px] place-items-center rounded-full bg-white/15">
              <Icon name="arrow" className="size-3.5" />
            </span>
          </OpenInquiryButton>
          <Link href="/catalog" className="btn glass text-ink hover:bg-white/80">
            View catalog
          </Link>
        </div>
      </div>

      <div className="relative z-[1] min-h-[320px] md:min-h-[420px]" aria-live={autoplay ? "off" : "polite"}>
        <span aria-hidden="true" className="type-giant text-outline pointer-events-none absolute right-[4%] top-[12%] z-0 select-none text-[clamp(70px,13vw,160px)] opacity-35">
          ARTICA
        </span>
        <div className="absolute right-[10%] bottom-[10%] left-[14%] h-9 rounded-[50%] bg-[radial-gradient(closest-side,rgb(29_30_25/.22),transparent)] blur-[4px]" />
        <div data-parallax className="absolute inset-0">
        {SLIDES.map((s, i) => {
          const p = byId[s.id];
          return (
            <div
              key={s.id}
              data-slide={i}
              inert={i !== cur}
              className={clsx("absolute inset-0", i !== 0 && "invisible opacity-0")}
            >
              <div
                data-back
                className={clsx(
                  "absolute opacity-95",
                  s.tall ? "right-[4%] bottom-[18%] h-[44%] w-[46%] rotate-[8deg]" : "top-[10%] right-[2%] h-[44%] w-[40%] rotate-[8deg]",
                )}
              >
                <Image src={s.back} alt="" fill sizes="(max-width: 864px) 40vw, 240px" className="object-contain drop-shadow-[0_18px_16px_rgb(29_30_25/.2)]" />
              </div>
              <div
                data-main
                className={clsx(
                  "absolute",
                  s.tall ? "bottom-[10%] left-[10%] h-[84%] w-[52%] -rotate-3" : "bottom-[15%] left-[4%] h-[74%] w-[92%] -rotate-6",
                )}
              >
                <QuickViewButton id={p.id} data-float aria-label={`View details: ARTICA ${p.name}`} className="relative block size-full cursor-zoom-in">
                  <Image
                    src={s.main}
                    alt={p.desc}
                    fill
                    loading="eager"
                    fetchPriority={i === 0 ? "high" : "auto"}
                    sizes="(max-width: 864px) 90vw, 560px"
                    className="object-contain drop-shadow-hero"
                  />
                </QuickViewButton>
              </div>
              <div
                data-tag
                className="glass-card absolute top-[10%] left-[6%] z-[3] flex items-center gap-3 rounded-2xl py-2.5 pr-2.5 pl-4 shadow-soft"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="mono-label text-[9px] text-accent">SPEC.0{i + 1}</span>
                    <span className="text-line">•</span>
                    <span className="mono-label text-[9px] text-muted">{s.label}</span>
                  </div>
                  <QuickViewButton id={p.id} className="block text-left text-sm font-extrabold uppercase hover:text-accent">
                    ARTICA {p.name}
                  </QuickViewButton>
                  <span className="block text-[11px] font-medium text-studio-ink-2">12/case · MOQ 300 pr</span>
                </div>
                <AddButton id={p.id} className="relative size-8 bg-accent text-on-accent shadow-sm" />
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <aside className="relative z-[2] col-span-full flex flex-col gap-3 px-4 pb-10 md:flex-row md:items-center md:px-[clamp(20px,3vw,40px)] md:pb-11 lg:col-span-1 lg:flex-col lg:items-stretch lg:justify-between lg:py-7 lg:pr-6 lg:pl-0">
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:flex-1 md:px-0 lg:flex-col lg:overflow-visible">
          {CHIPS.map(([icon, title, sub]) => (
            <div key={title} data-chip className="glass-card flex min-w-[210px] snap-start items-start gap-3 rounded-card p-4 card-lift lg:min-w-0">
              <span className="grid size-9 flex-none place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon name={icon} className="size-4" />
              </span>
              <span>
                <b className="block text-[13px] leading-tight font-bold">{title}</b>
                <span className="mt-[3px] block text-[11.5px] text-studio-ink-2">{sub}</span>
              </span>
            </div>
          ))}
        </div>
        <div data-chip className="glass-card flex flex-none items-center gap-3 self-start rounded-full py-2.5 pr-4 pl-2.5 md:self-center lg:self-stretch">
          <span className="flex" aria-hidden="true">
            {["p04", "p01", "p03"].map((id, i) => (
              <i key={id} className={clsx("relative grid size-[34px] place-items-center overflow-hidden rounded-full border-2 border-white bg-photo shadow-xs", i && "-ml-2.5")}>
                <Image src={byId[id].outer.src} alt="" fill sizes="34px" className="object-contain p-0.5" />
              </i>
            ))}
          </span>
          <span>
            <b className="block text-[13px] font-extrabold tabular-nums">120+ retail partners</b>
            <span className="block text-[11px] text-studio-ink-2">68% reorder rate across NA</span>
          </span>
        </div>
      </aside>

      <div className="absolute bottom-2.5 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-1">
        <button
          type="button"
          onClick={() => setStopped((v) => !v)}
          aria-label={autoplay ? "Pause slideshow" : "Play slideshow"}
          className="hit-44 relative grid size-7 place-items-center rounded-full text-ink/70 transition-colors hover:bg-white/60 hover:text-ink"
        >
          <Icon name={autoplay ? "pause" : "play"} className="size-3.5" />
        </button>
        <div role="group" aria-label="Choose slide" className="flex">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === cur}
              aria-label={`Show slide ${i + 1} of ${SLIDES.length}: ${s.label}`}
              onClick={() => setCur(i)}
              className="group grid h-7 min-w-6 place-items-center px-2"
            >
              <span
                className={clsx(
                  "relative block h-1 overflow-hidden rounded-full bg-ink/20 transition-[width,background-color] duration-400 ease-soft",
                  i === cur ? "w-7" : "w-2 group-hover:bg-ink/40",
                )}
              >
                {i === cur && (
                  // Fills over one autoplay interval; restarts on every slide change.
                  <span
                    key={cur}
                    className="absolute inset-0 origin-left rounded-full bg-ink/70"
                    style={
                      autoplay
                        ? { animation: `dot-fill ${AUTOPLAY_MS}ms linear both`, animationPlayState: playing ? "running" : "paused" }
                        : undefined
                    }
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
