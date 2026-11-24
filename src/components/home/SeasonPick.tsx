"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SeasonScene } from "./SeasonScene";
import { Icon } from "../Icon";
import { usePickSeason } from "../season/pickSeason";
import { useSeason } from "../season/SeasonContext";
import { SectionText } from "../ui/SectionText";
import { Txt } from "../ui/Txt";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { timingFor, type Timed } from "@/lib/planner";
import { products } from "@/lib/products";
import { inSeason, seasonPicks } from "@/lib/season-products";
import { SEASON_COOKIE, SEASONS, type SeasonId } from "@/lib/season";
import { useToday } from "@/lib/useToday";

const noop = () => () => {};
const cookieCountry = () => document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.country}=([A-Z]{2})`))?.[1] ?? "";
const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
/** All six, in the calendar's order, until the visitor's own timing is known (and on the server). */
const ALL: SeasonId[] = ["spring", "summer", "rainy", "autumn", "winter", "holiday"];

type Status = "best" | "on-time" | "tight" | "next-year" | "not-local";
type Card = { id: SeasonId; w: Timed | null; status: Status | null };

/**
 * Each season for the visitor's country: its next selling window still worth ordering for (else the next one at all),
 * and what that means for ordering now. Soonest first; seasons their climate doesn't have go last.
 */
function sixFor(windows: Timed[]): Card[] {
  const cards = ALL.map((id): Card => {
    const mine = windows.filter((w) => w.season === id);
    // the season's next window, whole (a later one can be cut short where the planner's horizon ends), for its months
    const next = mine[0] ?? null;
    if (!next) return { id, w: null, status: "not-local" };
    // too late for this one: what's left is next year's
    if (next.verdict === "late") return { id, w: next, status: "next-year" };
    return { id, w: next, status: next.verdict === "tight" ? "tight" : "on-time" };
  });
  const rank = (c: Card) => (c.status === "not-local" ? Infinity : c.status === "next-year" ? 1e15 + (c.w?.start.getTime() ?? 0) : (c.w?.start.getTime() ?? 0));
  cards.sort((a, b) => rank(a) - rank(b));
  // the season to order for now: the soonest one still on time
  const first = cards.find((c) => c.status === "on-time");
  if (first) first.status = "best";
  return cards;
}

/** Each season's styles: how many are in the catalogue and three to show, worked out once. */
const STYLES = Object.fromEntries(
  ALL.map((id) => [id, { count: products.filter((p) => inSeason(p, id)).length, picks: seasonPicks(id, 6) }]),
) as Record<SeasonId, { count: number; picks: ReturnType<typeof seasonPicks> }>;

const STATUS: Record<Status, { k: string; text: string; dot: string }> = {
  best: { k: "best", text: "Best to order now", dot: "bg-[#2f8f5b]" },
  "on-time": { k: "inTime", text: "In time to order", dot: "bg-[#2f8f5b]" },
  tight: { k: "soon", text: "Order soon", dot: "bg-[#c27c0e]" },
  "next-year": { k: "nextYear", text: "Plan for next year", dot: "bg-ink/35" },
  "not-local": { k: "notLocal", text: "Not a local season", dot: "bg-ink/20" },
};

/**
 * Straight after the hero, on plain white: one question, which season the buyer is selling in, and a card for each of
 * the six seasons to answer it. Each card says what ordering now means in the visitor's country, when that season
 * sells there, what sells in it and how many styles it has, over a moving scene of its weather and shoes. The headline reads itself in word by
 * word; the cards rise in after it. Choosing one switches the whole home page to that season's styles. Every word is
 * editable in the admin panel (Pages → Home → Choose your season).
 */
export function SeasonPick() {
  const today = useToday();
  const code = useSyncExternalStore(noop, cookieCountry, () => "");
  const shown = useSeason();
  const [pick, pending] = usePickSeason();
  const [chosen, setChosen] = useState<SeasonId | null>(null);
  const ref = useRef<HTMLElement>(null);

  // the scenes move only while the section is on screen
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: "120px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cards: Card[] = today ? sixFor(timingFor(code || "US", today, false).windows) : ALL.map((id) => ({ id, w: null, status: null }));
  const active = chosen ?? shown;

  // the headline, label and line arrive like every section's (HomeReveal: the words rise out of a mask); the cards
  // follow, one after another
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-pick-card]", {
          y: 36,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: "[data-pick-cards]", start: "top 85%", once: true },
        });
      });
    },
    { scope: ref },
  );

  const choose = (id: SeasonId) => {
    setChosen(id);
    pick(id);
    // bring the season's styles into view once they've loaded
    setTimeout(
      () => document.getElementById("season-edit")?.scrollIntoView({ behavior: matchMedia(MOTION_OK).matches ? "smooth" : "auto", block: "start" }),
      450,
    );
  };

  return (
    <section ref={ref} id="season-pick" aria-labelledby="h-pick" className="bleed mt-sec scroll-mt-24 bg-white px-(--shell-pad) py-[clamp(56px,8vw,112px)]">
      <div className="wrap">
        <div className="mx-auto max-w-[760px] text-center">
          <Txt as="p" k="eyebrow" label="Small label above" className="eyebrow justify-center">
            Plan ahead
          </Txt>
          <SectionText as="h2" part="title" id="h-pick" className="type-section mt-4">
            Which season are you <em>selling?</em>
          </SectionText>
          <SectionText part="sub" className="mx-auto mt-4 max-w-[44ch] text-[17px] text-ink-2">
            Pick one and we&apos;ll show you the styles that sell then.
          </SectionText>
        </div>

        {/* three across on wide screens, two on tablets; on phones a row to swipe, so six cards don't stack six deep */}
        <div
          data-pick-cards
          data-live={live || undefined}
          role="radiogroup"
          aria-label="Season you're selling"
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 max-sm:-mx-(--shell-pad) max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:scroll-px-(--shell-pad) max-sm:px-(--shell-pad) max-sm:pb-3 max-sm:[scrollbar-width:none]"
        >
          {cards.map(({ id, w, status }, i) => {
            const on = active === id;
            const season = SEASONS[id];
            const styles = STYLES[id];
            const s = status ? STATUS[status] : null;
            return (
              // the entrance moves this wrapper; the card's own hover lift stays a CSS transition, so the two never fight
              <div key={id} data-pick-card className="flex max-sm:w-[84%] max-sm:shrink-0 max-sm:snap-start">
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(id)}
                  className={clsx(
                    "group relative flex w-full flex-col overflow-hidden rounded-[22px] bg-white text-left transition-[box-shadow,transform] duration-500 ease-soft hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
                    on
                      ? "shadow-[0_0_0_2px_var(--color-ink),0_24px_48px_-24px_rgb(18_20_22/.45)]"
                      : "shadow-[0_0_0_1px_rgb(18_20_22/.08)] hover:shadow-[0_0_0_1px_rgb(18_20_22/.14),0_24px_48px_-28px_rgb(18_20_22/.4)]",
                  )}
                >
                  {/* the season's own sky and weather, moving, with its shoes riding a shelf line along the bottom */}
                  <span className="relative block">
                    <SeasonScene id={id} picks={styles.picks} index={i} />
                    {s && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink shadow-soft">
                        <span aria-hidden="true" className={clsx("size-2 rounded-full", s.dot)} />
                        <Txt k={s.k} label={`Card status: ${s.text}`}>
                          {s.text}
                        </Txt>
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={clsx("absolute top-3 right-3 grid size-7 place-items-center rounded-full transition-colors", on ? "bg-ink text-white" : "bg-white/80 text-transparent ring-1 ring-ink/10")}
                    >
                      <Icon name="check" className="size-4" />
                    </span>
                    <span className="absolute inset-x-4 top-[46px] text-ink sm:inset-x-5">
                      <span className="flex items-center gap-2">
                        <Icon name={season.icon} className="size-5!" />
                        <span className="font-headline text-[clamp(22px,2.1vw,28px)] leading-none font-semibold">{season.name}</span>
                      </span>
                      <span className="mt-1.5 block text-[13px] text-ink-2">
                        {w && status !== "not-local" ? `Sells ${month(w.start)} – ${month(w.end)} in your market` : season.edit}
                      </span>
                    </span>
                  </span>
                  {/* the season's own colours, a thin strip under the photo */}
                  <span aria-hidden="true" className="block h-1" style={{ background: `linear-gradient(90deg, ${season.tints[0]}, ${season.tints[1]}, ${season.tints[2]})` }} />

                  <span className="flex flex-1 flex-col p-4 sm:p-5">
                    <span className="line-clamp-2 text-[14px] leading-relaxed text-ink-2">{season.line}</span>
                    <span className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <span className="text-[13px] text-muted tabular-nums">
                        {styles.count}{" "}
                        <Txt k="styles" label="After the number of styles">
                          styles
                        </Txt>
                      </span>
                      <span className={clsx("inline-flex items-center gap-1 text-[14px] font-semibold transition-colors", on ? "text-ink" : "text-brand")}>
                        {on ? (
                          <Txt k="selected" label="Card once chosen">
                            Selected
                          </Txt>
                        ) : (
                          <Txt k="choose" label="Card link">
                            Choose
                          </Txt>
                        )}
                        {!on && <Icon name="arrow" className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />}
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[13px] text-muted" role="status">
          {pending ? (
            <Txt k="loading" label="While the styles load">
              Loading the season&apos;s styles…
            </Txt>
          ) : (
            <Txt k="note" label="Small note under the cards">
              You can change it any time from the top of the page.
            </Txt>
          )}
        </p>
      </div>
    </section>
  );
}
