"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { campaignFor } from "./EditorialCampaignBanner";
import { Icon } from "../Icon";
import { usePickSeason } from "../season/pickSeason";
import { useSeason } from "../season/SeasonContext";
import { SectionText } from "../ui/SectionText";
import { Txt } from "../ui/Txt";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { timingFor, type Timed } from "@/lib/planner";
import { isSeason, SEASON_COOKIE, SEASONS, type SeasonId } from "@/lib/season";
import { useToday } from "@/lib/useToday";

const noop = () => () => {};
const cookieCountry = () => document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.country}=([A-Z]{2})`))?.[1] ?? "";
const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
const FALLBACK: SeasonId[] = ["spring", "summer", "autumn", "winter"];

/** The next four seasons stock ordered now can still reach, in the order they come, for the visitor's country. */
function nextFour(windows: Timed[]) {
  const seen = new Set<string>();
  return windows.filter((w) => w.verdict !== "late" && isSeason(w.season) && !seen.has(w.season) && seen.add(w.season)).slice(0, 4);
}

/**
 * Straight after the hero, on plain white: stock takes about two months to arrive, so one question, which season
 * the buyer is selling in, and four photo cards to answer it. The headline reads itself in word by word; the cards
 * rise in after it. Choosing one switches the whole home page to that season's styles. Every word is editable in
 * the admin panel (Pages → Home → Choose your season).
 */
export function SeasonPick() {
  const today = useToday();
  const code = useSyncExternalStore(noop, cookieCountry, () => "");
  const shown = useSeason();
  const [pick, pending] = usePickSeason();
  const [chosen, setChosen] = useState<SeasonId | null>(null);
  const ref = useRef<HTMLElement>(null);

  const windows = today ? nextFour(timingFor(code || "US", today, false).windows) : [];
  const cards = windows.length ? windows.map((w) => ({ id: w.season as SeasonId, w })) : FALLBACK.map((id) => ({ id, w: null as Timed | null }));
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
          stagger: 0.1,
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
            Stock arrives in two months. <em>Which season are you selling?</em>
          </SectionText>
          <SectionText part="sub" className="mx-auto mt-4 max-w-[44ch] text-[17px] text-ink-2">
            Pick one and we&apos;ll show you the styles that sell then.
          </SectionText>
        </div>

        <div data-pick-cards role="radiogroup" aria-label="Season you're selling" className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {cards.map(({ id, w }, i) => {
            const on = active === id;
            const photo = campaignFor(id);
            return (
              // the entrance moves this wrapper; the card's own hover lift stays a CSS transition, so the two never fight
              <div key={id} data-pick-card className="flex">
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(id)}
                  className={clsx(
                    "group relative w-full overflow-hidden rounded-[22px] bg-white text-left transition-[box-shadow,transform] duration-500 ease-soft hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
                    on
                      ? "shadow-[0_0_0_2px_var(--color-ink),0_24px_48px_-24px_rgb(18_20_22/.45)]"
                      : "shadow-[0_0_0_1px_rgb(18_20_22/.08)] hover:shadow-[0_0_0_1px_rgb(18_20_22/.14),0_24px_48px_-28px_rgb(18_20_22/.4)]",
                  )}
                >
                  <span className="relative block aspect-[4/5] overflow-hidden">
                    <Image
                      src={photo.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
                    />
                    <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgb(12_13_14/.55))]" />
                    {i === 0 && w && (
                      <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink shadow-soft">
                        <Txt k="best" label="Badge on the first season">
                          Best to order now
                        </Txt>
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "absolute top-3 right-3 grid size-7 place-items-center rounded-full transition-colors",
                        on ? "bg-ink text-white" : "bg-white/80 text-transparent",
                      )}
                    >
                      <Icon name="check" className="size-4" />
                    </span>
                    <span className="absolute inset-x-4 bottom-3.5 flex items-center gap-2 text-white">
                      <Icon name={SEASONS[id].icon} className="size-5!" />
                      <span className="font-headline text-[clamp(20px,2vw,26px)] leading-none font-semibold">{SEASONS[id].name}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3.5 py-3 text-[13.5px] sm:px-4 sm:py-3.5 sm:text-[14px]">
                    <span className="whitespace-nowrap text-ink-2">{w ? `${month(w.start)} – ${month(w.end)}` : SEASONS[id].edit}</span>
                    <span className={clsx("inline-flex items-center gap-1 font-semibold transition-colors", on ? "text-ink" : "text-brand")}>
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
