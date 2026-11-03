/**
 * Which styles suit which season. Each season scores a style by its category, type and tags; the higher the score,
 * the earlier it shows in the hero, the home page's product sections and the catalog's featured order.
 */

import { categoryOf, collapse, products, type Product, type ProductLine } from "./products";
import type { SeasonId } from "./season";

/**
 * What each season looks for in a style's category, type and tags, and how much it counts. Negative weights push
 * away what's wrong for the weather (fur in summer, suede in the rain, patent shine in autumn).
 */
const RULES: Record<SeasonId, [RegExp, number][]> = {
  spring: [[/sneaker/, 4], [/flat|ballet/, 4], [/loafer/, 4], [/derby|mary jane/, 3], [/pump/, 3], [/chelsea/, 1], [/insulated|snow|fur|shearling/, -4]],
  summer: [[/sandal|slide/, 6], [/flat|ballet/, 3], [/sneaker/, 2], [/loafer/, 2], [/mary jane/, 1], [/insulated|snow|fur|shearling|boot/, -5]],
  rainy: [[/waterproof/, 5], [/closed-toe/, 5], [/chelsea/, 3], [/sneaker/, 2], [/ankle/, 1], [/suede/, -3], [/slide|cork/, -3]],
  autumn: [[/chelsea/, 6], [/ankle/, 4], [/knit-cuff|lace-up boot/, 3], [/loafer|derby/, 3], [/tall|knee-high/, 3], [/hiker/, 2], [/leather|suede/, 1], [/patent/, -3], [/sandal|slide/, -5]],
  winter: [[/snow/, 6], [/insulated|shearling|fur/, 4], [/hiker|work boot/, 3], [/tall|knee-high/, 3], [/lace-up boot/, 2], [/combat/, 2], [/ankle/, 1], [/sandal|slide|flat|pump/, -6]],
  holiday: [[/patent/, 5], [/pump/, 4], [/mary jane|derby/, 3], [/fur/, 3], [/tall|knee-high/, 2], [/chelsea/, 1], [/sandal|slide|sport/, -4]],
};

/** A score of this or more counts as "in season" (the catalog's season filter). */
export const IN_SEASON = 3;

const text = (p: Product) => `${categoryOf(p)} ${p.type} ${p.tags.join(" ")}`.toLowerCase();

/** How well a style suits a season, from its kind and tags; styles the admin pinned to the season count as in season. */
export const seasonScore = (p: Product, season: SeasonId) =>
  RULES[season].reduce((n, [re, w]) => (re.test(text(p)) ? n + w : n), 0) + (p.pinnedSeasons?.includes(season) ? IN_SEASON : 0);
export const inSeason = (p: Product, season: SeasonId) => seasonScore(p, season) >= IN_SEASON;

/** The list with the season's best first; ties keep their catalogue order. */
export function bySeason<T extends Product>(list: T[], season: SeasonId): T[] {
  return list
    .map((p, i) => ({ p, i, n: seasonScore(p, season) }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.p);
}

/** The season's top `n` styles, one per category and line first so the pick shows range, then the rest in order. */
export function seasonPicks(season: SeasonId, n: number, from: Product[] = products): Product[] {
  const ranked = bySeason(from, season).filter((p) => seasonScore(p, season) > 0);
  const varied = collapse(ranked);
  const rest = ranked.filter((p) => !varied.includes(p));
  return [...varied, ...rest].slice(0, n);
}

/** The best in-season style of a line, and the season's top categories in it ("Sandals & slides, Flats"). */
export function lineFor(line: ProductLine, season: SeasonId) {
  const ranked = bySeason(products.filter((p) => p.line === line), season);
  const cats = [...new Set(ranked.filter((p) => inSeason(p, season)).map(categoryOf))].slice(0, 3);
  return { p: ranked[0], kinds: cats.length ? cats.join(", ") : undefined };
}
