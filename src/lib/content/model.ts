/*
 * What the admin panel can change on the live site, as one document (MongoDB `site_content`, _id "site"). Every
 * field is optional or has a default here, so an empty database, a missing field or a failed read all mean "the site
 * as built". Pure types and defaults: shared by the server (content/store.ts), the proxy and the browser.
 */

import type { Product } from "../products";
import type { SeasonId } from "../season";
import type { PriceList } from "../admin/prices";
import type { Availability } from "../availability";
import type { SeasonCopyMap } from "../season-copy";
import { TRACKER_IDS, trackerIdOk, normalTrackerId, type TrackerId } from "../marketing/model";

/** A style made in the admin panel; shown, featured and pinned through `products`, like a built-in one. */
export type AddedProduct = Omit<Product, "featured" | "pinnedSeasons">;

export type ProductEdit = {
  /** false hides the style everywhere on the site (lists, search, its page, Kai, the sitemap). */
  live?: boolean;
  /** Featured styles come first wherever the site lists styles. */
  featured?: boolean;
  name?: string;
  desc?: string;
  /** Seasons the style is pinned to, on top of what its materials suggest. */
  seasons?: SeasonId[];
  /** The badge on its cards; "none" removes the built-in one. */
  badge?: "Top reorder" | "New" | "Trending" | "none";
  /** The rest of a built-in style. Left out: as built. "" as the category: worked out from the type. */
  type?: string;
  line?: Product["line"];
  category?: string;
  sizes?: string;
  sizeRun?: string[];
  spec?: string;
  tags?: string[];
  outer?: Product["outer"];
  /** null removes the built-in second photo. */
  zip?: Product["outer"] | null;
  materials?: Product["materials"];
  color?: Product["color"];
  scene?: Product["scene"];
  /** null removes the built-in rating. */
  rating?: string | null;
};

export type SectionEdit = {
  id: string;
  visible: boolean;
  title?: string;
  sub?: string;
};

export type PageEdit = {
  /** false: the page answers 404 and leaves the sitemap. */
  published?: boolean;
  /** Search title and description (the page's own are used when empty). */
  title?: string;
  description?: string;
  /**
   * Any page: new words for its intro and section headings, by key ("intro.title", "intro.sub", "h-how.title",
   * "h-how.sub"; a section's key is its heading's id), and the sections hidden (by heading id).
   */
  copy?: Record<string, string>;
  hidden?: string[];
  /** Home page only: the sections in order, each shown or hidden, with optional new headline and supporting line. */
  sections?: SectionEdit[];
};

export type Tone = "plain" | "warm" | "formal";

/** The home page's product showcases, as style ids in order; an empty or missing list: the built-in way. */
export type Merch = { hot: string[]; arrivals: string[]; order: string[]; seasonEdit?: Partial<Record<SeasonId, string[]>> };

export type SiteContent = {
  products: Record<string, ProductEdit>;
  added: AddedProduct[];
  /** The desk's private prices per style (admin/prices.ts). Never sent to browsers: publicContent leaves it out. */
  prices: PriceList;
  /** Per style: in stock, in production, sold out, or made to order with its own lead time (availability.ts). Public. */
  availability: Record<string, Availability>;
  /** Each season's hero and campaign words and photo (season-copy.ts). Public. */
  seasonCopy: SeasonCopyMap;
  /**
   * The home page's Hot products, New arrivals and each season's edit (empty: the built-in way), and the order of
   * featured styles (lib/merch.ts).
   */
  merch: Merch;
  pages: Record<string, PageEdit>;
  seasons: {
    /** true: each visitor sees the season in their country; false: everyone sees `fallback`. */
    auto: boolean;
    fallback: SeasonId;
    /** A campaign switched off hides its banner on the home page. */
    campaigns: Partial<Record<SeasonId, { live: boolean }>>;
  };
  controls: { effects: boolean; campaign: boolean };
  contact: { email?: string; phone?: string; hours?: string };
  assistant: { trade: boolean; plan: boolean; model: boolean; tone: Tone };
  alerts: { notifyNew: boolean; notifyOverdue: boolean; weekly: boolean };
  /**
   * The Social team's tracking tags (Meta Pixel, GA4…), each with its id and an on switch, and whether the site's
   * events (lead, add to list…) are sent to them. Tags load only after the visitor agrees (components/MarketingTags).
   */
  tracking: { tags: Partial<Record<TrackerId, { id: string; on: boolean }>>; events: boolean };
  updatedAt?: string;
  updatedBy?: string;
};

