"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AddButton } from "../product/AddButton";
import { ProductCard } from "../product/ProductCard";
import { useSeason } from "../season/SeasonContext";
import { Badge } from "../ui/Badge";
import { QuickViewButton } from "../ui/QuickViewButton";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { MotionToggle } from "../ui/MotionToggle";
import { collapse, inLine, LINE_LABEL, products, stylesIn, type ProductLine, type Scene } from "@/lib/products";
import { gsap, MOTION_OK, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { bySeason } from "@/lib/season-products";
import { useInCart, useInquiry } from "@/lib/store";
import { offTilt, onTilt } from "@/lib/tilt";
import { useAutoCycle } from "@/lib/useAutoCycle";

const TONE: Record<Scene, string> = { sage: "bg-sage", sand: "bg-sand", blush: "bg-blush", stone: "bg-stone" };
const AUTOPLAY_MS = 5200;
const pad = (n: number) => String(n).padStart(2, "0");

type View = "rows" | "list";
const LINES: ProductLine[] = ["men", "women", "kids"];

/**
 * Top reorders. Rows (default): one sliding row of product cards per line, each with "View all".
 * List: a featured stage that walks through the ranked list.
 */
export function BestSellers() {
  const season = useSeason();
  // one style per kind, the season's kinds first
  const list = useMemo(() => collapse(bySeason(products, season)), [season]);
  const ref = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>("rows");
  const [stopped, setStopped] = useState(false);
  const { index, setIndex, autoplay, playing } = useAutoCycle(ref, list.length, AUTOPLAY_MS, stopped || view === "rows");
  const p = list[index];
  const inCart = useInCart(p?.id ?? "");
  const toggle = useInquiry((s) => s.toggle);
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the active row centred inside the list's own scroll box (never scrolls the page).
  useEffect(() => {
    const ol = listRef.current;
    const li = ol?.children[index] as HTMLElement | undefined;
    if (!ol || !li) return;
    ol.scrollTo({ top: li.offsetTop - (ol.clientHeight - li.offsetHeight) / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [index, view]);

  return (
    <section ref={ref} id="styles" aria-labelledby="h-styles" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-styles"
        eyebrow="The range"
        title={
          <>
            The wholesale range, <em>by line.</em>
          </>
        }
        sub="Every style, line by line. Slide a row or open the whole line."
        right={
          <div className="flex items-center gap-5">
            {view === "list" && <MotionToggle stopped={stopped} onToggle={() => setStopped((v) => !v)} />}
            <ViewSwitch view={view} onChange={setView} />
            <Link href="/catalog">
              <ArrowLink>View all styles</ArrowLink>
            </Link>
          </div>
        }
      />

      {view === "rows" ? (
        <div className="grid gap-12 md:gap-14">
          {LINES.map((l, i) => (
            <LineRow key={l} line={l} from={i % 2 ? "right" : "left"} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          {/* featured stage: the boot does the talking */}
          <div className={clsx("relative isolate flex h-[440px] flex-col justify-between overflow-hidden rounded-shell p-6 transition-colors duration-700 ease-soft sm:h-[500px] lg:h-[560px] lg:p-8", TONE[p.scene])}>
            <QuickViewButton id={p.id} aria-label={`View details: Chime Long ${p.name}`} className="group absolute inset-0 z-[1] cursor-zoom-in">
              {list.map((x, i) => (
                <span
                  key={x.id}
                  className={clsx(
                    "absolute inset-[12%_10%_28%] transition-[opacity,translate,rotate]",
                    i === index ? "translate-x-0 rotate-0 opacity-100 duration-700 ease-soft" : "translate-x-[10%] rotate-6 opacity-0 duration-300 ease-in",
                  )}
                >
                  <span className="absolute inset-0 transition-transform duration-700 ease-soft group-hover:-translate-y-2 group-hover:scale-[1.03]">
                    <Image
                      src={x.outer.src}
                      alt={i === index ? x.desc : ""}
                      fill
                      sizes="(max-width: 1184px) 90vw, 680px"
                      className={clsx("-rotate-6 object-contain drop-shadow-hero transition-opacity duration-500", x.zip && "group-hover:opacity-0")}
                    />
                    {x.zip && (
                      <Image src={x.zip.src} alt="" fill sizes="(max-width: 1184px) 90vw, 680px" className="-rotate-6 object-contain opacity-0 drop-shadow-hero transition-opacity duration-500 group-hover:opacity-100" />
                    )}
                  </span>
                </span>
              ))}
            </QuickViewButton>

            <div className="pointer-events-none relative z-[2] flex items-start justify-between gap-3">
              <span className="text-[15px] font-semibold text-ink-2 tabular-nums">
                {pad(index + 1)} <span className="font-normal text-muted">/ {pad(list.length)}</span>
              </span>
              <Badge badge={p.badge} />
            </div>

            <div key={p.id} aria-live={autoplay ? "off" : "polite"} className="pointer-events-none relative z-[2] flex animate-rise-in flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="min-w-0">
                <h3 className="text-[clamp(26px,2.6vw,36px)] leading-tight font-semibold tracking-[-0.03em]">Chime Long {p.name}</h3>
                <p className="mt-1 text-[15px] text-ink-2">
                  {p.type} · {p.sizes}
                </p>
              </div>
              <div className="pointer-events-auto flex items-center gap-2">
                <button type="button" onClick={() => toggle(p.id)} aria-pressed={inCart} className="btn btn-dark">
                  <Icon name={inCart ? "check" : "plus"} className="size-4" />
                  {inCart ? "In inquiry list" : "Add to inquiry"}
                </button>
                <Link
                  href={`/products/${p.slug}`}
                  aria-label={`Full specs: Chime Long ${p.name}`}
                  className="grid size-12 place-items-center rounded-full bg-white text-ink transition-transform duration-300 ease-soft hover:translate-x-0.5"
                >
                  <Icon name="arrow" className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* ranked list: same height as the stage on desktop, scrolls inside */}
          <div className="flex flex-col lg:h-[560px]">
            <p className="mb-3 flex flex-none items-center justify-between text-[13px] text-muted">
              {list.length} style{list.length > 1 ? "s" : ""} · ranked by reorders
            </p>
            <ol
              ref={listRef}
              aria-label="Top reorders"
              className="relative grid max-h-[440px] min-h-0 auto-rows-max content-start gap-2 overflow-y-auto overscroll-contain pr-1.5 scrollbar-soft lg:max-h-none lg:flex-1"
            >
              {list.map((x, i) => (
                <RankRow key={x.id} p={x} rank={i + 1} on={i === index} onPick={() => setIndex(i)} progress={i === index && autoplay ? { running: playing, key: index } : null} />
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}

function RankRow({
  p,
  rank,
  on,
  onPick,
  progress,
}: {
  p: (typeof products)[number];
  rank: number;
  on: boolean;
  onPick: () => void;
  progress: { running: boolean; key: number } | null;
}) {
  const inCart = useInCart(p.id);
  return (
    <li className={clsx("relative overflow-hidden rounded-card transition-colors duration-300", on ? "bg-tile" : "hover:bg-tile/60")}>
      <button
        type="button"
        aria-pressed={on}
        onClick={onPick}
        className="grid w-full grid-cols-[32px_64px_minmax(0,1fr)] items-center gap-3 py-2.5 pr-16 pl-3 text-left"
      >
        <span className={clsx("text-[15px] font-semibold tabular-nums transition-colors", on ? "text-ink" : "text-muted")}>{pad(rank)}</span>
        <span className={clsx("relative size-16 overflow-hidden rounded-xl transition-colors duration-300", on ? "bg-white" : "bg-tile")}>
          <Image src={p.outer.src} alt="" fill sizes="64px" className={clsx("object-contain p-1.5 transition-transform duration-500 ease-soft", on && "scale-110 -rotate-3")} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-semibold tracking-[-0.01em]">Chime Long {p.name}</span>
          <span className="block truncate text-[15px] text-muted">
            {p.type} · {LINE_LABEL[p.line]}
          </span>
          {inCart && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold text-glacier">
              <Icon name="check" className="size-3" /> In your list
            </span>
          )}
        </span>
      </button>
      <AddButton id={p.id} className="absolute top-1/2 right-3 z-[1] size-10 -translate-y-1/2 shadow-soft" />
      {progress && (
        <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-ink/10">
          <span
            key={progress.key}
            className="block h-full origin-left rounded-full bg-ink"
            style={{ animation: `dot-fill ${AUTOPLAY_MS}ms linear both`, animationPlayState: progress.running ? "running" : "paused" }}
          />
        </span>
      )}
    </li>
  );
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div role="group" aria-label="Layout" className="flex flex-none gap-0.5 rounded-full bg-chip p-1">
      {(
        [
          ["rows", "grid", "Grid view"],
          ["list", "rows", "List view"],
        ] as const
      ).map(([v, icon, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          aria-label={label}
          title={label}
          onClick={() => onChange(v)}
          className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-soft"
        >
          <Icon name={icon} className="size-[18px]" />
        </button>
      ))}
    </div>
  );
}

/**
 * One line's styles in a sliding row, closed by a "View all" tile. As the row scrolls into view its cards swing open
 * toward you one after another like doors, hinged on the side they come from (rows alternate left and right), and the
 * row's title slides in from the same side; the motion follows the scroll. Each card tilts toward the pointer.
 */
function LineRow({ line, from }: { line: ProductLine; from: "left" | "right" }) {
  const styles = stylesIn(line);
  const label = LINE_LABEL[line];
  const row = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const s = from === "left" ? -1 : 1;
        const tl = gsap.timeline({
          scrollTrigger: { trigger: row.current, start: "top 92%", end: "top 25%", scrub: 1.1 },
        });
        tl.fromTo("[data-row-head]", { x: s * 70, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power3.out", duration: 0.6 }).fromTo(
          "[data-swing]",
          { rotateY: s * -68, x: s * 90, z: -120, autoAlpha: 0, transformOrigin: from === "left" ? "0% 50%" : "100% 50%" },
          { rotateY: 0, x: 0, z: 0, autoAlpha: 1, ease: "power3.out", duration: 0.8, stagger: 0.09 },
          0.1,
        );
      });
      return () => mm.revert();
    },
    { scope: row },
  );
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = track.current!;
    const measure = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const slide = (dir: 1 | -1) => {
    const el = document.getElementById(`track-${line}`)!;
    const card = el.querySelector("li");
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 300) + 20), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <section ref={row} aria-labelledby={`row-${line}`}>
      <div data-row-head className="mb-5 flex items-end justify-between gap-4">
        <h3 id={`row-${line}`} className="min-w-0 font-headline text-[clamp(26px,2.4vw,34px)] leading-none font-semibold tracking-[-0.015em]">
          {label}
          {/* the count sits beside the line name on wide screens and under it on phones, never broken mid-phrase */}
          <span className="mt-1.5 block font-sans text-[15px] font-normal tracking-normal whitespace-nowrap text-muted sm:mt-0 sm:ml-2.5 sm:inline sm:text-[15px]">
            {inLine(line).length} styles · {styles.length} {styles.length > 1 ? "categories" : "category"}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {!(edges.start && edges.end) &&
            ([-1, 1] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => slide(d)}
                disabled={d === -1 ? edges.start : edges.end}
                aria-label={d === -1 ? `Previous ${label.toLowerCase()} styles` : `More ${label.toLowerCase()} styles`}
                aria-controls={`track-${line}`}
                className="grid size-11 place-items-center rounded-full bg-chip transition-[background-color,opacity] hover:bg-chip-hover disabled:opacity-35"
              >
                <Icon name="arrow" className={clsx("size-4", d === -1 && "rotate-180")} />
              </button>
            ))}
          <Link href={`/catalog?line=${line}`} className="btn btn-line h-11 px-5 text-[15px]">
            View all {label.toLowerCase()}
          </Link>
        </div>
      </div>

      {/* card widths and the tile's height share the track width (cqw), so the tile lines up with the card photos */}
      <ul
        ref={track}
        id={`track-${line}`}
        className="no-scrollbar @container -mx-(--shell-pad) flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-(--shell-pad) px-(--shell-pad) pb-1 [perspective:1400px] lg:gap-5"
      >
        {styles.map((x) => (
          <li key={x.id} data-swing className="w-[72%] flex-none snap-start sm:w-[44%] md:w-[30%] lg:w-[19%]">
            <div
              onPointerMove={onTilt}
              onPointerLeave={offTilt}
              className="transition-transform duration-500 ease-soft [transform:perspective(1000px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] hover:duration-150"
            >
              <ProductCard p={x} sizes="(max-width: 864px) 72vw, 340px" />
            </div>
          </li>
        ))}
        {/* "View all": fills the rest of a short row, shrinks to a card when the row slides */}
        <li data-swing className="min-w-[72%] flex-1 snap-start sm:min-w-[44%] md:min-w-[30%] lg:min-w-[19%]">
          <Link
            href={`/catalog?line=${line}`}
            className="group relative flex h-[90cqw] flex-col justify-between overflow-hidden rounded-card bg-tile p-6 transition-colors hover:bg-chip-hover sm:h-[55cqw] md:h-[37.5cqw] lg:h-[23.75cqw]"
          >
            <span className="relative z-[2]">
              <span className="block text-[20px] leading-tight font-semibold tracking-[-0.02em]">View all {label.toLowerCase()}</span>
              <span className="mt-1 block text-[15px] text-muted">Every {label.toLowerCase()} style in the catalog</span>
            </span>
            <span aria-hidden="true" className="absolute inset-x-[6%] top-[30%] bottom-[18%] flex items-end justify-center gap-[3%]">
              {styles.map((x) => (
                <span key={x.id} className="relative h-full max-w-[260px] flex-1 transition-transform duration-700 ease-soft group-hover:-translate-y-2">
                  <Image src={x.outer.src} alt="" fill sizes="260px" className="object-contain object-bottom drop-shadow-boot" />
                </span>
              ))}
            </span>
            <span className="relative z-[2] grid size-11 place-items-center self-end rounded-full bg-ink text-white transition-transform duration-300 ease-soft group-hover:translate-x-1">
              <Icon name="arrow" className="size-4" />
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
