/*
 * Which styles the home page puts forward, and in what order: the "styles buyers reorder" deck (Hot products), New
 * arrivals, and the order of featured styles across the site. Set in the admin panel (Products → Arrange); until
 * then, the built-in lists below.
 */

import { merchList } from "./content/live";
import { products, type Product } from "./products";

/** The built-in lists, by address. */
export const DEFAULT_HOT = ["nord", "mira", "mira-tall", "ember", "maple", "cedar", "raven", "sable"];
export const DEFAULT_ARRIVALS = ["tundra", "pop", "zinnia", "lynx", "toffee", "frost", "blossom", "bluebell"];

export const MAX_HOT = 12;
export const MAX_ARRIVALS = 10;

const live = (ids: string[], by: "id" | "slug") => ids.map((x) => products.find((p) => (by === "id" ? p.id : p.slug) === x)).filter((p): p is Product => !!p);

/** The admin's list for this section (live styles only, in their order), or null to use the built-in way. */
export function chosen(k: "hot" | "arrivals"): Product[] | null {
  const ids = merchList(k);
  return ids.length ? live(ids, "id") : null;
}

export const defaultHot = () => live(DEFAULT_HOT, "slug");
export const defaultArrivals = () => live(DEFAULT_ARRIVALS, "slug");