export const EMPTY_CONTENT: SiteContent = {
  products: {},
  added: [],
  prices: {},
  availability: {},
  seasonCopy: {},
  merch: { hot: [], arrivals: [], order: [] },
  pages: {},
  seasons: { auto: true, fallback: "winter", campaigns: {} },
  controls: { effects: true, campaign: true },
  contact: {},
  assistant: { trade: true, plan: true, model: true, tone: "warm" },
  alerts: { notifyNew: true, notifyOverdue: true, weekly: false },
  tracking: { tags: {}, events: true },
};

/** A stored document (possibly old or partial) filled out with the defaults. */
export function withDefaults(raw: Partial<SiteContent> | null | undefined): SiteContent {
  const r = raw ?? {};
  return {
    products: r.products ?? {},
    added: r.added ?? [],
    prices: r.prices ?? {},
    availability: r.availability ?? {},
    seasonCopy: r.seasonCopy ?? {},
    merch: { hot: [], arrivals: [], order: [], ...r.merch },
    pages: r.pages ?? {},
    seasons: {
      ...EMPTY_CONTENT.seasons,
      ...r.seasons,
      campaigns: { ...r.seasons?.campaigns },
    },
    controls: { ...EMPTY_CONTENT.controls, ...r.controls },
    contact: { ...r.contact },
    assistant: { ...EMPTY_CONTENT.assistant, ...r.assistant },
    alerts: { ...EMPTY_CONTENT.alerts, ...r.alerts },
    tracking: { ...EMPTY_CONTENT.tracking, ...r.tracking, tags: { ...r.tracking?.tags } },
    updatedAt: r.updatedAt,
    updatedBy: r.updatedBy,
  };
}

/** What the browser needs (printed into every page's head): no page settings, no alerts, nobody's address. */
export function publicContent(c: SiteContent) {
  const home = c.pages["/"]?.sections;
  return {
    products: c.products,
    availability: c.availability,
    seasonCopy: c.seasonCopy,
    merch: c.merch,
    // a hidden new style stays out of the page source until it goes live
    added: c.added.filter((p) => c.products[p.id]?.live !== false),
    copy: Object.fromEntries((home ?? []).filter((s) => s.title || s.sub).map((s) => [s.id, { title: s.title, sub: s.sub }])),
    /** Every page's rewritten words and hidden sections (pages with none left out). */
    pages: Object.fromEntries(
      Object.entries(c.pages).flatMap(([path, p]) => (p.copy && Object.keys(p.copy).length) || p.hidden?.length ? [[path, { copy: p.copy ?? {}, hidden: p.hidden ?? [] }]] : []),
    ) as Record<string, { copy: Record<string, string>; hidden: string[] }>,
    seasons: { campaigns: c.seasons.campaigns },
    controls: c.controls,
    contact: c.contact,
    assistant: { trade: c.assistant.trade, plan: c.assistant.plan },
    /** The tags switched on with a valid id: these ids are public anyway (every tag prints its id in the page). */
    tracking: {
      tags: Object.fromEntries(
        TRACKER_IDS.flatMap((t) => {
          const tag = c.tracking.tags[t];
          return tag?.on && trackerIdOk(t, tag.id) ? [[t, normalTrackerId(t, tag.id)]] : [];
        }),
      ) as Partial<Record<TrackerId, string>>,
      events: c.tracking.events,
    },
    stamp: c.updatedAt ?? "",
  };
}
export type PublicContent = ReturnType<typeof publicContent>;

export const CONTENT_ELEMENT = "cl-content";
