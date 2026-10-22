"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_SEASON, SEASON_COOKIE, type SeasonId } from "@/lib/season";

const SeasonContext = createContext<SeasonId>(DEFAULT_SEASON);

/** The season this page was built for; the home page's sections order their styles by it. */
export function SeasonProvider({ season, children }: { season: SeasonId; children: ReactNode }) {
  return <SeasonContext.Provider value={season}>{children}</SeasonContext.Provider>;
}

export const useSeason = () => useContext(SeasonContext);

const noop = () => () => {};
const readCountry = () => document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.country}=([^;]*)`))?.[1] ?? "";
const names = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

/** The visitor's country as a name ("Bangladesh"), from the proxy's cookie. Empty on the server and when unknown. */
export function useCountryName() {
  const code = useSyncExternalStore(noop, readCountry, () => "");
  if (!code) return "";
  try {
    return names?.of(code) ?? code;
  } catch {
    return code;
  }
}
