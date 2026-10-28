import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SKIP_COOKIE, skipAllowed } from "@/lib/admin/cookie";
import { isSeason, SEASON_COOKIE, SEASON_DATA, paintScript, seasonOf } from "@/lib/season";

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
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return admin(req);
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

/** The root layout's season script, allowed on /admin by its hash (it is the same text in every build's pages). */
const SEASON_HASH = `'sha256-${createHash("sha256").update(paintScript()).digest("base64")}'`;

/**
 * /admin: no season cookies, a strict Content-Security-Policy with a fresh nonce per request (Next.js puts it on its
 * own scripts), nothing cached anywhere, never framed or indexed. Without a session cookie, every page but the sign-in
 * page sends you there. This is only a first, cheap filter: each page and action checks the session in the database
 * (src/lib/admin/auth.ts requireAdmin).
 */
function admin(req: NextRequest) {
  const dev = process.env.NODE_ENV === "development";
  // /admin itself (the dashboard UI, sample data only) opens without signing in; every page with real data still needs it
  const signInPage = req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname === "/admin";
  if (!signInPage && !req.cookies.has(SESSION_COOKIE) && !(req.cookies.has(SKIP_COOKIE) && skipAllowed(req.headers.get("host")))) return secure(NextResponse.redirect(new URL("/admin/login", req.url)));

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${SEASON_HASH} 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // style attributes and next/font's styles; scripts are what CSP has to hold tight
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return secure(res);
}

function secure(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (process.env.NODE_ENV === "production") res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return res;
}

export const config = {
  // pages only: not Next's own files, the API or anything with a file extension (images, fonts, the OG image)
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
