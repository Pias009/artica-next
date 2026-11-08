"use client";

import clsx from "clsx";
import { useMemo, useRef, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { onSeason, useShownSeason } from "../season/live";
import { usePickSeason } from "../season/pickSeason";
import { useCountryName } from "../season/SeasonContext";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { Txt, useTxt } from "../ui/Txt";
import { fmtDate, LEAD_DAYS, SHELF_DAYS } from "@/lib/buyer-desk";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { SEASON_COOKIE, SEASON_DATA, SEASON_IDS, SEASONS, seasonOf, type SeasonId } from "@/lib/season";
import { useToday } from "@/lib/useToday";

/** Confirming bulk to the boots standing on the buyer's shelf: production, delivery, then a week to unpack. */
const LEAD = LEAD_DAYS.bulk + LEAD_DAYS.delivery + SHELF_DAYS;
const WEEKS = Math.round(LEAD / 7);
/** Under this many days to a season's order date, its card says so. */
const SOON_DAYS = 30;
const STATEMENT = `Pairs you confirm today reach your shelves in about ${WEEKS} weeks. So stock for the season your customers will walk in with, *not the weather outside today.*`;

type Stop = { label: string; date?: Date; sub?: string; strong?: boolean };

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/* ---- Where the visitor is (the proxy's country cookie, else the browser's time zone) ---- */

const noop = () => () => {};
function readCountry() {
  const cookie = document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.country}=([^;]*)`))?.[1];
  if (cookie) return cookie;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const prefix = Object.keys(SEASON_DATA.zonePrefixes).find((p) => zone.startsWith(p));
  return SEASON_DATA.zones[zone] || (prefix ? SEASON_DATA.zonePrefixes[prefix] : "");
}
const regions = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const regionName = (code: string) => {
  try {
    return code ? (regions?.of(code) ?? "") : "";
  } catch {
    return "";
  }
};
const readPicked = () => (document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.pick}=([^;]*)`)) ? "1" : "");

/* ---- Each season's timing, worked out from today and the lead time ---- */

type Plan = {
  id: SeasonId;
  /** open: still time to have it on the shelf for day one. late: stock would land mid-season. away: not a season here. */
  status: "open" | "late" | "away";
  /** The next start you can still make, and the day to confirm bulk for it. */
  orderBy?: Date;
  starts?: Date;
  daysLeft?: number;
  /** Late: weeks of the season left when the boots land. */
  weeksLeft?: number;
};

function planSeasons(country: string, today: Date) {
  const at = (d: Date) => seasonOf(country, d, SEASON_DATA);
  const arrival = addDays(today, LEAD);
  const plans = SEASON_IDS.map((id): Plan => {
    // the first start of this season that's at least the lead time away
    let starts: Date | undefined;
    for (let i = LEAD; i <= LEAD + 400; i++) {
      const d = addDays(today, i);
      if (at(d) === id && at(addDays(d, -1)) !== id) {
        starts = d;
        break;
      }
    }
    const orderBy = starts && addDays(starts, -LEAD);
    const daysLeft = orderBy && Math.round((orderBy.getTime() - today.getTime()) / 86_400_000);
    if (at(arrival) === id && daysLeft !== 0) {
      let n = 0;
      while (n < 400 && at(addDays(arrival, n)) === id) n++;
      return { id, status: "late", orderBy, starts, daysLeft, weeksLeft: Math.max(1, Math.floor(n / 7)) };
    }
    return starts ? { id, status: "open", orderBy, starts, daysLeft } : { id, status: "away" };
  });
  // the soonest deadline that can still be met is the one to act on
  const best = plans.filter((p) => p.status === "open").sort((a, b) => a.daysLeft! - b.daysLeft!)[0]?.id;
  return { plans, best, arrival, landsIn: at(arrival) };
}

/** A sentence whose *starred* words are set in the plum italic, as one span per word for the read-along. */
function Words({ text }: { text: string }) {
  let accent = false;
  return text.split(/\s+/).map((raw, i) => {
    const opens = raw.startsWith("*");
    const closes = raw.endsWith("*") && (raw.length > 1 || !opens);
    if (opens) accent = true;
    const word = raw.replace(/^\*|\*$/g, "");
    const on = accent;
    if (closes) accent = false;
    return (
      <span key={i} data-word className={clsx(on && "font-medium text-brand italic")}>
        {word}{" "}
      </span>
    );
  });
}

/**
 * Straight after the hero: the question every buyer has to answer first, with the reason it matters. Pairs confirmed
 * today reach the shelf about ten weeks out, so the season to stock is the one that will be on by then. The statement
 * reads itself in as you scroll, the timeline lays out today's dates, and each season card shows its real order-by
 * date. Picking one dresses the whole site for that season (usePickSeason), so every product section re-sorts for it.
 */
