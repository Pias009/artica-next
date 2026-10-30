"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { EffectsToggle } from "./EffectsToggle";
import { onSeason } from "./live";
import { usePickSeason } from "./pickSeason";
import { useCountryName } from "./SeasonContext";
import { isSeason, SEASON_COOKIE, SEASON_IDS, SEASONS } from "@/lib/season";

const read = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
/** The season on show (the theme script set it) and whether the visitor picked it by hand. */
const snapshot = () => `${document.documentElement.dataset.season ?? ""}|${read(SEASON_COOKIE.pick) ? "pick" : "auto"}`;

/**
 * The season the site is dressed for, in the top bar, with a menu to pick another or go back to automatic. A pick is
 * saved in a cookie and the site switches at once (see usePickSeason).
 */
export function SeasonSwitcher() {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const country = useCountryName();
  const [shown, mode] = useSyncExternalStore(onSeason, snapshot, () => "|auto").split("|");
  const [pickSeason] = usePickSeason();
  const season = isSeason(shown) ? SEASONS[shown] : null;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!season) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${uid}-menu`}
        onClick={() => setOpen((v) => !v)}
        className="hit-44 relative inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/12 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-white/20"
      >
        <Icon name={season.icon} className="size-3.5!" />
        {season.name}
        {country && mode === "auto" && <span className="font-normal text-white/70 max-sm:hidden">· {country}</span>}
        <Icon name="plus" className={clsx("size-3! transition-transform", open && "rotate-45")} />
        <span className="sr-only">, change season</span>
      </button>
      {open && (
        <div
          id={`${uid}-menu`}
          className="absolute top-full right-0 z-[60] mt-2 w-64 rounded-card bg-white p-2 text-left text-ink shadow-float ring-1 ring-ink/8"
        >
          <p className="px-3 pt-2 pb-1 text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">Show styles for</p>
          <ul>
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  pickSeason("auto");
                }}
                className={clsx("flex min-h-11 w-full items-center gap-2.5 rounded-ph px-3 text-[14px] hover:bg-tile", mode === "auto" && "font-semibold")}
              >
                <Icon name="pin" className="size-4!" />
                <span className="flex-1 text-left">Auto{country ? ` (${country})` : ", by location"}</span>
                {mode === "auto" && <Icon name="check" className="size-4! text-brand" />}
              </button>
            </li>
            {SEASON_IDS.map((id) => {
              const on = mode === "pick" && id === shown;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      pickSeason(id);
                    }}
                    data-season-swatch={id}
                    className={clsx("flex min-h-11 w-full items-center gap-2.5 rounded-ph px-3 text-[14px] hover:bg-tile", on && "font-semibold")}
                  >
                    <Icon name={SEASONS[id].icon} className="size-4! text-season" />
                    <span className="flex-1 text-left">{SEASONS[id].name}</span>
                    {on && <Icon name="check" className="size-4! text-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-line pt-1">
            <EffectsToggle />
          </div>
        </div>
      )}
    </div>
  );
}
