/** The category a shoe is listed under: worked out from its type, unless the admin panel picked one. */

/** First match on the shoe's type wins, so the specific kinds (chelsea, hiker…) come before the broad ones (lace-up, zip). */
const CATEGORY_RULES: [test: RegExp, label: string][] = [
  [/chelsea/, "Chelsea boots"],
  [/knee-high|tall/, "Tall boots"],
  [/snow boot/, "Snow boots"],
  [/hiker|work boot/, "Hiker boots"],
  [/sandal|slide/, "Sandals & slides"],
  [/loafer/, "Loafers"],
  [/derby|mary jane/, "Derbies & Mary Janes"],
  [/pump/, "Pumps"],
  [/flat/, "Flats"],
  [/sneaker|high-top/, "Sneakers"],
  [/combat/, "Combat boots"],
  [/lace|cuff/, "Lace-up boots"],
  [/ankle|zip/, "Ankle boots"],
];

/** Every category a style can be listed under. */
export const CATEGORIES = [...CATEGORY_RULES.map(([, label]) => label), "Boots"];

export function categoryFor(p: { type: string; line: string; category?: string }) {
  if (p.category) return p.category;
  const c = CATEGORY_RULES.find(([re]) => re.test(p.type.toLowerCase()))?.[1] ?? "Boots";
  // Kids have a single lace-up, so it joins their ankle boots rather than standing alone.
  return p.line === "kids" && c === "Lace-up boots" ? "Ankle boots" : c;
}
