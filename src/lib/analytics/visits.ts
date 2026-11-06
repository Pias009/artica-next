import "server-only";
import { createHash } from "node:crypto";
import { database, dbReady } from "../leads/db";

/*
 * The site's own visitor log, for the admin panel's Visitors and Dashboard views. One small document per page view,
 * search or opened inquiry form: the path, when, an anonymous visit id, the country the proxy already worked out, the
 * kind of device and where the visit came from. The visit id is a hash of a secret that changes every day with the
 * address and browser, so one visit's pages join up but nobody can be followed from one day to the next, and the
 * address itself is never stored. Nothing is kept on the visitor's device. Deleted after 90 days (TTL index).
 */

export type VisitKind = "view" | "search" | "inquiry" | "add";
export type Device = "Desktop" | "Mobile" | "Tablet";
export type VisitDoc = {
  sid: string;
  kind: VisitKind;
  path: string;
  at: Date;
  country: string | null;
  device: Device;
  source: string;
  q?: string;
  found?: number;
  /** "add": the style put on the inquiry list. */
  pid?: string;
};

export const visits = () => database().collection<VisitDoc>("visits");

let indexed: Promise<unknown> | null = null;
/** The indexes, made once per server (scripts/migrate.mjs makes them too). */
export function ensureVisitIndexes() {
  if (!dbReady()) return Promise.resolve();
  return (indexed ??= visits()
    .createIndexes([
      { key: { at: 1 }, name: "expire", expireAfterSeconds: 90 * 24 * 60 * 60 },
      { key: { sid: 1, at: 1 }, name: "sid_at" },
      { key: { kind: 1, at: -1 }, name: "kind_at" },
    ])
    .catch((e) => {
      indexed = null;
      console.error("[visits] indexes", e);
    }));
}

const ENGINES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)(duckduckgo|yahoo|baidu|yandex|ecosia)\./, "Other search"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com)$/, "Facebook"],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, "X"],
  [/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|claude\.ai)$/, "AI assistant"],
];

/** Where a visit came from, from the referrer: a search engine, a social site, another site, or none ("Direct"). */
export function sourceOf(referrer: string | undefined, ownHost: string) {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === ownHost.replace(/^www\./, "")) return "Direct";
    return ENGINES.find(([re]) => re.test(host))?.[1] ?? "Other sites";
  } catch {
    return "Direct";
  }
}

export function deviceOf(ua: string, width: number): Device {
  if (/ipad|tablet|kindle|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return "Tablet";
  if (/mobi|iphone|android/i.test(ua) || (width > 0 && width < 768)) return "Mobile";
  return "Desktop";
}

/** Today's anonymous visit id for an address and browser (see above). */
export function visitId(ip: string, ua: string) {
  const day = new Date().toISOString().slice(0, 10);
  const secret = process.env.VISIT_SALT || process.env.MONGODB_URI || "";
  const salt = createHash("sha256").update(`${secret}|${day}`).digest();
  return createHash("sha256").update(salt).update(`${ip}|${ua}`).digest("hex").slice(0, 20);
}

export const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|monitor|curl|wget|python|axios|node-fetch/i;
