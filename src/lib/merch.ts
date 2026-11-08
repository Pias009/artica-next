/*
 * Which styles the home page puts forward, and in what order: the "styles buyers reorder" deck (Hot products), New
 * arrivals, each season's edit, and the order of featured styles across the site. Set in the admin panel (Pages → Home
 * → the section, or Products → Arrange); until then, the built-in way below.
 *
 * The site and the admin panel resolve each list with the same functions: the site from the live catalogue and the
 * saved lists, the panel from its drafts, so what the panel previews is what the page will show.
 */

import { merchList, seasonEditIds } from "./content/live";
import { products, type Product } from "./products";
import type { SeasonId } from "./season";
import { bySeason, inSeason, seasonPicks } from "./season-products";

/** The built-in lists, by address. */
export const DEFAULT_HOT = ["nord", "mira", "mira-tall", "ember", "maple", "cedar", "raven", "sable"];
export const DEFAULT_ARRIVALS = ["tundra", "pop", "zinnia", "lynx", "toffee", "frost", "blossom", "bluebell"];

export const MAX_HOT = 12;
export const MAX_ARRIVALS = 10;
/** The season's edit: how many styles it holds, chosen or automatic. */
export const SEASON_EDIT = 6;
/** The automatic Hot products deck's size. */
export const HOT_DECK = DEFAULT_HOT.length;

type Style = Pick<Product, "id" | "slug">;
const pick = <T extends Style>(ids: string[], from: T[], by: "id" | "slug") => ids.map((x) => from.find((p) => p[by] === x)).filter((p): p is T => !!p);

/** The admin's list for this section (live styles only, in their order), or null to use the built-in way. */
export function chosen(k: "hot" | "arrivals"): Product[] | null {
  const ids = merchList(k);
  return ids.length ? pick(ids, products, "id") : null;
}

export const defaultHot = () => pick(DEFAULT_HOT, products, "slug");
export const defaultArrivals = () => pick(DEFAULT_ARRIVALS, products, "slug");

/** Hot products, automatic: the season's in-season styles first (best first), topped up from the reorder list. */
export function autoHot<T extends Product>(season: SeasonId, from: T[]): T[] {
  const fresh = (seasonPicks(season, HOT_DECK, from) as T[]).filter((p) => inSeason(p, season));
  return [...fresh, ...pick(DEFAULT_HOT, from, "slug").filter((p) => !fresh.includes(p))].slice(0, HOT_DECK);
}
/** New arrivals, automatic: the built-in drop, the season's best first. */
export const autoArrivals = <T extends Product>(season: SeasonId, from: T[]): T[] => bySeason(pick(DEFAULT_ARRIVALS, from, "slug"), season);
/** The season's edit, automatic: its best styles, one per kind first. */
export const autoSeasonEdit = <T extends Product>(season: SeasonId, from: T[]): T[] => seasonPicks(season, SEASON_EDIT, from) as T[];

/** A chosen list (ids) as styles, kept to its size; when it names no live style, the automatic list instead. */
function listOr<T extends Product>(ids: string[], from: T[], max: number, auto: () => T[]) {
  const own = pick(ids, from, "id").slice(0, max);
  return own.length ? own : auto();
}

/** What each of the home page's product showcases shows. Defaults: the live site; the panel passes its drafts. */
export const hotList = <T extends Product>(season: SeasonId, ids: string[] = merchList("hot"), from: T[] = products as T[]) => listOr(ids, from, MAX_HOT, () => autoHot(season, from));
export const arrivalsList = <T extends Product>(season: SeasonId, ids: string[] = merchList("arrivals"), from: T[] = products as T[]) =>
  listOr(ids, from, MAX_ARRIVALS, () => autoArrivals(season, from));
export const seasonEditList = <T extends Product>(season: SeasonId, ids: string[] = seasonEditIds(season), from: T[] = products as T[]) =>
  listOr(ids, from, SEASON_EDIT, () => autoSeasonEdit(season, from));
