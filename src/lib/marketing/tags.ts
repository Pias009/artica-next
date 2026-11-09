/*
 * The Social team's tracking tags in the browser (Meta Pixel, Google Analytics 4 / Ads / Tag Manager, LinkedIn,
 * TikTok, Microsoft Clarity), set up in Admin → Social. Nothing here runs until the visitor agrees in the cookie
 * banner (components/MarketingTags.tsx), and never for browsers that send Global Privacy Control or Do Not Track.
 * The site's own events (components/Track.tsx and the forms) are passed on to whichever tags are loaded.
 */

import { TRACK_EVENTS, type TrackEvent, type TrackerId } from "./model";

type Fn = ((...args: unknown[]) => void) & Record<string, unknown>;
type W = Window & {
  fbq?: Fn;
  _fbq?: Fn;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  ttq?: Fn & unknown[];
  TiktokAnalyticsObject?: string;
  lintrk?: Fn;
  _linkedin_partner_id?: string;
  _linkedin_data_partner_ids?: string[];
  clarity?: Fn;
};

export const CONSENT_KEY = "cl-consent";
export const CONSENT_OPEN = "cl-consent-open";

export const optedOut = () => {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === "1";
};

let loaded: Partial<Record<TrackerId, string>> | null = null;
let sendEvents = true;
let lastPath = "";

function script(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Loads the tags (once per page load) and sends the first page view through each vendor's own snippet. */
export function loadTags(tags: Partial<Record<TrackerId, string>>, events: boolean) {
  if (loaded || typeof window === "undefined" || optedOut()) return;
  loaded = tags;
  sendEvents = events;
  lastPath = location.pathname + location.search;
  const w = window as W;

  if (tags.meta) {
    if (!w.fbq) {
      const n = function (...args: unknown[]) {
        if (n.callMethod) (n.callMethod as (...a: unknown[]) => void).apply(n, args);
        else (n.queue as unknown[]).push(args);
      } as Fn;
      Object.assign(n, { push: n, loaded: true, version: "2.0", queue: [] });
      w.fbq = n;
      w._fbq ??= n;
      script("https://connect.facebook.net/en_US/fbevents.js");
    }
    w.fbq("init", tags.meta);
    w.fbq("track", "PageView");
  }

  if (tags.ga4 || tags.gads || tags.gtm) w.dataLayer ??= [];
  if (tags.ga4 || tags.gads) {
    w.gtag = function () {
      // gtag queues the arguments object itself, as Google's snippet does
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    // loaded only after the visitor agreed, so consent mode starts granted
    w.gtag("consent", "default", { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    script(`https://www.googletagmanager.com/gtag/js?id=${tags.ga4 ?? tags.gads}`);
    w.gtag("js", new Date());
    if (tags.ga4) w.gtag("config", tags.ga4);
    if (tags.gads) w.gtag("config", tags.gads);
  }
  if (tags.gtm) {
    w.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
    script(`https://www.googletagmanager.com/gtm.js?id=${tags.gtm}`);
  }

  if (tags.linkedin) {
    w._linkedin_partner_id = tags.linkedin;
    w._linkedin_data_partner_ids = [...(w._linkedin_data_partner_ids ?? []), tags.linkedin];
    if (!w.lintrk) {
      const l = function (a: unknown, b: unknown) {
        (l.q as unknown[]).push([a, b]);
      } as Fn;
      l.q = [];
      w.lintrk = l;
    }
    script("https://snap.licdn.com/li.lms-analytics/insight.min.js");
  }

  if (tags.tiktok) {
    w.TiktokAnalyticsObject = "ttq";
    const ttq = (w.ttq ??= [] as unknown as Fn & unknown[]);
    for (const m of ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"])
      ttq[m] = (...args: unknown[]) => ttq.push([m, ...args]);
    const url = "https://analytics.tiktok.com/i18n/pixel/events.js";
    Object.assign(ttq, { _i: { [tags.tiktok]: Object.assign([], { _u: url }) }, _t: { [tags.tiktok]: Date.now() }, _o: { [tags.tiktok]: {} } });
    script(`${url}?sdkid=${tags.tiktok}&lib=ttq`);
    (ttq.page as () => void)();
  }

  if (tags.clarity) {
    if (!w.clarity) {
      const c = function (...args: unknown[]) {
        ((c.q as unknown[]) ??= []).push(args);
      } as Fn;
      w.clarity = c;
    }
    script(`https://www.clarity.ms/tag/${tags.clarity}`);
  }
}

/** One of the site's events, passed on to the loaded tags in each vendor's own words (model.ts TRACK_EVENTS). */
export function tagEvent(e: TrackEvent, extra: { q?: string; id?: string } = {}) {
  if (!loaded) return;
  const w = window as W;
  if (e === "view") {
    // the first view went with the snippets; later ones are the site's own page changes (GA4 sees those itself)
    const p = location.pathname + location.search;
    if (p === lastPath) return;
    lastPath = p;
    w.fbq?.("track", "PageView");
    (w.ttq?.page as (() => void) | undefined)?.();
    return;
  }
  if (!sendEvents) return;
  const def = TRACK_EVENTS.find((t) => t.id === e)!;
  const meta = extra.q ? { search_string: extra.q } : extra.id ? { content_ids: [extra.id], content_type: "product" } : {};
  const google = extra.q ? { search_term: extra.q } : extra.id ? { items: [{ item_id: extra.id }] } : {};
  w.fbq?.("track", def.meta, meta);
  w.gtag?.("event", def.google, google);
  if (loaded.gtm && !w.gtag) w.dataLayer?.push({ event: def.google, ...google });
  (w.ttq?.track as ((n: string, d: object) => void) | undefined)?.(def.tiktok, extra.id ? { content_id: extra.id } : {});
}
