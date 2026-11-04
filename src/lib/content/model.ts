/*
 * What the admin panel can change on the live site, as one document (MongoDB `site_content`, _id "site"). Every
 * field is optional or has a default here, so an empty database, a missing field or a failed read all mean "the site
 * as built". Pure types and defaults: shared by the server (content/store.ts), the proxy and the browser.
 */

import type { Product } from "../products";
import type { SeasonId } from "../season";

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

export type SiteContent = {
  products: Record<string, ProductEdit>;
  added: AddedProduct[];
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
  updatedAt?: string;
  updatedBy?: string;
};

export const EMPTY_CONTENT: SiteContent = {
  products: {},
  added: [],
  pages: {},
  seasons: { auto: true, fallback: "winter", campaigns: {} },
  controls: { effects: true, campaign: true },
  contact: {},
  assistant: { trade: true, plan: true, model: true, tone: "warm" },
  alerts: { notifyNew: true, notifyOverdue: true, weekly: false },
};

/** A stored document (possibly old or partial) filled out with the defaults. */
export function withDefaults(raw: Partial<SiteContent> | null | undefined): SiteContent {
  const r = raw ?? {};
  return {
    products: r.products ?? {},
    added: r.added ?? [],
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
    updatedAt: r.updatedAt,
    updatedBy: r.updatedBy,
  };
}

/** What the browser needs (printed into every page's head): no page settings, no alerts, nobody's address. */
export function publicContent(c: SiteContent) {
  const home = c.pages["/"]?.sections;
  return {
    products: c.products,
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
    stamp: c.updatedAt ?? "",
  };
}
export type PublicContent = ReturnType<typeof publicContent>;

export const CONTENT_ELEMENT = "cl-content";
