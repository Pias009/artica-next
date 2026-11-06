/*
 * The Products view's suggestions: what to fix in each listing, where the range is thin, which badges and switches the
 * figures argue for, and what buyers searched for without finding. Pure: it works on the styles as the panel holds
 * them (drafts included) and their 30-day figures, so suggestions update as you edit. Each comes with the edit that
 * applies it, which the view puts in the drafts for you to review and publish.
 */

import { categoryFor } from "../product-categories";
import type { ProductLine } from "../products";
import { SEASON_IDS, SEASONS, type SeasonId } from "../season";
import { IN_SEASON, scoreWords } from "../season-products";

type Style = {
  id: string;
  name: string;
  type: string;
  line: ProductLine;
  category?: string;
  tags: string[];
  desc: string;
  materials: { label: string; value: string }[];
  zip?: { src: string } | null;
  color: { name: string; hex: string };
  badge?: string | null;
  live: boolean;
  featured: boolean;
  pins: SeasonId[];
};
type Stats = { views: number; adds: number; inquiries: number; before: number; won: number; flags: string[] };

/* ---- listing quality ---- */

export const CHECKS: { id: string; label: string; ok: (p: Style) => boolean }[] = [
  { id: "photo2", label: "Second photo", ok: (p) => !!p.zip?.src },
  { id: "desc", label: "Description of 60+ characters", ok: (p) => p.desc.trim().length >= 60 },
  { id: "materials", label: "Two or more materials", ok: (p) => p.materials.filter((m) => m.value.trim()).length >= 2 },
  { id: "tags", label: "Two or more search tags", ok: (p) => p.tags.filter((t) => t.trim()).length >= 2 },
  { id: "colour", label: "Colour named and set", ok: (p) => !!p.color.name.trim() && /^#[0-9a-f]{6}$/i.test(p.color.hex) },
];

/** 0–100: how complete a listing is, and what's missing. */
export function quality(p: Style) {
  const missing = CHECKS.filter((c) => !c.ok(p));
  return { score: Math.round(((CHECKS.length - missing.length) / CHECKS.length) * 100), missing: missing.map((c) => c.label) };
}

/* ---- suggestions ---- */

export type Patch = Partial<Pick<Style, "badge" | "live" | "featured">>;
export type Suggestion = {
  key: string;
  kind: "badge" | "visibility" | "feature" | "range" | "search";
  text: string;
  why: string;
  /** The style to change and how, when it can be applied in one click. */
  apply?: { id: string; patch: Patch; label: string };
  href?: { to: string; label: string };
};

const wordsOf = (p: Style) => `${categoryFor(p)} ${p.type} ${p.tags.join(" ")}`;
const LINE_NAME: Record<ProductLine, string> = { men: "Men's", women: "Women's", kids: "Kids'" };

export function suggestions(styles: Style[], stats: (id: string) => Stats, searches: { q: string; n: number; found: number }[] = []): Suggestion[] {
  const out: Suggestion[] = [];
  const live = styles.filter((p) => p.live);
  const traffic = styles.reduce((t, p) => t + stats(p.id).views, 0) >= 150;

  for (const p of styles) {
    const s = stats(p.id);
    if (p.live && s.flags.includes("rising") && p.badge !== "Trending" && p.badge !== "Top reorder")
      out.push({ key: `trend-${p.id}`, kind: "badge", text: `Give ${p.name} the Trending badge`, why: `${s.inquiries} inquiries this month, ${s.before} the month before.`, apply: { id: p.id, patch: { badge: "Trending" }, label: "Add badge" } });
    if (p.live && s.won >= 2 && p.badge !== "Top reorder")
      out.push({ key: `top-${p.id}`, kind: "badge", text: `Mark ${p.name} as a Top reorder`, why: `${s.won} orders won in 90 days.`, apply: { id: p.id, patch: { badge: "Top reorder" }, label: "Add badge" } });
    if (traffic && p.badge === "Trending" && s.inquiries + s.before === 0 && s.adds === 0)
      out.push({ key: `untrend-${p.id}`, kind: "badge", text: `Take the Trending badge off ${p.name}`, why: "No inquiries or list adds in 60 days: the badge isn't true any more.", apply: { id: p.id, patch: { badge: null }, label: "Remove badge" } });
    if (!p.live && s.inquiries > 0)
      out.push({ key: `show-${p.id}`, kind: "visibility", text: `Show ${p.name} again`, why: `It's hidden, but ${s.inquiries} ${s.inquiries === 1 ? "buyer has" : "buyers have"} asked for it this month.`, apply: { id: p.id, patch: { live: true }, label: "Show it" } });
    if (p.live && p.featured && (s.flags.includes("no-views") || s.flags.includes("looked-not-asked")))
      out.push({ key: `unfeature-${p.id}`, kind: "feature", text: `Stop featuring ${p.name}`, why: s.flags.includes("no-views") ? "Featured, yet nobody opened it in 30 days." : "Featured and looked at, but nobody adds it or asks about it.", apply: { id: p.id, patch: { featured: false }, label: "Unfeature" } });
    if (p.live && !p.featured && s.flags.includes("rising") && s.adds >= 3)
      out.push({ key: `feature-${p.id}`, kind: "feature", text: `Feature ${p.name}`, why: `Rising interest, and ${s.adds} visits put it on their list.`, apply: { id: p.id, patch: { featured: true }, label: "Feature" } });
  }

  // a thin line looks like a shop that doesn't really sell it
  for (const line of ["women", "men", "kids"] as const) {
    const n = live.filter((p) => p.line === line).length;
    if (n < 6) out.push({ key: `line-${line}`, kind: "range", text: `${LINE_NAME[line]} range: only ${n} ${n === 1 ? "style" : "styles"} live`, why: "Buyers looking for this line see a thin range. Add styles, or keep it out of the main menu until it's fuller.", href: { to: "/admin/products/new", label: "Add a style" } });
  }
  // every season should have enough styles that suit it
  for (const season of SEASON_IDS) {
    const fit = live.filter((p) => scoreWords(wordsOf(p), season) >= IN_SEASON || p.pins.includes(season));
    if (fit.length < 4)
      out.push({ key: `season-${season}`, kind: "range", text: `${SEASONS[season].name}: only ${fit.length} ${fit.length === 1 ? "style suits" : "styles suit"} it`, why: fit.length ? `${fit.map((p) => p.name).join(", ")}. The season's home page and edit will repeat them.` : "The season's home page has nothing that fits. Add styles, or pin suitable ones to it.", href: { to: "/admin/products/new", label: "Add a style" } });
  }
  // what buyers looked for and didn't find
  for (const s of searches.filter((x) => x.found === 0 && x.n >= 2).slice(0, 5))
    out.push({ key: `search-${s.q}`, kind: "search", text: `“${s.q}”: searched ${s.n} times, nothing found`, why: "Add a style that matches, or add the word as a search tag on a close one.", href: { to: "/admin/products/new", label: "Add a style" } });
  return out;
}
