"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SEASON_COOKIE, SEASON_DATA, seasonOf, type SeasonId } from "@/lib/season";

const read = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];

/** The season by location alone: the detected country (or the time zone's), today. */
function autoSeason(): SeasonId {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const prefix = Object.keys(SEASON_DATA.zonePrefixes).find((p) => zone.startsWith(p));
  const country = read(SEASON_COOKIE.country) || SEASON_DATA.zones[zone] || (prefix ? SEASON_DATA.zonePrefixes[prefix] : "");
  return seasonOf(country, new Date(), SEASON_DATA);
}

/**
 * Shows the site in a season, or back on Auto (by location), without a reload: the theme, sky and weather switch at
 * once (they follow <html data-season>), then the page's server content refreshes in the background so the products
 * come in the season's order. The pick is saved for a month in a cookie. Returns the picker and whether a refresh is
 * still coming in.
 */
export function usePickSeason() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pick = (id: SeasonId | "auto") => {
    if (id === "auto") document.cookie = `${SEASON_COOKIE.pick}=; path=/; max-age=0`;
    else document.cookie = `${SEASON_COOKIE.pick}=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    document.documentElement.dataset.season = id === "auto" ? autoSeason() : id;
    startTransition(() => router.refresh());
  };
  return [pick, pending] as const;
}
