/**
 * Search and answer-engine copy for each style, written from its own spec data (products.ts, catalog-photos.ts) so every
 * product page carries text no other page has. It states only what the data says: change a spec and the copy follows.
 */

import { CASE_PACK, categoryOf, LEAD, MOQ_CASES, MOQ_PAIRS, PACK, type Product, type ProductLine } from "./products";
import { SEASON_IDS, SEASONS } from "./season";
import { inSeason } from "./season-products";

/** "men's", "women's", "kids'": for "wholesale women's chelsea boot" */
export const LINE_POSSESSIVE: Record<ProductLine, string> = { men: "men's", women: "women's", kids: "kids'" };

/** First letter only, so names inside keep their capitals: "Patent Mary Jane" → "patent Mary Jane". */
export const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const an = (s: string) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
const days = (lead: string) => parseInt(lead, 10);
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const material = (p: Product, ...labels: string[]) => p.materials.find((m) => labels.includes(m.label))?.value;

/** How the closure reads in a sentence; anything not listed falls back to "fastens with a …". */
const CLOSURE: Record<string, string> = {
  "Slip-on": "slips on",
  Laces: "laces up",
  "Elastic gore": "pulls on with elastic side gores",
  "Elastic straps": "slips on with elastic straps",
  "Hook-and-loop straps": "fastens with hook-and-loop straps",
  "Two hook-and-loop straps": "fastens with two hook-and-loop straps",
  "Toggle laces": "fastens with elastic toggle laces",
  "Bungee + strap": "fastens with a bungee lace and a strap",
};
const closure = (c: string) => CLOSURE[c] ?? `fastens with ${c.split(" + ").map((x) => (/s$/.test(x) ? lc(x) : an(lc(x)))).join(" and ")}`;

/** "Rubber lug, 6 mm" → "a 6 mm rubber lug sole"; wedges, platforms and cupsoles keep their own name. */
function sole(s: string) {
  const v = lc(s)
    .replace(/^(.*), (\d+ mm)$/, "$2 $1")
    .replace(/^rubber, chunky$/, "chunky rubber")
    .replace(/^rubber, gum finish$/, "gum-finish rubber");
  return an(/sole|wedge|platform/.test(v) ? v : `${v} sole`);
}

/** The seasons a style is in, by name: "autumn and winter". */
export const seasonsFor = (p: Product) => SEASON_IDS.filter((s) => inSeason(p, s)).map((s) => lc(SEASONS[s].name));

/** Waterproof and insulated, as the adjectives that lead a style's description. */
const features = (p: Product) => (["waterproof", "insulated"] as const).filter((t) => p.tags.includes(t));

/** Three short paragraphs: what the style is, how it's made, how it's sold. */
export function aboutStyle(p: Product): string[] {
  const upper = material(p, "Upper");
  const lining = material(p, "Lining");
  const heel = material(p, "Heel");
  const outsole = material(p, "Outsole", "Sole");
  const close = material(p, "Closure");
  const seasons = seasonsFor(p);
  const kind = [...features(p), lc(p.type)].join(" ");

  const what = [
    `The Chime Long ${p.name} is ${an(kind)} in ${lc(p.color.name)}, part of our wholesale ${LINE_POSSESSIVE[p.line]} ${lc(categoryOf(p))}.`,
    `${p.desc}.`,
    seasons.length ? `It is in our ${list(seasons)} ${seasons.length === 1 ? "edit" : "edits"}.` : "",
  ];

  const build = [
    upper && (/s$/.test(upper) ? `The upper is made of ${lc(upper)}` : `It has ${an(lc(upper))} upper`),
    lining && `${/lining/i.test(lining) ? an(lc(lining)) : `${an(lc(lining))} lining`}`,
  ].filter(Boolean);
  const made = [
    build.length ? `${build.join(" and ")}.` : "",
    close ? `It ${closure(close)}${outsole ? ` and sits on ${sole(outsole)}` : ""}${heel ? ` with ${an(/heel/i.test(heel) ? lc(heel) : `${heel} heel`)}` : ""}.` : "",
  ];

  const pack = CASE_PACK[p.line].map(([size, pairs]) => `${pairs} × ${size}`).join(", ");
  const sold = [
    `Sold by the case: each case holds ${PACK} pairs in ${p.sizes}, packed ${pack}.`,
    `The minimum order is ${MOQ_PAIRS} pairs (${MOQ_CASES} cases) per style.`,
    `Samples are ready in ${days(LEAD.samples)} days and bulk production takes about ${days(LEAD.bulk)} days, with quotes within ${parseInt(LEAD.quote, 10)} hours.`,
  ];

  return [what, made, sold].map((s) => s.filter(Boolean).join(" ")).filter(Boolean);
}

/** Title tag part (the layout adds " · Chime Long"): the search phrase first, the style name last. */
export function styleTitle(p: Product) {
  const long = `Wholesale ${LINE_POSSESSIVE[p.line]} ${lc(p.type)} – ${p.name}`;
  // 47 + " · Chime Long" keeps the whole title within 60 characters
  return long.length <= 47 ? long : `Wholesale ${lc(p.type)} – ${p.name}`;
}

/** Meta description: the style sentence, then the wholesale terms, within ~160 characters. */
export function styleDescription(p: Product) {
  const full = `${p.desc}. Wholesale ${LINE_POSSESSIVE[p.line]} ${lc(p.type)} from ${MOQ_PAIRS} pairs, ${PACK} per case, ${p.sizes}.`;
  return full.length <= 160 ? full : `${p.desc}. Wholesale from ${MOQ_PAIRS} pairs, ${PACK} per case, ${p.sizes}.`;
}