export function SeasonTarget() {
  const root = useRef<HTMLElement>(null);
  const today = useToday();
  const country = useSyncExternalStore(noop, readCountry, () => "");
  const place = useCountryName() || regionName(country);
  const shown = useShownSeason();
  const picked = useSyncExternalStore(onSeason, readPicked, () => "") === "1";
  const [pickSeason, pending] = usePickSeason();
  const t = useMemo(() => (today ? planSeasons(country, today) : null), [today, country]);
  const statement = useTxt("statement", STATEMENT);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const el = root.current!;
        // the statement lights up word by word, tied to the scroll so it reads at the visitor's own pace
        gsap.fromTo(
          el.querySelectorAll("[data-word]"),
          { opacity: 0.16 },
          { opacity: 1, ease: "none", stagger: 0.1, scrollTrigger: { trigger: el.querySelector("[data-statement]"), start: "top 82%", end: "bottom 50%", scrub: 0.8 } },
        );
        // the timeline draws down, its stops arrive in order
        gsap
          .timeline({ scrollTrigger: { trigger: el.querySelector("[data-timeline]"), start: "top 78%", once: true } })
          .from(el.querySelector("[data-rail]"), { scaleY: 0, transformOrigin: "top", duration: 1.1, ease: "power2.inOut" })
          .from(el.querySelectorAll("[data-stop]"), { x: -14, autoAlpha: 0, duration: 0.55, ease: "power3.out", stagger: 0.16 }, 0.15)
          .from(el.querySelectorAll("[data-lands]"), { y: 12, autoAlpha: 0, duration: 0.6, ease: "power3.out" }, ">-0.1");
        // the cards rise in, a beat apart
        gsap.from(el.querySelectorAll("[data-card]"), {
          y: 28,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.07,
          scrollTrigger: { trigger: el.querySelector("[data-cards]"), start: "top 82%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [statement], revertOnUpdate: true },
  );

  const stops: Stop[] = today
    ? [
        { label: "You confirm the order", date: today, sub: "Today" },
        { label: "Leaves the factory", date: addDays(today, LEAD_DAYS.bulk) },
        { label: "Lands at your door", date: addDays(today, LEAD_DAYS.bulk + LEAD_DAYS.delivery) },
        { label: "On your shelves", date: t!.arrival, strong: true },
      ]
    : [{ label: "You confirm the order" }, { label: "Leaves the factory" }, { label: "Lands at your door" }, { label: "On your shelves", strong: true }];
  const lands = t && SEASONS[t.landsIn];
  const landsPlan = t?.plans.find((p) => p.id === t.landsIn);
  const bestTheme = t?.best ? SEASONS[t.best] : null;

  return (
    <section ref={root} id="season-target" aria-labelledby="h-target" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-target"
        title={
          <>
            Which season are you <em>stocking for?</em>
          </>
        }
        sub="Pick one and the whole site lines up its styles for it."
      />

      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
        {/* the reason, said once and big */}
        <p
          data-statement
          className="max-w-[22ch] font-headline text-[clamp(28px,3.1vw,46px)] leading-[1.18] font-semibold tracking-[-0.02em] text-ink sm:max-w-[24ch]"
          data-copy="season-target.statement"
          data-default={STATEMENT.replace(/\*/g, "")}
          data-label="Big statement (*stars* = purple italic)"
        >
          <Words text={statement} />
        </p>

        {/* today's dates, worked forward */}
        <div data-timeline className="rounded-shell bg-season-field p-6 sm:p-8" data-deco="band">
          <Txt as="p" k="timeline" label="Timeline heading" className="text-[14px] font-semibold text-ink">
            If you confirm today
          </Txt>
          <ol className="relative mt-5 grid gap-5 pl-7">
            <span data-rail aria-hidden="true" className="absolute top-2 bottom-2 left-[7px] w-px bg-ink/20" />
            {stops.map((s) => (
              <li key={s.label} data-stop className="relative flex items-baseline justify-between gap-4">
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute top-[5px] -left-7 size-[15px] rounded-full border-2",
                    s.strong ? "border-brand bg-brand" : "border-ink/30 bg-white",
                  )}
                />
                <span className={clsx("text-[15px]", s.strong ? "font-semibold text-ink" : "text-ink-2")}>{s.label}</span>
                <span className={clsx("tabular-nums", s.strong ? "text-[17px] font-semibold text-brand" : "text-[15px] font-semibold text-ink")}>
                  {s.date ? (s.sub ?? fmtDate(s.date, today!)) : "—"}
                </span>
              </li>
            ))}
          </ol>
          <div data-lands className="mt-6 rounded-card bg-white/80 p-4 text-[15px] leading-snug text-ink-2 shadow-soft">
            {lands ? (
              <>
                By then it&apos;s <strong className="font-semibold text-ink">{lands.name.toLowerCase()}</strong>
                {place ? ` in ${place}` : " where you are"}
                {landsPlan?.weeksLeft ? `, with about ${landsPlan.weeksLeft} week${landsPlan.weeksLeft > 1 ? "s" : ""} of it left` : ""}.
                {bestTheme && bestTheme.id !== lands.id && (
                  <>
                    {" "}
                    The next full season you can still make is <strong className="font-semibold text-brand">{bestTheme.name.toLowerCase()}</strong>.
                  </>
                )}
              </>
            ) : (
              <>&nbsp;</>
            )}
          </div>
        </div>
      </div>

      {/* the choice */}
      <ul data-cards aria-label="Seasons" className="mt-12 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {SEASON_IDS.map((id) => {
          const s = SEASONS[id];
          const p = t?.plans.find((x) => x.id === id);
          const on = shown === id;
          const best = t?.best === id;
          const soon = p?.status === "open" && p.daysLeft! <= SOON_DAYS;
          return (
            <li key={id} data-card>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => pickSeason(id)}
                className={clsx(
                  "group relative flex h-full w-full flex-col rounded-card p-5 text-left transition-[background-color,box-shadow,transform] duration-200 sm:p-6",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  on ? "bg-white shadow-float ring-2 ring-ink" : "bg-tile ring-1 ring-transparent hover:-translate-y-0.5 hover:bg-white hover:shadow-soft hover:ring-line",
                )}
              >
                <span className="flex items-center gap-3">
                  <span data-season-swatch={id} className="grid size-11 flex-none place-items-center rounded-full bg-frost text-season">
                    <Icon name={s.icon} className="size-5!" />
                  </span>
                  <span className="flex-1 text-[17px] font-semibold text-ink">{s.name}</span>
                  {best && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[12.5px] font-semibold text-brand">
                      <span aria-hidden="true" className="relative flex size-2">
                        <span className="motion-pause absolute inset-0 animate-ping rounded-full bg-brand/50" />
                        <span className="relative size-2 rounded-full bg-brand" />
                      </span>
                      Best timing
                    </span>
                  )}
                  {on && !best && (
                    <span className="grid size-6 place-items-center rounded-full bg-ink text-white">
                      <Icon name="check" className="size-3.5!" />
                    </span>
                  )}
                </span>

                <span className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-ink-2 max-sm:hidden">{s.line}</span>

                <span className="mt-4 block border-t border-line pt-4 sm:mt-auto">
                  {!p ? (
                    <span className="block text-[14px] text-muted">&nbsp;</span>
                  ) : p.status === "open" ? (
                    <span className="flex items-end justify-between gap-3">
                      <span>
                        <span className="block text-[13px] text-muted">Order by</span>
                        <span className="block text-[24px] leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums">{fmtDate(p.orderBy!, today!)}</span>
                      </span>
                      <span className={clsx("text-right text-[14px] tabular-nums", soon ? "font-semibold text-brand" : "text-ink-2")}>
                        {p.daysLeft === 0 ? "Today" : `${p.daysLeft} days left`}
                        {soon && <span className="block text-[12.5px] font-medium">closing soon</span>}
                      </span>
                    </span>
                  ) : p.status === "late" ? (
                    <span className="block">
                      <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                        <Icon name="clock" className="size-4! text-brand" />
                        Lands with {p.weeksLeft} week{p.weeksLeft! > 1 ? "s" : ""} left to sell
                      </span>
                      {p.orderBy && <span className="mt-1 block text-[13px] text-muted">Next full season: order by {fmtDate(p.orderBy, today!)}</span>}
                    </span>
                  ) : (
                    <span className="block text-[14px] text-muted">Not a season {place ? `in ${place}` : "here"}. For buyers shipping to other markets.</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* what the pick did, said out loud */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2" aria-live="polite">
        <p className="text-[15px] text-ink-2">
          {pending ? (
            "Lining up the styles…"
          ) : shown ? (
            <>
              Showing the <strong className="font-semibold text-ink">{SEASONS[shown].edit.toLowerCase()}</strong> across the site
              {picked ? "." : place ? `, picked for ${place}.` : ", picked for your location."}
              {picked && (
                <button type="button" onClick={() => pickSeason("auto")} className="hit-44 relative ml-2 font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                  Back to automatic
                </button>
              )}
            </>
          ) : (
            <>&nbsp;</>
          )}
        </p>
        {shown && (
          <a href="#season-edit">
            <ArrowLink>See the {SEASONS[shown].name.toLowerCase()} styles</ArrowLink>
          </a>
        )}
      </div>
    </section>
  );
}
