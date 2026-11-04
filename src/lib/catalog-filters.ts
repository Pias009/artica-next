/**
 * Catalog state, its URL form and faceted filtering. Each facet's counts are taken with every *other* filter applied,
 * so a number always says how many styles picking that option would leave.
 */

import { allProducts, categoryOf, filterProducts, products, type Product, type ProductLine } from "./products";
import { isSeason, type SeasonId } from "./season";
import { bySeason, inSeason } from "./season-products";

export type Line = ProductLine | "all";
export type Feature = "waterproof" | "insulated";
export type Sort = "featured" | "new" | "az";
export type View = "grouped" | "styles";

export type CatalogState = {
  line: Line;
  q: string;
  features: Feature[];
  cats: string[];
  colors: string[];
  sort: Sort;
  view: View;
  /** Only styles in season for this season (`?season=summer`, the home page's season edit links here). */
  season: SeasonId | null;
};

export const LINES: { id: Line; label: string; icon: "grid" | "man" | "woman" | "kid" }[] = [
  { id: "all", label: "All", icon: "grid" },
  { id: "women", label: "Women", icon: "woman" },
  { id: "men", label: "Men", icon: "man" },
  { id: "kids", label: "Kids", icon: "kid" },
];

export const FEATURES: { id: Feature; label: string; hint: string; icon: "drop" | "snow" }[] = [
  { id: "waterproof", label: "Waterproof", hint: "Sealed seams, water-resistant uppers", icon: "drop" },
  { id: "insulated", label: "Insulated", hint: "Warm or shearling-blend lining", icon: "snow" },
];

export const SORTS: { id: Sort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "new", label: "New first" },
  { id: "az", label: "Name A–Z" },
];

const LINE_IDS = LINES.map((l) => l.id);
const FEATURE_IDS = FEATURES.map((f) => f.id);
const isFeature = (v: string): v is Feature => (FEATURE_IDS as string[]).includes(v);

export const EMPTY: CatalogState = { line: "all", q: "", features: [], cats: [], colors: [], sort: "featured", view: "grouped", season: null };

/** Reads the catalog's search params. `line=waterproof|insulated` (the header's old filter links) becomes a feature. */
export function parseCatalogParams(sp: Record<string, string | string[] | undefined>): CatalogState {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const list = (k: string) => get(k).split(",").map((x) => x.trim()).filter(Boolean);
  const rawLine = get("line");
  const features = list("feat").filter(isFeature);
  if (isFeature(rawLine) && !features.includes(rawLine)) features.push(rawLine);
  const sort = get("sort");
  return {
    line: (LINE_IDS as string[]).includes(rawLine) ? (rawLine as Line) : "all",
    q: get("q"),
    features,
    cats: list("cat"),
    colors: list("color"),
    sort: SORTS.some((s) => s.id === sort) ? (sort as Sort) : "featured",
    view: get("view") === "styles" ? "styles" : "grouped",
    season: isSeason(get("season")) ? (get("season") as SeasonId) : null,
  };
}

export function toSearch(s: CatalogState) {
  const p = new URLSearchParams();
  if (s.line !== "all") p.set("line", s.line);
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.features.length) p.set("feat", s.features.join(","));
  if (s.cats.length) p.set("cat", s.cats.join(","));
  if (s.colors.length) p.set("color", s.colors.join(","));
  if (s.sort !== "featured") p.set("sort", s.sort);
  if (s.view !== "grouped") p.set("view", s.view);
  if (s.season) p.set("season", s.season);
  return p.size ? `?${p}` : "";
}

/** Number of filters narrowing the list (search and sort/view excluded). */
export const activeCount = (s: CatalogState) =>
  (s.line !== "all" ? 1 : 0) + (s.season ? 1 : 0) + s.features.length + s.cats.length + s.colors.length;

type Facet = "line" | "features" | "cats" | "colors";

function passes(p: Product, s: CatalogState, skip?: Facet) {
  if (s.season && !inSeason(p, s.season)) return false;
  if (skip !== "line" && s.line !== "all" && p.line !== s.line) return false;
  if (skip !== "features" && !s.features.every((f) => p.tags.includes(f))) return false;
  if (skip !== "cats" && s.cats.length && !s.cats.includes(categoryOf(p))) return false;
  if (skip !== "colors" && s.colors.length && !s.colors.includes(p.color.name)) return false;
  return true;
}

const BADGE_RANK: Record<string, number> = { New: 0, Trending: 1, "Top reorder": 2 };

/** "Featured" puts the season's styles first: the one filtered for, else the visitor's own. */
function sortStyles(list: Product[], sort: Sort, season: SeasonId | null) {
  if (sort === "featured") return season ? bySeason(list, season) : list;
  const out = [...list];
  if (sort === "az") out.sort((a, b) => a.name.localeCompare(b.name));
  else out.sort((a, b) => (BADGE_RANK[a.badge ?? ""] ?? 3) - (BADGE_RANK[b.badge ?? ""] ?? 3));
  return out;
}

/** Styles matching the search alone (`searched`) and every filter (`matches`, sorted; `visitor` is their season). */
export function applyCatalog(s: CatalogState, visitor: SeasonId | null = null) {
  const searched = filterProducts(products, "all", s.q);
  return { searched, matches: sortStyles(searched.filter((p) => passes(p, s)), s.sort, s.season ?? visitor) };
}

export function facets(searched: Product[], s: CatalogState) {
  // category and colour options in catalogue order, so the panel doesn't reshuffle as counts change
  const allCats = [...new Set(allProducts.map(categoryOf))];
  const allColors = [...new Map(allProducts.map((p) => [p.color.name, p.color.hex])).entries()].map(([name, hex]) => ({ name, hex }));
  const tally = (skip: Facet, keys: (p: Product) => string[]) => {
    const m = new Map<string, number>();
    for (const p of searched) if (passes(p, s, skip)) for (const k of keys(p)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const lines = tally("line", (p) => ["all", p.line]);
  const cats = tally("cats", (p) => [categoryOf(p)]);
  const colors = tally("colors", (p) => [p.color.name]);
  // features combine with AND, so an option's count is the list with that feature added
  const features = new Map(
    FEATURES.map((f) => [f.id, searched.filter((p) => passes(p, { ...s, features: [...new Set([...s.features, f.id])] })).length]),
  );
  return {
    lines,
    features,
    // an option with no matches drops out unless it's selected (so it can still be cleared)
    cats: allCats.filter((c) => cats.get(c) || s.cats.includes(c)).map((name) => ({ name, count: cats.get(name) ?? 0 })),
    colors: allColors.filter((c) => colors.get(c.name) || s.colors.includes(c.name)).map((c) => ({ ...c, count: colors.get(c.name) ?? 0 })),
  };
}

export type Facets = ReturnType<typeof facets>;
