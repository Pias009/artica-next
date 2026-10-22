import { NextResponse, type NextRequest } from "next/server";
import { isSeason, SEASON_COOKIE, SEASON_DATA, seasonOf } from "@/lib/season";

const MONTH = 60 * 60 * 24 * 30;
const COOKIE = { path: "/", sameSite: "lax", maxAge: MONTH } as const;

/**
 * Works out the visitor's season on every page request and keeps it in cookies for the theme script and the catalog.
 * The home page is served from the copy built for that season (/season/[season]), so it arrives already in order.
 *
 * Country, first found wins: `?country=BD` (for testing a market), the host's IP-country header (Vercel or
 * Cloudflare), the cookie from an earlier visit. Season: `?season=summer` or a pick saved by the season switcher
 * (`?season=auto` clears it), else the season in that country today.
 */
export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const asked = url.searchParams.get("country")?.toUpperCase();
  const country =
    (asked && /^[A-Z]{2}$/.test(asked) ? asked : null) ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    req.cookies.get(SEASON_COOKIE.country)?.value ??
    "";

  // only the home page's ?season= is a pick; on the catalog it is a filter (/catalog?season=summer) and must not stick
  const home = url.pathname === "/";
  const askedSeason = home ? url.searchParams.get("season") : null;
  const pick = askedSeason === "auto" ? undefined : isSeason(askedSeason) ? askedSeason : req.cookies.get(SEASON_COOKIE.pick)?.value;
  const season = isSeason(pick) ? pick : seasonOf(country, new Date(), SEASON_DATA);

  // the page rendering now sees the season too (a first visit has no cookie yet)
  req.cookies.set(SEASON_COOKIE.season, season);
  req.cookies.delete(SEASON_COOKIE.pick);
  if (isSeason(pick)) req.cookies.set(SEASON_COOKIE.pick, pick);
  const forward = { request: { headers: req.headers } };
  const res = home ? NextResponse.rewrite(new URL(`/season/${season}${url.search}`, req.url), forward) : NextResponse.next(forward);

  // the season copies are reached through "/"; asked for by their own address they stay out of search results
  if (url.pathname.startsWith("/season/")) res.headers.set("X-Robots-Tag", "noindex, follow");
  if (/^[A-Z]{2}$/.test(country)) res.cookies.set(SEASON_COOKIE.country, country, COOKIE);
  // re-worked out each day, so the season turns over on its own
  res.cookies.set(SEASON_COOKIE.season, season, { ...COOKIE, maxAge: 60 * 60 * 24 });
  if (askedSeason === "auto") res.cookies.delete(SEASON_COOKIE.pick);
  else if (isSeason(askedSeason)) res.cookies.set(SEASON_COOKIE.pick, askedSeason, COOKIE);
  return res;
}

export const config = {
  // pages only: not Next's own files, the API or anything with a file extension (images, fonts, the OG image)
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
