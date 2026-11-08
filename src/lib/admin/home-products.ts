import type { Merch } from "../content/model";
import { autoArrivals, autoHot, autoSeasonEdit, MAX_ARRIVALS, MAX_HOT, SEASON_EDIT } from "../merch";
import type { Product } from "../products";
import type { SeasonId } from "../season";
import type { Item } from "./product-draft";

/*
 * The styles in each home-page section, as the admin panel's Pages view shows and edits them: the three showcases
 * the admin chooses (Hot products, New arrivals, each season's edit), and the sections whose styles follow from
 * something else (the whole range, the lookbook's looks, the season), listed as the page shows them.
 */

/** The catalogue as the site would show it with these drafts: live styles, featured first in the admin's order. */
export function liveCatalog(items: Item[], order: string[]): (Product & { live: true })[] {
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return items
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.live)
    .sort((a, b) => Number(b.p.featured) - Number(a.p.featured) || rank(a.p.id) - rank(b.p.id) || a.i - b.i)
    .map(({ p }) => ({ ...p, live: true as const, featured: p.featured, pinnedSeasons: p.pins.length ? p.pins : undefined }));
}

/** A showcase the admin chooses: where its list is kept, how many it holds, what fills it when left empty. */
export type HomeList = {
  max: number;
  perSeason: boolean;
  get: (m: Merch, s: SeasonId) => string[];
  set: (m: Merch, s: SeasonId, ids: string[]) => Merch;
  auto: <T extends Product>(s: SeasonId, from: T[]) => T[];
  /** What the section shows when no list is chosen. */
  automatic: string;
};

export const HOME_LISTS: Partial<Record<string, HomeList>> = {
  hot: {
    max: MAX_HOT,
    perSeason: false,
    get: (m) => m.hot,
    set: (m, _s, hot) => ({ ...m, hot }),
    auto: autoHot,
    automatic: "the season's in-season styles first, topped up from the reorder list",
  },
  new: {
    max: MAX_ARRIVALS,
    perSeason: false,
    get: (m) => m.arrivals,
    set: (m, _s, arrivals) => ({ ...m, arrivals }),
    auto: autoArrivals,
    automatic: "the built-in drop, the season's best first",
  },
  "season-edit": {
    max: SEASON_EDIT,
    perSeason: true,
    get: (m, s) => m.seasonEdit?.[s] ?? [],
    set: (m, s, ids) => ({ ...m, seasonEdit: { ...m.seasonEdit, [s]: ids } }),
    auto: autoSeasonEdit,
    automatic: "the season's best styles, one per kind",
  },
};

/** How the styles in the other sections are chosen, for the panel to say so beside them. */
export const SHOWN_NOTE: Partial<Record<string, string>> = {
  styles: "Every live style, one per kind, line by line. Add a style or feature one to change it.",
  lookbook: "The styles worn in the looks. Change a look's style under “Styles”.",
  samples: "The boot rising out of the sample box. Change it under “Styles”.",
  "up-close": "The section is built around this style's photos and details.",
  hero: "Chosen for each season from what suits it. Its words and photo are edited in Seasons.",
  campaign: "The styles worn in this season's campaign, set in Seasons.",
};
